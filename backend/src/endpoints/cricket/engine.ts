import { db } from "../../config/db";
import { createNewId } from "../../utils/idHandler";
import { AppError } from "../../errors/AppError";
import { RowDataPacket } from "mysql2";

// ---------------------------------------------------------------------------
// Cricket engine. Targets are 15-20 and Bull. Doubles/triples count toward
// closing a number (3 marks closes it); Bull has no triple, "ring" counts as
// 1 mark and "eye" counts as 2. Once a player has closed a number, further
// hits on it don't score the shooter anything -- instead, each opponent who
// hasn't closed that number yet takes on the value as a penalty point.
// Lower score is better. Win = closed all seven numbers while holding the
// (sole or tied) lowest score.
// ---------------------------------------------------------------------------

export const TARGETS = ["15", "16", "17", "18", "19", "20", "bull"] as const;
export type Target = typeof TARGETS[number];
export type HitType = "miss" | "single" | "double" | "triple" | "ring" | "eye";

function pointValue(target: Target): number {
    if (target === "bull") return 25;
    return Number(target);
}

function marksFor(hitType: HitType): number {
    switch (hitType) {
        case "single": case "ring": return 1;
        case "double": case "eye": return 2;
        case "triple": return 3;
        default: return 0;
    }
}

function marksColumn(target: Target): string {
    return target === "bull" ? "marks_bull" : `marks_${target}`;
}

export interface CricketGameRow extends RowDataPacket {
    id: string;
    status: string;
    current_turn_order: number;
    turn_dart_count: number;
    turn_index: number;
    winner_id: string | null;
    second_place_id: string | null;
    created_at: string;
    finished_at: string | null;
}

export interface CricketParticipantRow extends RowDataPacket {
    id: string;
    game_id: string;
    player_id: string;
    turn_order: number;
    score: number;
    marks_15: number;
    marks_16: number;
    marks_17: number;
    marks_18: number;
    marks_19: number;
    marks_20: number;
    marks_bull: number;
    finished: number;
    finish_order: number | null;
    player_name?: string;
    player_initials?: string;
}

export async function loadGame(gameId: string): Promise<CricketGameRow> {
    const [[game]] = await db.query<CricketGameRow[]>(`SELECT * FROM cricket_games WHERE id = ?`, [gameId]);
    if (!game) throw new AppError("Game not found", 404);
    return game;
}

export async function loadParticipants(gameId: string): Promise<CricketParticipantRow[]> {
    const [rows] = await db.query<CricketParticipantRow[]>(`
        SELECT p.*, pl.name as player_name, pl.initials as player_initials
        FROM cricket_participants p
        JOIN players pl ON pl.id = p.player_id
        WHERE p.game_id = ?
        ORDER BY p.turn_order ASC
    `, [gameId]);
    return rows;
}

function hasClosedAll(p: CricketParticipantRow): boolean {
    return TARGETS.every(t => (p as any)[marksColumn(t)] >= 3);
}

