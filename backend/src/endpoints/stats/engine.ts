import { db } from "../../config/db";
import { RowDataPacket } from "mysql2";

export interface PlayerStats {
    player: { id: string; name: string; initials: string };
    games_played: number;
    wins: number;
    win_rate: number;
    darts_thrown: number;
    atw: {
        played: number;
        wins: number;
        win_rate: number;
        accuracy_percentage: number;
        current_win_streak: number;
        best_win_streak: number;
        longest_hit_streak: number;
        biggest_single_turn_gain: number;
        average_turns_to_win: number;
    };
    cricket: {
        played: number;
        wins: number;
        win_rate: number;
        accuracy_percentage: number;
        times_second: number;
        highest_received: number;
        average_received: number;
        highest_given: number;
        average_given: number;
        average_turns_to_win: number;
    };
    x01: Record<"101" | "301" | "501", {
        played: number;
        wins: number;
        win_rate: number;
        highest_turn: number;
        // average_arrows_to_win disabled for now -- the input only tracks a
        // turn's total score, not individual darts, so this was really
        // turns-to-win * 3, an approximation that overstates games that
        // checked out early on the final turn. Left commented out rather
        // than deleted since the underlying x01_turns table doesn't change
        // and this can come back once input tracks individual darts.
        // average_arrows_to_win: number;
    }>;
}

export type StatsPeriod = "month" | "3months" | "year" | "all";

export function periodToSince(period: string | undefined | null): Date | null {
    const now = new Date();
    switch (period) {
        case "month": return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case "3months": return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        case "year": return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        default: return null;
    }
}

function rate(wins: number, played: number): number {
    return played === 0 ? 0 : Math.round((wins / played) * 1000) / 10;
}

function average(values: number[]): number {
    return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;
}

// The engine clamps a player's actual number to 20 when catch-up
// advancement would otherwise carry them past it without an actual hit on
// 20 (see the ATW engine) -- but the *stored* advancement per dart is the
// raw, pre-clamp value. Consecutive throws' target_number already reflect
// the real clamped state (each one is exactly what the engine persisted
// after the previous dart), so only the last dart of a turn needs its own
// contribution re-derived here to match.
function clampedFinalDelta(startingNumber: number, rawAdvancement: number, result: string): number {
    if (result === "miss" || startingNumber >= 20) return 0;
    const raw = startingNumber + rawAdvancement;
    return raw > 20 ? 20 - startingNumber : rawAdvancement;
}

