import { db } from "../../config/db";
import { createNewId } from "../../utils/idHandler";
import { AppError } from "../../errors/AppError";
import { RowDataPacket } from "mysql2";

// ---------------------------------------------------------------------------
// 101 / 301 / 501 engine. "No weird rules" per the brief, so this is plain
// count-down scoring: enter the turn's total (0-180), bust (go below zero)
// voids the turn and remaining stays put, reaching exactly zero wins. No
// double-out requirement.
// ---------------------------------------------------------------------------

export interface X01GameRow extends RowDataPacket {
    id: string;
    starting_score: number;
    status: string;
    current_turn_order: number;
    turn_index: number;
    winner_id: string | null;
    created_at: string;
    finished_at: string | null;
}

export interface X01ParticipantRow extends RowDataPacket {
    id: string;
    game_id: string;
    player_id: string;
    turn_order: number;
    remaining_score: number;
    finished: number;
    player_name?: string;
    player_initials?: string;
}

export async function loadGame(gameId: string): Promise<X01GameRow> {
    const [[game]] = await db.query<X01GameRow[]>(`SELECT * FROM x01_games WHERE id = ?`, [gameId]);
    if (!game) throw new AppError("Game not found", 404);
    return game;
}

export async function loadParticipants(gameId: string): Promise<X01ParticipantRow[]> {
    const [rows] = await db.query<X01ParticipantRow[]>(`
        SELECT p.*, pl.name as player_name, pl.initials as player_initials
        FROM x01_participants p
        JOIN players pl ON pl.id = p.player_id
        WHERE p.game_id = ?
        ORDER BY p.turn_order ASC
    `, [gameId]);
    return rows;
}

// `skipInsert` is used only by undoLastTurn's replay: the row already
// exists, we're just re-deriving state from it.
export async function recordTurn(gameId: string, scoreEntered: number, opts: { skipInsert?: boolean } = {}): Promise<void> {
    const game = await loadGame(gameId);
    if (game.status !== "active") throw new AppError("This game has already finished", 400);

    const participants = await loadParticipants(gameId);
    const current = participants.find(p => p.turn_order === game.current_turn_order);
    if (!current) throw new AppError("No current participant found for this turn", 500);

    const attempted = current.remaining_score - scoreEntered;
    const busted = attempted < 0;
    const remainingAfter = busted ? current.remaining_score : attempted;

    if (!opts.skipInsert) {
        const turnId = await createNewId("x01_turn");
        await db.query(
            `INSERT INTO x01_turns (id, game_id, participant_id, player_id, turn_index, score_entered, busted, remaining_after)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [turnId, gameId, current.id, current.player_id, game.turn_index, scoreEntered, busted, remainingAfter]
        );
    }

    await db.query(`UPDATE x01_participants SET remaining_score = ? WHERE id = ?`, [remainingAfter, current.id]);

    if (!busted && remainingAfter === 0) {
        await db.query(`UPDATE x01_participants SET finished = 1 WHERE id = ?`, [current.id]);
        await db.query(
            `UPDATE x01_games SET status = 'finished', winner_id = ?, finished_at = NOW() WHERE id = ?`,
            [current.player_id, gameId]
        );
        return;
    }

    const orders = [...new Set(participants.map(p => p.turn_order))].sort((a, b) => a - b);
    const idx = orders.indexOf(game.current_turn_order);
    const nextOrder = orders[(idx + 1) % orders.length];
    await db.query(
        `UPDATE x01_games SET current_turn_order = ?, turn_index = turn_index + 1 WHERE id = ?`,
        [nextOrder, gameId]
    );
}

export async function getState(gameId: string) {
    const game = await loadGame(gameId);
    const participants = await loadParticipants(gameId);

    return {
        id: game.id,
        starting_score: game.starting_score,
        status: game.status,
        winner_id: game.winner_id,
        created_at: game.created_at,
        finished_at: game.finished_at,
        current_turn_order: game.current_turn_order,
        current_participant_id: participants.find(p => p.turn_order === game.current_turn_order)?.id ?? null,
        participants: participants.map(p => ({
            id: p.id,
            player: { id: p.player_id, name: p.player_name, initials: p.player_initials },
            turn_order: p.turn_order,
            remaining_score: p.remaining_score,
            finished: !!p.finished,
        })),
    };
}

// Undo: delete the most recent turn, reset every participant back to the
// starting score, and replay everything else through the same recordTurn
// logic used for live play.
export async function undoLastTurn(gameId: string): Promise<void> {
    const game = await loadGame(gameId);
    const [[last]] = await db.query<RowDataPacket[]>(
        `SELECT id FROM x01_turns WHERE game_id = ? ORDER BY seq DESC LIMIT 1`,
        [gameId]
    );
    if (!last) throw new AppError("Nothing to undo", 400);
    await db.query(`DELETE FROM x01_turns WHERE id = ?`, [last.id]);

    const participants = await loadParticipants(gameId);
    for (const p of participants) {
        await db.query(
            `UPDATE x01_participants SET remaining_score = ?, finished = 0 WHERE id = ?`,
            [game.starting_score, p.id]
        );
    }

    const firstOrder = Math.min(...participants.map(p => p.turn_order));
    await db.query(
        `UPDATE x01_games SET status = 'active', current_turn_order = ?, turn_index = 0, winner_id = NULL, finished_at = NULL WHERE id = ?`,
        [firstOrder, gameId]
    );

    const [turns] = await db.query<RowDataPacket[]>(
        `SELECT score_entered FROM x01_turns WHERE game_id = ? ORDER BY seq ASC`,
        [gameId]
    );
    for (const t of turns) {
        await recordTurn(gameId, t.score_entered, { skipInsert: true });
    }
}

// Permanently deletes a game and everything recorded for it (participants
// and turns). Unlike undo, which only reverts the most recent turn, this
// discards the whole game outright.
export async function discardGame(gameId: string): Promise<void> {
    await loadGame(gameId); // 404s if it doesn't exist

    const [participantRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM x01_participants WHERE game_id = ?`, [gameId]
    );
    const [turnRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM x01_turns WHERE game_id = ?`, [gameId]
    );

    await db.query(`DELETE FROM x01_turns WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM x01_participants WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM x01_games WHERE id = ?`, [gameId]);

    const allIds = [gameId, ...participantRows.map(r => r.id), ...turnRows.map(r => r.id)];
    await db.query(`DELETE FROM ids WHERE id IN (${allIds.map(() => "?").join(",")})`, allIds);
}