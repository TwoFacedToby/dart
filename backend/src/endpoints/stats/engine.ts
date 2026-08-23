import { db } from "../../config/db";
import { RowDataPacket } from "mysql2";

export interface PlayerStats {
    player: { id: string; name: string; initials: string };
    games_played: number;
    wins: number;
    win_rate: number;
    by_game: {
        around_the_world: { played: number; wins: number; win_rate: number };
        cricket: { played: number; wins: number; win_rate: number };
        x01: { played: number; wins: number; win_rate: number };
    };
    accuracy_percentage: number;
    darts_thrown: number;
    highest_x01_turn: number;
    atw_current_win_streak: number;
    atw_best_win_streak: number;
    atw_longest_hit_streak: number;
    atw_biggest_single_turn_gain: number;
}

function winRate(wins: number, played: number): number {
    return played === 0 ? 0 : Math.round((wins / played) * 1000) / 10;
}

export async function computePlayerStats(playerId: string): Promise<PlayerStats | null> {
    const [[player]] = await db.query<RowDataPacket[]>(
        `SELECT id, name, initials, atw_win_streak, atw_best_win_streak FROM players WHERE id = ?`,
        [playerId]
    );
    if (!player) return null;

    const [[atwCounts]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT g.id) as played, COUNT(DISTINCT CASE WHEN g.winner_id = ? THEN g.id END) as wins
        FROM atw_games g
        JOIN atw_participants p ON p.game_id = g.id AND p.player_id = ?
        WHERE g.status = 'finished'
    `, [playerId, playerId]);

    const [[cricketCounts]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT g.id) as played, COUNT(DISTINCT CASE WHEN g.winner_id = ? THEN g.id END) as wins
        FROM cricket_games g
        JOIN cricket_participants p ON p.game_id = g.id AND p.player_id = ?
        WHERE g.status = 'finished'
    `, [playerId, playerId]);

    const [[x01Counts]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT g.id) as played, COUNT(DISTINCT CASE WHEN g.winner_id = ? THEN g.id END) as wins
        FROM x01_games g
        JOIN x01_participants p ON p.game_id = g.id AND p.player_id = ?
        WHERE g.status = 'finished'
    `, [playerId, playerId]);

    const [[dartCounts]] = await db.query<RowDataPacket[]>(`
        SELECT
            (SELECT COUNT(*) FROM atw_throws WHERE player_id = ?) +
            (SELECT COUNT(*) FROM cricket_throws WHERE player_id = ?) as total,
            (SELECT COUNT(*) FROM atw_throws WHERE player_id = ? AND result != 'miss') +
            (SELECT COUNT(*) FROM cricket_throws WHERE player_id = ? AND hit_type != 'miss') as hits
    `, [playerId, playerId, playerId, playerId]);

    const [[x01High]] = await db.query<RowDataPacket[]>(`
        SELECT MAX(score_entered) as highest FROM x01_turns WHERE player_id = ? AND busted = 0
    `, [playerId]);

    const [atwThrows] = await db.query<RowDataPacket[]>(`
        SELECT game_id, turn_index, dart_index, result, advancement
        FROM atw_throws WHERE player_id = ?
        ORDER BY game_id, turn_index, dart_index
    `, [playerId]);

    let longestHitStreak = 0;
    let currentStreak = 0;
    for (const t of atwThrows) {
        if (t.result !== "miss") {
            currentStreak += 1;
            longestHitStreak = Math.max(longestHitStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }

    const turnGains = new Map<string, number>();
    for (const t of atwThrows) {
        const key = `${t.game_id}:${t.turn_index}`;
        turnGains.set(key, (turnGains.get(key) ?? 0) + t.advancement);
    }
    const biggestTurnGain = turnGains.size ? Math.max(...turnGains.values()) : 0;

    const gamesPlayed = atwCounts.played + cricketCounts.played + x01Counts.played;
    const wins = atwCounts.wins + cricketCounts.wins + x01Counts.wins;

    return {
        player: { id: player.id, name: player.name, initials: player.initials },
        games_played: gamesPlayed,
        wins,
        win_rate: winRate(wins, gamesPlayed),
        by_game: {
            around_the_world: {
                played: atwCounts.played, wins: atwCounts.wins,
                win_rate: winRate(atwCounts.wins, atwCounts.played),
            },
            cricket: {
                played: cricketCounts.played, wins: cricketCounts.wins,
                win_rate: winRate(cricketCounts.wins, cricketCounts.played),
            },
            x01: {
                played: x01Counts.played, wins: x01Counts.wins,
                win_rate: winRate(x01Counts.wins, x01Counts.played),
            },
        },
        accuracy_percentage: dartCounts.total ? Math.round((dartCounts.hits / dartCounts.total) * 1000) / 10 : 0,
        darts_thrown: dartCounts.total,
        highest_x01_turn: x01High.highest ?? 0,
        atw_current_win_streak: player.atw_win_streak,
        atw_best_win_streak: player.atw_best_win_streak,
        atw_longest_hit_streak: longestHitStreak,
        atw_biggest_single_turn_gain: biggestTurnGain,
    };
}

export async function computeAllPlayerStats(): Promise<PlayerStats[]> {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT id FROM players ORDER BY name ASC`);
    const results: PlayerStats[] = [];
    for (const row of rows) {
        const stats = await computePlayerStats(row.id);
        if (stats) results.push(stats);
    }
    return results;
}