async function computeAtwStats(playerId: string, since: Date | null): Promise<PlayerStats["atw"]> {
    const [[player]] = await db.query<RowDataPacket[]>(
        `SELECT atw_win_streak, atw_best_win_streak FROM players WHERE id = ?`,
        [playerId]
    );

    const [[counts]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT g.id) as played, COUNT(DISTINCT CASE WHEN g.winner_id = ? THEN g.id END) as wins
        FROM atw_games g
        JOIN atw_participants p ON p.game_id = g.id AND p.player_id = ?
        WHERE g.status = 'finished' ${since ? "AND g.finished_at >= ?" : ""}
    `, since ? [playerId, playerId, since] : [playerId, playerId]);

    const [[accuracy]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total, COUNT(CASE WHEN result != 'miss' THEN 1 END) as hits
        FROM atw_throws WHERE player_id = ? ${since ? "AND created_at >= ?" : ""}
    `, since ? [playerId, since] : [playerId]);

    const [throws] = await db.query<RowDataPacket[]>(`
        SELECT game_id, turn_index, dart_index, result, target_number, advancement
        FROM atw_throws WHERE player_id = ? ${since ? "AND created_at >= ?" : ""}
        ORDER BY game_id, turn_index, dart_index
    `, since ? [playerId, since] : [playerId]);

    let longestHitStreak = 0;
    let currentStreak = 0;
    for (const t of throws) {
        if (t.result !== "miss") {
            currentStreak += 1;
            longestHitStreak = Math.max(longestHitStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }

    const turnsByKey = new Map<string, RowDataPacket[]>();
    for (const t of throws) {
        const key = `${t.game_id}:${t.turn_index}`;
        const group = turnsByKey.get(key);
        if (group) group.push(t);
        else turnsByKey.set(key, [t]);
    }
    let biggestTurnGain = 0;
    for (const group of turnsByKey.values()) {
        const first = group[0];
        const last = group[group.length - 1];
        const gain = (last.target_number - first.target_number) +
            clampedFinalDelta(last.target_number, last.advancement, last.result);
        biggestTurnGain = Math.max(biggestTurnGain, gain);
    }

    const [wonGameTurns] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT t.turn_index) as turns
        FROM atw_games g
        JOIN atw_participants p ON p.game_id = g.id AND p.player_id = ?
        JOIN atw_throws t ON t.game_id = g.id AND t.participant_id = p.id
        WHERE g.status = 'finished' AND g.winner_id = ? ${since ? "AND g.finished_at >= ?" : ""}
        GROUP BY g.id
    `, since ? [playerId, playerId, since] : [playerId, playerId]);

    return {
        played: counts.played,
        wins: counts.wins,
        win_rate: rate(counts.wins, counts.played),
        accuracy_percentage: accuracy.total ? Math.round((accuracy.hits / accuracy.total) * 1000) / 10 : 0,
        current_win_streak: player?.atw_win_streak ?? 0,
        best_win_streak: player?.atw_best_win_streak ?? 0,
        longest_hit_streak: longestHitStreak,
        biggest_single_turn_gain: biggestTurnGain,
        average_turns_to_win: average(wonGameTurns.map(r => r.turns)),
    };
}

async function computeCricketStats(playerId: string, since: Date | null): Promise<PlayerStats["cricket"]> {
    const [[counts]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT g.id) as played, COUNT(DISTINCT CASE WHEN g.winner_id = ? THEN g.id END) as wins,
               COUNT(DISTINCT CASE WHEN g.second_place_id = ? THEN g.id END) as times_second
        FROM cricket_games g
        JOIN cricket_participants p ON p.game_id = g.id AND p.player_id = ?
        WHERE g.status = 'finished' ${since ? "AND g.finished_at >= ?" : ""}
    `, since ? [playerId, playerId, playerId, since] : [playerId, playerId, playerId]);

    const [[accuracy]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total, COUNT(CASE WHEN hit_type != 'miss' THEN 1 END) as hits
        FROM cricket_throws WHERE player_id = ? ${since ? "AND created_at >= ?" : ""}
    `, since ? [playerId, since] : [playerId]);

    // cricket_penalties only exists going forward from when this stat was
    // added -- games recorded before that won't contribute rows here, so
    // received/given will read as 0 for any history that predates it.
    const [[given]] = await db.query<RowDataPacket[]>(`
        SELECT MAX(points) as highest, AVG(points) as average FROM cricket_penalties
        WHERE from_player_id = ? ${since ? "AND created_at >= ?" : ""}
    `, since ? [playerId, since] : [playerId]);
    const [[received]] = await db.query<RowDataPacket[]>(`
        SELECT MAX(points) as highest, AVG(points) as average FROM cricket_penalties
        WHERE to_player_id = ? ${since ? "AND created_at >= ?" : ""}
    `, since ? [playerId, since] : [playerId]);

    const [wonGameTurns] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT t.turn_index) as turns
        FROM cricket_games g
        JOIN cricket_participants p ON p.game_id = g.id AND p.player_id = ?
        JOIN cricket_throws t ON t.game_id = g.id AND t.participant_id = p.id
        WHERE g.status = 'finished' AND g.winner_id = ? ${since ? "AND g.finished_at >= ?" : ""}
        GROUP BY g.id
    `, since ? [playerId, playerId, since] : [playerId, playerId]);

    return {
        played: counts.played,
        wins: counts.wins,
        win_rate: rate(counts.wins, counts.played),
        accuracy_percentage: accuracy.total ? Math.round((accuracy.hits / accuracy.total) * 1000) / 10 : 0,
        times_second: counts.times_second,
        highest_received: received?.highest ?? 0,
        average_received: received?.average ? Math.round(received.average * 10) / 10 : 0,
        highest_given: given?.highest ?? 0,
        average_given: given?.average ? Math.round(given.average * 10) / 10 : 0,
        average_turns_to_win: average(wonGameTurns.map(r => r.turns)),
    };
}

const X01_SCORES = ["101", "301", "501"] as const;

async function computeX01Stats(playerId: string, since: Date | null): Promise<PlayerStats["x01"]> {
    const result: PlayerStats["x01"] = {
        "101": { played: 0, wins: 0, win_rate: 0, highest_turn: 0 },
        "301": { played: 0, wins: 0, win_rate: 0, highest_turn: 0 },
        "501": { played: 0, wins: 0, win_rate: 0, highest_turn: 0 },
    };

    const [countRows] = await db.query<RowDataPacket[]>(`
        SELECT g.starting_score as score, COUNT(DISTINCT g.id) as played, COUNT(DISTINCT CASE WHEN g.winner_id = ? THEN g.id END) as wins
        FROM x01_games g
        JOIN x01_participants p ON p.game_id = g.id AND p.player_id = ?
        WHERE g.status = 'finished' ${since ? "AND g.finished_at >= ?" : ""}
        GROUP BY g.starting_score
    `, since ? [playerId, playerId, since] : [playerId, playerId]);

    const [highestRows] = await db.query<RowDataPacket[]>(`
        SELECT g.starting_score as score, MAX(t.score_entered) as highest
        FROM x01_turns t
        JOIN x01_games g ON g.id = t.game_id
        WHERE t.player_id = ? AND t.busted = 0 ${since ? "AND t.created_at >= ?" : ""}
        GROUP BY g.starting_score
    `, since ? [playerId, since] : [playerId]);

    // average_arrows_to_win disabled -- see the note on the type above.
    // const [turnRows] = await db.query<RowDataPacket[]>(`
    //     SELECT score, AVG(turns) as avg_turns FROM (
    //         SELECT g.starting_score as score, g.id as game_id, COUNT(DISTINCT t.turn_index) as turns
    //         FROM x01_games g
    //         JOIN x01_participants p ON p.game_id = g.id AND p.player_id = ?
    //         JOIN x01_turns t ON t.game_id = g.id AND t.participant_id = p.id
    //         WHERE g.status = 'finished' AND g.winner_id = ? ${since ? "AND g.finished_at >= ?" : ""}
    //         GROUP BY g.starting_score, g.id
    //     ) per_game
    //     GROUP BY score
    // `, since ? [playerId, playerId, since] : [playerId, playerId]);

    for (const row of countRows) {
        const key = String(row.score) as keyof typeof result;
        if (!(key in result)) continue;
        result[key].played = row.played;
        result[key].wins = row.wins;
        result[key].win_rate = rate(row.wins, row.played);
    }
    for (const row of highestRows) {
        const key = String(row.score) as keyof typeof result;
        if (key in result) result[key].highest_turn = row.highest ?? 0;
    }
    // for (const row of turnRows) {
    //     const key = String(row.score) as keyof typeof result;
    //     if (key in result) result[key].average_arrows_to_win = row.avg_turns ? Math.round(row.avg_turns * 3 * 10) / 10 : 0;
    // }

    return result;
}