// `skipInsert` is used only by resetAndReplay (undo support): the row
// already exists, we're just re-deriving state from it.
export async function recordThrow(gameId: string, target: Target, hitType: HitType, opts: { skipInsert?: boolean } = {}): Promise<void> {
    if (target === "bull" && (hitType === "double" || hitType === "triple")) {
        throw new AppError("Bull only has ring (single) and eye (double) hits", 400);
    }
    if (target !== "bull" && (hitType === "ring" || hitType === "eye")) {
        throw new AppError("Ring/eye hit types only apply to bull", 400);
    }

    const game = await loadGame(gameId);
    if (game.status !== "active") throw new AppError("This game has already finished", 400);

    const participants = await loadParticipants(gameId);
    const active = participants.filter(p => p.turn_order === game.current_turn_order);
    const current = active[0];
    if (!current) throw new AppError("No current participant found for this turn", 500);

    const dartIndex = game.turn_dart_count + 1;

    const marksHit = marksFor(hitType);
    const col = marksColumn(target);
    const currentMarks = (current as any)[col] as number;
    const marksNeeded = Math.max(0, 3 - currentMarks);
    const marksApplied = Math.min(marksHit, marksNeeded);
    const excess = marksHit - marksApplied;
    const newMarks = currentMarks + marksApplied;

    // Excess hits on an already-closed number don't score the shooter
    // anything. Instead, each opponent who hasn't closed that number yet
    // takes on the value as a penalty. Lower score is better; the aim is
    // to close all seven numbers while taking on as few points as
    // possible.
    const penalizedOpponents = excess > 0
        ? participants.filter(p => p.id !== current.id && (p as any)[marksColumn(target)] < 3)
        : [];
    const pointsGivenPerOpponent = excess * pointValue(target);

    if (!opts.skipInsert) {
        const throwId = await createNewId("cricket_throw");
        await db.query(
            `INSERT INTO cricket_throws (id, game_id, participant_id, player_id, turn_index, dart_index, target, hit_type, marks_scored, points_scored)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [throwId, gameId, current.id, current.player_id, game.turn_index, dartIndex, target, hitType, marksApplied, pointsGivenPerOpponent * penalizedOpponents.length]
        );
        for (const opponent of penalizedOpponents) {
            const penaltyId = await createNewId("cricket_penalty");
            await db.query(
                `INSERT INTO cricket_penalties (id, game_id, throw_id, from_player_id, to_player_id, points) VALUES (?, ?, ?, ?, ?, ?)`,
                [penaltyId, gameId, throwId, current.player_id, opponent.player_id, pointsGivenPerOpponent]
            );
        }
    }

    await db.query(`UPDATE cricket_participants SET ${col} = ? WHERE id = ?`, [newMarks, current.id]);
    for (const opponent of penalizedOpponents) {
        await db.query(`UPDATE cricket_participants SET score = score + ? WHERE id = ?`, [pointsGivenPerOpponent, opponent.id]);
    }

    const updatedCurrent = { ...current, [col]: newMarks } as CricketParticipantRow;
    const penalizedIds = new Set(penalizedOpponents.map(p => p.id));
    // Only still-active (not already finished) opponents matter for
    // determining whether this closes out a place -- someone who already
    // finished is out of contention, their frozen score doesn't count
    // toward what "lowest score" means for whoever's still playing.
    const otherScores = participants
        .filter(p => p.id !== current.id && !p.finished)
        .map(p => p.score + (penalizedIds.has(p.id) ? pointsGivenPerOpponent : 0));
    const minOtherScore = otherScores.length ? Math.min(...otherScores) : 0;

    // Play continues after the first player closes out and holds the
    // (sole or tied) lowest score among the others still playing --
    // that just secures 1st place. The game only actually ends once a
    // second player also does it, securing 2nd; everyone still active
    // keeps playing until then.
    let justFinishedOrder: number | null = null;
    if (!current.finished && hasClosedAll(updatedCurrent) && current.score <= minOtherScore) {
        justFinishedOrder = 1 + participants.filter(p => p.finished).length;
        await db.query(`UPDATE cricket_participants SET finished = 1, finish_order = ? WHERE id = ?`, [justFinishedOrder, current.id]);

        if (justFinishedOrder >= 2) {
            const firstPlace = participants.find(p => p.finished);
            await db.query(
                `UPDATE cricket_games SET status = 'finished', winner_id = ?, second_place_id = ?, finished_at = NOW() WHERE id = ?`,
                [firstPlace?.player_id ?? null, current.player_id, gameId]
            );
            return;
        }
    }

    // Closing out ends your turn immediately, same as it always did --
    // no reason to throw remaining darts once you've secured a place.
    const turnEnds = dartIndex >= 3 || justFinishedOrder !== null;
    if (turnEnds) {
        const finishedIds = new Set(participants.filter(p => p.finished).map(p => p.id));
        if (justFinishedOrder !== null) finishedIds.add(current.id);

        const activeOrders = [...new Set(
            participants.filter(p => !finishedIds.has(p.id)).map(p => p.turn_order)
        )].sort((a, b) => a - b);

        if (activeOrders.length > 0) {
            const idx = activeOrders.indexOf(game.current_turn_order);
            const nextOrder = idx === -1 ? activeOrders[0] : activeOrders[(idx + 1) % activeOrders.length];
            await db.query(
                `UPDATE cricket_games SET current_turn_order = ?, turn_dart_count = 0, turn_index = turn_index + 1 WHERE id = ?`,
                [nextOrder, gameId]
            );
        }
    } else {
        await db.query(`UPDATE cricket_games SET turn_dart_count = ? WHERE id = ?`, [dartIndex, gameId]);
    }
}

export async function getState(gameId: string) {
    const game = await loadGame(gameId);
    const participants = await loadParticipants(gameId);

    return {
        id: game.id,
        status: game.status,
        winner_id: game.winner_id,
        second_place_id: game.second_place_id,
        created_at: game.created_at,
        finished_at: game.finished_at,
        current_turn_order: game.current_turn_order,
        current_participant_id: participants.find(p => p.turn_order === game.current_turn_order && !p.finished)?.id ?? null,
        turn_dart_count: game.turn_dart_count,
        targets: TARGETS,
        participants: participants.map(p => ({
            id: p.id,
            player: { id: p.player_id, name: p.player_name, initials: p.player_initials },
            turn_order: p.turn_order,
            score: p.score,
            finished: !!p.finished,
            finish_order: p.finish_order,
            marks: {
                "15": p.marks_15, "16": p.marks_16, "17": p.marks_17,
                "18": p.marks_18, "19": p.marks_19, "20": p.marks_20,
                bull: p.marks_bull,
            },
        })),
    };
}

// Undo: delete the most recent throw, reset every participant back to a
// fresh game, and replay everything else through the same recordThrow
// logic used for live play. No hand-written inverse mutations needed.
export async function undoLastThrow(gameId: string): Promise<void> {
    const [[last]] = await db.query<RowDataPacket[]>(
        `SELECT id FROM cricket_throws WHERE game_id = ? ORDER BY seq DESC LIMIT 1`,
        [gameId]
    );
    if (!last) throw new AppError("Nothing to undo", 400);
    await db.query(`DELETE FROM cricket_penalties WHERE throw_id = ?`, [last.id]);
    await db.query(`DELETE FROM cricket_throws WHERE id = ?`, [last.id]);

    const participants = await loadParticipants(gameId);
    for (const p of participants) {
        await db.query(
            `UPDATE cricket_participants
             SET score = 0, marks_15 = 0, marks_16 = 0, marks_17 = 0, marks_18 = 0, marks_19 = 0, marks_20 = 0, marks_bull = 0, finished = 0, finish_order = NULL
             WHERE id = ?`,
            [p.id]
        );
    }

    const firstOrder = Math.min(...participants.map(p => p.turn_order));
    await db.query(
        `UPDATE cricket_games SET status = 'active', current_turn_order = ?, turn_dart_count = 0, turn_index = 0, winner_id = NULL, second_place_id = NULL, finished_at = NULL WHERE id = ?`,
        [firstOrder, gameId]
    );

    const [throws] = await db.query<RowDataPacket[]>(
        `SELECT target, hit_type FROM cricket_throws WHERE game_id = ? ORDER BY seq ASC`,
        [gameId]
    );
    for (const t of throws) {
        await recordThrow(gameId, t.target as Target, t.hit_type as HitType, { skipInsert: true });
    }
}

// Permanently deletes a game and everything recorded for it (participants
// and throws). Unlike undo, which only reverts the most recent throw, this
// discards the whole game outright.
export async function discardGame(gameId: string): Promise<void> {
    await loadGame(gameId); // 404s if it doesn't exist

    const [participantRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM cricket_participants WHERE game_id = ?`, [gameId]
    );
    const [throwRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM cricket_throws WHERE game_id = ?`, [gameId]
    );
    const [penaltyRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM cricket_penalties WHERE game_id = ?`, [gameId]
    );

    await db.query(`DELETE FROM cricket_penalties WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM cricket_throws WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM cricket_participants WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM cricket_games WHERE id = ?`, [gameId]);

    const allIds = [gameId, ...participantRows.map(r => r.id), ...throwRows.map(r => r.id), ...penaltyRows.map(r => r.id)];
    await db.query(`DELETE FROM ids WHERE id IN (${allIds.map(() => "?").join(",")})`, allIds);
}