export async function computePlayerStats(playerId: string, period?: string | null): Promise<PlayerStats | null> {
    const [[player]] = await db.query<RowDataPacket[]>(
        `SELECT id, name, initials FROM players WHERE id = ?`,
        [playerId]
    );
    if (!player) return null;

    const since = periodToSince(period);

    const [atw, cricket, x01] = await Promise.all([
        computeAtwStats(playerId, since),
        computeCricketStats(playerId, since),
        computeX01Stats(playerId, since),
    ]);

    const [[dartCounts]] = await db.query<RowDataPacket[]>(`
        SELECT
            (SELECT COUNT(*) FROM atw_throws WHERE player_id = ? ${since ? "AND created_at >= ?" : ""}) +
            (SELECT COUNT(*) FROM cricket_throws WHERE player_id = ? ${since ? "AND created_at >= ?" : ""}) as total
    `, since ? [playerId, since, playerId, since] : [playerId, playerId]);

    const gamesPlayed = atw.played + cricket.played + x01["101"].played + x01["301"].played + x01["501"].played;
    const wins = atw.wins + cricket.wins + x01["101"].wins + x01["301"].wins + x01["501"].wins;

    return {
        player: { id: player.id, name: player.name, initials: player.initials },
        games_played: gamesPlayed,
        wins,
        win_rate: rate(wins, gamesPlayed),
        darts_thrown: dartCounts.total,
        atw,
        cricket,
        x01,
    };
}

export async function computeAllPlayerStats(period?: string | null): Promise<PlayerStats[]> {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT id FROM players ORDER BY name ASC`);
    const results: PlayerStats[] = [];
    for (const row of rows) {
        const stats = await computePlayerStats(row.id, period);
        if (stats) results.push(stats);
    }
    return results;
}

export interface StatsTotals {
    atw_games: number;
    cricket_games: number;
    x01_games: { total: number; by_starting_score: Record<string, number> };
    darts_thrown: number;
}

// Aggregate, not-per-player numbers for the stats overview: how much has
// actually been played, without any individual win rate being skewed by
// a game type only a couple of people play.
export async function computeStatsTotals(period?: string | null): Promise<StatsTotals> {
    const since = periodToSince(period);

    const [[atw]] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM atw_games WHERE status = 'finished' ${since ? "AND finished_at >= ?" : ""}`,
        since ? [since] : []
    );
    const [[cricket]] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM cricket_games WHERE status = 'finished' ${since ? "AND finished_at >= ?" : ""}`,
        since ? [since] : []
    );
    const [x01Rows] = await db.query<RowDataPacket[]>(
        `SELECT starting_score, COUNT(*) as total FROM x01_games WHERE status = 'finished' ${since ? "AND finished_at >= ?" : ""} GROUP BY starting_score`,
        since ? [since] : []
    );
    const [[darts]] = await db.query<RowDataPacket[]>(`
        SELECT
            (SELECT COUNT(*) FROM atw_throws ${since ? "WHERE created_at >= ?" : ""}) +
            (SELECT COUNT(*) FROM cricket_throws ${since ? "WHERE created_at >= ?" : ""}) as total
    `, since ? [since, since] : []);

    const byStartingScore: Record<string, number> = {};
    let x01Total = 0;
    for (const row of x01Rows) {
        byStartingScore[String(row.starting_score)] = row.total;
        x01Total += row.total;
    }

    return {
        atw_games: atw.total,
        cricket_games: cricket.total,
        x01_games: { total: x01Total, by_starting_score: byStartingScore },
        darts_thrown: darts.total,
    };
}
