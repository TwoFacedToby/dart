import { db } from "../../config/db";
import { createNewId } from "../../utils/idHandler";
import { AppError } from "../../errors/AppError";
import { RowDataPacket } from "mysql2";

// ---------------------------------------------------------------------------
// Around the World engine.
//
// Turn order is modeled as an explicit queue (JSON array of participant_id,
// stored on the game row as `turn_queue`, front = whoever throws next).
// Recording a throw always acts on the queue's front entry. When a turn
// ends, the engine either re-queues the participant at the back (normal
// rotation), re-queues them at the front (mid-game catch-up), or drops them
// (finished, or the game has moved past `phase: normal`).
//
// A few rules in the brief were ambiguous and needed a concrete
// interpretation to implement; each is called out in a comment at the
// point it's decided, and summarized again in the project README.
// ---------------------------------------------------------------------------

export interface AtwGameRow extends RowDataPacket {
    id: string;
    status: string;
    phase: "normal" | "ending" | "finale" | "finished";
    turn_queue: string | null;
    turn_index: number;
    turn_dart_count: number;
    turn_all_hit: number;
    turn_in_bonus: number;
    turn_catchup: number;
    finishers_json: string | null;
    bonus_rounds_remaining: number;
    start_streaks_json: string | null;
    winner_id: string | null;
    created_at: string;
    finished_at: string | null;
}

export interface AtwParticipantRow extends RowDataPacket {
    id: string;
    game_id: string;
    player_id: string;
    turn_order: number;
    current_number: number;
    finished: number;
    finish_order: number | null;
    joined_mid_game: number;
    catching_up: number;
    catchup_target: number | null;
    created_at: string;
    id_seq: number;
    player_name?: string;
    player_initials?: string;
    player_win_streak?: number;
}

export async function loadGame(gameId: string): Promise<AtwGameRow> {
    const [[game]] = await db.query<AtwGameRow[]>(`SELECT * FROM atw_games WHERE id = ?`, [gameId]);
    if (!game) throw new AppError("Game not found", 404);
    return game;
}

export async function loadParticipants(gameId: string): Promise<AtwParticipantRow[]> {
    const [rows] = await db.query<AtwParticipantRow[]>(`
        SELECT p.*, pl.name as player_name, pl.initials as player_initials, pl.atw_win_streak as player_win_streak, ids.seq as id_seq
        FROM atw_participants p
                 JOIN players pl ON pl.id = p.player_id
                 JOIN ids ON ids.id = p.id
        WHERE p.game_id = ?
        ORDER BY p.turn_order ASC
    `, [gameId]);
    return rows;
}

export function parseQueue(game: AtwGameRow): string[] {
    if (!game.turn_queue) return [];
    try {
        return JSON.parse(game.turn_queue);
    } catch {
        return [];
    }
}

export function parseFinishers(game: AtwGameRow): string[] {
    if (!game.finishers_json) return [];
    try {
        return JSON.parse(game.finishers_json);
    } catch {
        return [];
    }
}

// Leader = furthest along. Finished players sit at 20 and still count, since
// "5+ behind the leader" should reflect the true frontrunner even after they
// finish (other players can still be racing to catch someone who's done).
function leaderNumber(participants: AtwParticipantRow[]): number {
    return Math.max(1, ...participants.map(p => p.current_number));
}

// Rule: doubles/triples only count in full if you started your turn 5+
// behind the leader. A participant still in their mid-game catch-up phase
// is exempt (see the comment at its call site in recordThrow) -- being far
// behind is mechanical for them, not the "fell behind during play"
// situation this rule rewards.
function isCatchupEligible(participant: AtwParticipantRow, participants: AtwParticipantRow[]): boolean {
    return !participant.catching_up && participant.current_number <= leaderNumber(participants) - 5;
}

// A normal (non-catch-up) participant always re-queues at whatever the
// current back of the queue is, which is what keeps `queue` a clean
// rotation of everyone's `turn_order` as play goes on. A newly caught-up
// participant can't use that same trick: they were parked at the *front*
// of the queue for however many turns catch-up took, so by the time they
// finish, "the current back of the queue" is just wherever the rotation
// happens to be mid-lap, not the position their turn_order actually
// belongs at. Instead, find the lap boundary in the remaining queue (where
// turn_order drops back down, i.e. from the last player in the lap to the
// first) and slot them in right before it, so they land after everyone
// else and before the rotation wraps back to the start.
function insertAtRotationEnd(queue: string[], byId: Map<string, AtwParticipantRow>, participantId: string): string[] {
    const orderOf = (id: string) => byId.get(id)?.turn_order ?? 0;
    let wrapIndex = -1;
    for (let i = 1; i < queue.length; i++) {
        if (orderOf(queue[i]) < orderOf(queue[i - 1])) {
            wrapIndex = i;
            break;
        }
    }
    if (wrapIndex === -1) return [...queue, participantId];
    return [...queue.slice(0, wrapIndex), participantId, ...queue.slice(wrapIndex)];
}

// Given the queue right after popping a just-finished participant, keeps
// only the entries still due *this* lap. The queue is a continuous FIFO
// where finishing a normal turn re-queues you at the back for next lap,
// so at any moment it actually contains "everyone left this lap" followed
// by "everyone who already went this lap, waiting for next lap" -- the
// join point between them is wherever turn_order wraps back down. Without
// this trim, a finish would incorrectly hand a bonus "everyone still gets
// their turn" turn to people who'd already had theirs this round.
function trimToCurrentLap(queue: string[], byId: Map<string, AtwParticipantRow>): string[] {
    const orderOf = (id: string) => byId.get(id)?.turn_order ?? 0;
    for (let i = 1; i < queue.length; i++) {
        if (orderOf(queue[i]) < orderOf(queue[i - 1])) return queue.slice(0, i);
    }
    return queue;
}

async function countTurnsTaken(gameId: string, participantId: string): Promise<number> {
    const [[row]] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT turn_index) as turns FROM atw_throws WHERE game_id = ? AND participant_id = ?`,
        [gameId, participantId]
    );
    return row?.turns ?? 0;
}

export type ThrowResult = "miss" | "single" | "double" | "triple";

// `skipInsert` is used only by resetAndReplay: the historical throw row
// already exists in the table (we're re-deriving state from it, not
// recording a new dart), so every mutation below still runs but the
// INSERT is skipped to avoid creating a duplicate.
export async function recordThrow(gameId: string, result: ThrowResult, opts: { skipInsert?: boolean } = {}): Promise<void> {
    const game = await loadGame(gameId);
    if (game.phase !== "normal" && game.phase !== "ending") {
        throw new AppError("This game is not accepting normal throws right now", 400);
    }

    const queue = parseQueue(game);
    if (queue.length === 0) throw new AppError("No active turn in this game", 400);

    const participants = await loadParticipants(gameId);
    const byId = new Map(participants.map(p => [p.id, p]));
    const participantId = queue[0];
    const participant = byId.get(participantId);
    if (!participant) throw new AppError("Current participant not found", 500);

    const startingNewTurn = game.turn_dart_count === 0 && !game.turn_in_bonus;

    let turnCatchup = !!game.turn_catchup;
    let turnIndex = game.turn_index;
    let turnAllHit = !!game.turn_all_hit;
    let turnInBonus = !!game.turn_in_bonus;
    let dartCount = game.turn_dart_count;

    if (startingNewTurn) {
        // Rule: "the double and triple does not count for more... unless you
        // started your turn being behind with 5 or more" — locked in once,
        // at the first dart of the turn, using the leader's position at
        // that moment.
        //
        // A participant still in their mid-game catch-up phase is exempt:
        // being 5+ behind the leader is expected and mechanical for them
        // (they've simply not had a turn yet), not the "fell behind during
        // play" situation this rule exists to reward. If nobody else was
        // ever flagged catchup at the round they're now replaying, they
        // shouldn't be either. Once catching_up flips off and they join
        // normal rotation, the ordinary rule applies to them like anyone
        // else.
        turnCatchup = isCatchupEligible(participant, participants);
        turnIndex += 1;
        turnAllHit = true;
        turnInBonus = false;
        dartCount = 0;
    }

    const dartIndex = dartCount + 1;

    let advancement = 0;
    if (result === "single") advancement = 1;
    else if (result === "double") advancement = turnCatchup ? 2 : 1;
    else if (result === "triple") advancement = turnCatchup ? 3 : 1;

    if (!opts.skipInsert) {
        const throwId = await createNewId("atw_throw");
        await db.query(
            `INSERT INTO atw_throws (id, game_id, participant_id, player_id, turn_index, dart_index, target_number, result, catchup_active, advancement)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [throwId, gameId, participantId, participant.player_id, turnIndex, dartIndex, participant.current_number, result, turnCatchup, advancement]
        );
    }

    let newNumber = participant.current_number + advancement;
    let justFinished = false;
    if (participant.current_number >= 20) {
        // Already aiming at 20: any hit finishes (the multiplier doesn't
        // matter once you're here, you just need to land the dart), a
        // miss leaves you aiming at 20 again next time.
        newNumber = 20;
        if (result !== "miss" && !participant.finished) justFinished = true;
    } else if (newNumber > 20) {
        // Catch-up's extra advancement can carry the raw arithmetic past
        // 20, but you can never skip actually being at 20 -- it caps you
        // there, aiming at 20 next, same as ordinary advancement landing
        // exactly on 20 does. Only a genuine overshoot (raw > 20) needs
        // capping; landing exactly on 20 is the normal, correct way to
        // start aiming at it and must not be clamped down.
        newNumber = 20;
    }

    dartCount = dartIndex;
    if (dartIndex <= 3 && result === "miss") turnAllHit = false;

    let turnEnds = justFinished;
    if (!turnEnds) {
        if (dartIndex < 3) {
            turnEnds = false; // first 3 darts are always thrown regardless of hit/miss
        } else if (dartIndex === 3) {
            if (turnAllHit) {
                turnInBonus = true; // bonus dart earned, turn continues
                turnEnds = false;
            } else {
                turnEnds = true;
            }
        } else {
            // in bonus phase: a hit continues it, a miss ends the turn
            turnEnds = result === "miss";
        }
    }

    // Persist participant state
    const finishOrder = justFinished
        ? 1 + participants.filter(p => p.finished).length
        : participant.finish_order;

    await db.query(
        `UPDATE atw_participants SET current_number = ?, finished = ?, finish_order = ? WHERE id = ?`,
        [newNumber, participant.finished || justFinished ? 1 : 0, finishOrder, participantId]
    );

    let phase: AtwGameRow["phase"] = game.phase;
    let status = game.status;
    let finishers = parseFinishers(game);
    let winnerId = game.winner_id;
    let finishedAt: string | Date | null = game.finished_at;

    if (turnEnds) {
        // Pop the front of the queue; decide whether/where to re-queue.
        let newQueue = queue.slice(1);
        let bonusRoundsRemaining = game.bonus_rounds_remaining;

        if (justFinished && phase === "normal") {
            // First finisher of the game. Only the participants still due
            // *this* lap get the guaranteed "everyone still gets their
            // turn" round -- anyone already re-queued for next lap
            // already had theirs.
            phase = "ending";
            status = "active"; // status stays simple; `phase` carries the detail for the UI
            finishers = [participantId];
            newQueue = trimToCurrentLap(newQueue, byId);

            // Win-streak bonus: winning N in a row (N >= 2) earns N - 1
            // extra full rounds for everyone still active, on top of the
            // guaranteed round above, to raise the odds of a finale
            // against a player who's been dominating.
            const [[playerRow]] = await db.query<RowDataPacket[]>(
                `SELECT atw_win_streak FROM players WHERE id = ?`,
                [participant.player_id]
            );
            const priorStreak = playerRow?.atw_win_streak ?? 0;
            bonusRoundsRemaining = Math.max(0, priorStreak - 1);
        } else if (justFinished && phase === "ending") {
            finishers = [...finishers, participantId];
        }

        if (!justFinished && phase === "normal") {
            if (participant.catching_up) {
                // Caught up once this participant's own turn count matches
                // what the others already had when they joined -- not once
                // they reach a particular board number. Tying it to a
                // number instead would let a run of misses (0 advancement)
                // stall the whole game on this one player forever, since
                // they'd never reach the target.
                const turnsTaken = await countTurnsTaken(gameId, participantId);
                const caughtUp = turnsTaken >= (participant.catchup_target ?? 0);
                if (caughtUp) {
                    await db.query(`UPDATE atw_participants SET catching_up = 0 WHERE id = ?`, [participantId]);
                    newQueue = insertAtRotationEnd(newQueue, byId, participantId);
                } else {
                    newQueue = [participantId, ...newQueue];
                }
            } else {
                newQueue = [...newQueue, participantId];
            }
        }
        // If phase is 'ending' and this participant didn't finish, they
        // simply drop out of the queue; the round is wrapping up.

        if (newQueue.length === 0 && phase === "ending") {
            if (bonusRoundsRemaining > 0) {
                // The guaranteed round (or a previous bonus round) just
                // wrapped up and the winner is still ahead by however
                // many wins in a row -- give everyone still active one
                // more full round to try to catch them. Whoever just
                // threw stays eligible unless this very dart is what
                // finished them (justFinished) -- an ordinary, non-
                // finishing turn doesn't remove them from the next
                // bonus round. Anyone who does finish during a bonus
                // round joins `finishers` above like normal.
                const stillActiveIds = participants
                    .filter(p => !p.finished && !(justFinished && p.id === participantId))
                    .sort((a, b) => a.turn_order - b.turn_order)
                    .map(p => p.id);
                if (stillActiveIds.length > 0) {
                    newQueue = stillActiveIds;
                    bonusRoundsRemaining -= 1;
                } else {
                    bonusRoundsRemaining = 0;
                }
            }

            if (newQueue.length === 0) {
                if (finishers.length === 1) {
                    phase = "finished";
                    status = "finished";
                    winnerId = participants.find(p => p.id === finishers[0])?.player_id ?? null;
                    finishedAt = new Date();
                    await applyStreaks(gameId, winnerId, participants);
                } else if (finishers.length >= 2) {
                    phase = "finale";
                    status = "finale";
                }
            }
        }

        dartCount = 0;
        turnAllHit = true;
        turnInBonus = false;

        // The turn is handing off to a new current participant (or ending
        // the game). Their catch-up eligibility needs to be correct right
        // now, not just after their first dart -- otherwise the indicator
        // would incorrectly read "no catch-up" for the whole window
        // between the hand-off and their first throw, which is exactly
        // when the operator is looking at the screen to see it.
        const patchedParticipants = participants.map(p =>
            p.id === participantId ? { ...p, current_number: newNumber, finished: (justFinished || !!p.finished) ? 1 : 0 } : p
        );
        const patchedById = new Map(patchedParticipants.map(p => [p.id, p]));
        const nextParticipant = newQueue.length ? patchedById.get(newQueue[0]) : undefined;
        const nextTurnCatchup = nextParticipant ? isCatchupEligible(nextParticipant, patchedParticipants) : false;

        await db.query(
            `UPDATE atw_games SET turn_queue = ?, turn_index = ?, turn_dart_count = ?, turn_all_hit = ?, turn_in_bonus = ?, turn_catchup = ?,
                                  phase = ?, status = ?, finishers_json = ?, winner_id = ?, finished_at = ?, bonus_rounds_remaining = ?
             WHERE id = ?`,
            [JSON.stringify(newQueue), turnIndex, dartCount, turnAllHit, turnInBonus, nextTurnCatchup,
                phase, status, JSON.stringify(finishers), winnerId, finishedAt, bonusRoundsRemaining, gameId]
        );
    } else {
        await db.query(
            `UPDATE atw_games SET turn_queue = ?, turn_index = ?, turn_dart_count = ?, turn_all_hit = ?, turn_in_bonus = ?, turn_catchup = ?
             WHERE id = ?`,
            [JSON.stringify(queue), turnIndex, dartCount, turnAllHit, turnInBonus, turnCatchup, gameId]
        );
    }
}

export async function getState(gameId: string) {
    const game = await loadGame(gameId);
    const participants = await loadParticipants(gameId);
    const queue = parseQueue(game);
    const finishers = parseFinishers(game);

    const leader = leaderNumber(participants);

    let finaleScores: RowDataPacket[] = [];
    if (game.phase === "finale" || (game.phase === "finished" && finishers.length >= 2)) {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT player_id, round, score FROM atw_finale_scores WHERE game_id = ? ORDER BY round ASC`,
            [gameId]
        );
        finaleScores = rows;
    }

    let currentTurnThrows: RowDataPacket[] = [];
    if (queue.length) {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT dart_index, result, target_number, advancement FROM atw_throws
             WHERE game_id = ? AND participant_id = ? AND turn_index = ?
             ORDER BY dart_index ASC`,
            [gameId, queue[0], game.turn_index]
        );
        currentTurnThrows = rows;
    }

    // Every dart ever thrown this game, for the scorecard view: grouped
    // client-side by (participant_id, turn_index) into one row per turn.
    const [historyRows] = await db.query<RowDataPacket[]>(
        `SELECT participant_id, turn_index, dart_index, result, target_number
         FROM atw_throws WHERE game_id = ? ORDER BY turn_index ASC, dart_index ASC`,
        [gameId]
    );

    return {
        id: game.id,
        status: game.status,
        phase: game.phase,
        winner_id: game.winner_id,
        created_at: game.created_at,
        finished_at: game.finished_at,
        leader_number: leader,
        participants: participants.map(p => ({
            id: p.id,
            player: { id: p.player_id, name: p.player_name, initials: p.player_initials, win_streak: p.player_win_streak ?? 0 },
            turn_order: p.turn_order,
            current_number: p.current_number,
            finished: !!p.finished,
            finish_order: p.finish_order,
            joined_mid_game: !!p.joined_mid_game,
            catching_up: !!p.catching_up,
            catchup_target: p.catchup_target,
            behind_by: leader - p.current_number,
        })),
        queue,
        current_participant_id: queue[0] ?? null,
        current_turn: queue.length
            ? {
                participant_id: queue[0],
                dart_count: game.turn_dart_count,
                in_bonus: !!game.turn_in_bonus,
                catchup_active: !!game.turn_catchup,
                throws: currentTurnThrows.map(t => ({
                    dart_index: t.dart_index,
                    result: t.result,
                    target_number: t.target_number,
                    advancement: t.advancement,
                })),
            }
            : null,
        finishers,
        finale_scores: finaleScores,
        history: historyRows.map(t => ({
            participant_id: t.participant_id,
            turn_index: t.turn_index,
            dart_index: t.dart_index,
            result: t.result,
            target_number: t.target_number,
        })),
    };
}

// Builds today's play order and creates the game + participants. Players
// from the most recent finished game keep their relative finishing order
// (winner first, then other finishers by finale score, then non-finishers
// by how close they got); anyone not in that game is appended in random
// order. With no previous finished game, the given order is used as-is.
export async function createGame(playerIds: string[]): Promise<string> {
    const [[lastGame]] = await db.query<RowDataPacket[]>(
        `SELECT id FROM atw_games WHERE status = 'finished' ORDER BY finished_at DESC LIMIT 1`
    );

    let orderedPlayerIds: string[];

    if (lastGame) {
        const [lastParticipants] = await db.query<RowDataPacket[]>(
            `SELECT player_id, finished, finish_order, current_number FROM atw_participants WHERE game_id = ?`,
            [lastGame.id]
        );
        const [finaleScores] = await db.query<RowDataPacket[]>(
            `SELECT player_id, SUM(score) as total FROM atw_finale_scores WHERE game_id = ? GROUP BY player_id`,
            [lastGame.id]
        );
        const finaleTotalByPlayer = new Map(finaleScores.map(r => [r.player_id, r.total]));

        const finishers = lastParticipants
            .filter(p => p.finished)
            .sort((a, b) => {
                const aTotal = finaleTotalByPlayer.get(a.player_id) ?? null;
                const bTotal = finaleTotalByPlayer.get(b.player_id) ?? null;
                if (aTotal !== null || bTotal !== null) return (bTotal ?? -1) - (aTotal ?? -1);
                return (a.finish_order ?? 999) - (b.finish_order ?? 999);
            });
        const nonFinishers = lastParticipants
            .filter(p => !p.finished)
            .sort((a, b) => b.current_number - a.current_number);

        const lastOrder = [...finishers, ...nonFinishers].map(p => p.player_id);

        const known = lastOrder.filter(pid => playerIds.includes(pid));
        const newOnes = playerIds.filter(pid => !lastOrder.includes(pid));
        for (let i = newOnes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newOnes[i], newOnes[j]] = [newOnes[j], newOnes[i]];
        }
        orderedPlayerIds = [...known, ...newOnes];
    } else {
        orderedPlayerIds = playerIds;
    }

    const gameId = await createNewId("atw_game");

    // Snapshot every participating player's streak as of right now, so a
    // later undo can restore it exactly rather than guessing at a reversal.
    const [streakRows] = await db.query<RowDataPacket[]>(
        `SELECT id, atw_win_streak, atw_best_win_streak FROM players WHERE id IN (${orderedPlayerIds.map(() => "?").join(",")})`,
        orderedPlayerIds
    );
    const startStreaks: Record<string, { win_streak: number; best_win_streak: number }> = {};
    for (const row of streakRows) {
        startStreaks[row.id] = { win_streak: row.atw_win_streak, best_win_streak: row.atw_best_win_streak };
    }

    await db.query(
        `INSERT INTO atw_games (id, status, phase, turn_queue, turn_index, start_streaks_json) VALUES (?, 'active', 'normal', '[]', 0, ?)`,
        [gameId, JSON.stringify(startStreaks)]
    );

    const participantIds: string[] = [];
    for (let i = 0; i < orderedPlayerIds.length; i++) {
        const participantId = await createNewId("atw_participant");
        participantIds.push(participantId);
        await db.query(
            `INSERT INTO atw_participants (id, game_id, player_id, turn_order, current_number) VALUES (?, ?, ?, ?, 1)`,
            [participantId, gameId, orderedPlayerIds[i], i]
        );
    }

    await db.query(`UPDATE atw_games SET turn_queue = ? WHERE id = ?`, [JSON.stringify(participantIds), gameId]);

    return gameId;
}

// Mid-game join: catch-up target is how many turns the other active
// players have already taken, so the new player gets consecutive turns
// (inserted at the front of the queue) until their own turn count matches,
// then joins the normal rotation -- regardless of whether they've hit the
// same board position. Tying catch-up to a board number instead would let
// a run of misses strand the whole game on the joining player forever,
// since a miss never advances them.
//
// The target is the MINIMUM turn count among active players, not the
// maximum: if one player has raced ahead and already taken an extra turn
// while everyone else is still waiting for theirs, the new player only
// needs to match the ones who haven't gone yet. That way they rejoin
// right before whoever's turn is actually coming up next, instead of
// being forced to also match the front-runner's extra turn.
export async function addParticipant(gameId: string, playerId: string): Promise<void> {
    const game = await loadGame(gameId);
    if (game.phase !== "normal") throw new AppError("Players can only be added while the game is in its normal phase", 400);

    const participants = await loadParticipants(gameId);
    if (participants.some(p => p.player_id === playerId)) {
        throw new AppError("That player is already in this game", 400);
    }

    const activeTurnCounts = await Promise.all(
        participants.filter(p => !p.finished && !p.catching_up).map(p => countTurnsTaken(gameId, p.id))
    );
    const catchupTarget = activeTurnCounts.length ? Math.min(...activeTurnCounts) : 0;
    const needsCatchup = catchupTarget > 0;

    const participantId = await createNewId("atw_participant");
    const nextOrder = 1 + Math.max(0, ...participants.map(p => p.turn_order));

    await db.query(
        `INSERT INTO atw_participants (id, game_id, player_id, turn_order, current_number, joined_mid_game, catching_up, catchup_target)
         VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
        [participantId, gameId, playerId, nextOrder, needsCatchup, catchupTarget]
    );

    const queue = parseQueue(game);
    const newQueue = needsCatchup ? [participantId, ...queue] : [...queue, participantId];
    await db.query(`UPDATE atw_games SET turn_queue = ? WHERE id = ?`, [JSON.stringify(newQueue), gameId]);
}

// Swaps two adjacent participants (by the stable, persisted turn_order
// field) one position apart. This is the only thing that changes
// turn_order -- normal turn-taking never touches it, so the displayed
// order stays put between manual reorders instead of shuffling every time
// someone finishes a turn. Neither participant in the swap may be the one
// currently up (mid-turn) or already finished, so you can't accidentally
// reorder someone into a turn they've already had.
export async function swapDisplayOrder(gameId: string, participantId: string, direction: "up" | "down"): Promise<void> {
    const game = await loadGame(gameId);
    const participants = await loadParticipants(gameId);
    const sorted = [...participants].sort((a, b) => a.turn_order - b.turn_order);

    const idx = sorted.findIndex(p => p.id === participantId);
    if (idx === -1) throw new AppError("Participant not found in this game", 404);

    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[neighborIdx];
    const currentId = game.phase === "normal" || game.phase === "ending" ? parseQueue(game)[0] : null;

    const ineligible = (p: AtwParticipantRow) => p.id === currentId || p.finished;
    if (ineligible(a) || ineligible(b)) {
        throw new AppError("Can't reorder a participant who is currently up or has already finished", 400);
    }

    await db.query(`UPDATE atw_participants SET turn_order = ? WHERE id = ?`, [b.turn_order, a.id]);
    await db.query(`UPDATE atw_participants SET turn_order = ? WHERE id = ?`, [a.turn_order, b.id]);

    // Keep the live rotation in step: swap their first (upcoming) slot in
    // the queue too, if both still have one queued.
    const queue = parseQueue(game);
    const aQueueIdx = queue.indexOf(a.id);
    const bQueueIdx = queue.indexOf(b.id);
    if (aQueueIdx !== -1 && bQueueIdx !== -1) {
        const newQueue = [...queue];
        [newQueue[aQueueIdx], newQueue[bQueueIdx]] = [newQueue[bQueueIdx], newQueue[aQueueIdx]];
        await db.query(`UPDATE atw_games SET turn_queue = ? WHERE id = ?`, [JSON.stringify(newQueue), gameId]);
    }
}

async function applyStreaks(gameId: string, winnerId: string | null, participants: AtwParticipantRow[]): Promise<void> {
    for (const p of participants) {
        if (p.player_id === winnerId) {
            // Computed in JS rather than `col = col + 1` twice in one SQL
            // statement: MySQL evaluates SET clauses left-to-right with
            // visibility into earlier assignments in the same statement, so
            // referencing atw_win_streak in both expressions double-counts
            // the increment for atw_best_win_streak.
            const [[row]] = await db.query<RowDataPacket[]>(
                `SELECT atw_win_streak, atw_best_win_streak FROM players WHERE id = ?`,
                [p.player_id]
            );
            const newStreak = (row?.atw_win_streak ?? 0) + 1;
            const newBest = Math.max(row?.atw_best_win_streak ?? 0, newStreak);
            await db.query(
                `UPDATE players SET atw_win_streak = ?, atw_best_win_streak = ? WHERE id = ?`,
                [newStreak, newBest, p.player_id]
            );
        } else {
            await db.query(`UPDATE players SET atw_win_streak = 0 WHERE id = ?`, [p.player_id]);
        }
    }
}

// Records one finale round score for one player. When all finalists have
// three rounds recorded, resolves the winner (highest total; ties get an
// extra sudden-death round automatically, since the brief only specifies
// the 3-round format for the ordinary case).
export async function recordFinaleScore(gameId: string, playerId: string, round: number, score: number): Promise<void> {
    const game = await loadGame(gameId);
    if (game.phase !== "finale") throw new AppError("This game is not in a finale", 400);

    const finishers = parseFinishers(game);
    const participants = await loadParticipants(gameId);
    const finalistPlayerIds = participants.filter(p => finishers.includes(p.id)).map(p => p.player_id);
    if (!finalistPlayerIds.includes(playerId)) throw new AppError("Player is not in this finale", 400);

    const id = await createNewId("atw_finale_score");
    await db.query(
        `INSERT INTO atw_finale_scores (id, game_id, player_id, round, score) VALUES (?, ?, ?, ?, ?)`,
        [id, gameId, playerId, round, score]
    );

    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT player_id, round FROM atw_finale_scores WHERE game_id = ?`,
        [gameId]
    );

    const roundsPlayed = Math.max(0, ...rows.map(r => r.round));
    const requiredRound = roundsPlayed < 3 ? 3 : roundsPlayed;
    const allIn = finalistPlayerIds.every(pid =>
        rows.filter(r => r.player_id === pid).length >= requiredRound
    );
    if (!allIn) return;

    const [totals] = await db.query<RowDataPacket[]>(
        `SELECT player_id, SUM(score) as total FROM atw_finale_scores WHERE game_id = ? GROUP BY player_id`,
        [gameId]
    );
    const sorted = totals.sort((a, b) => b.total - a.total);
    if (sorted.length >= 2 && sorted[0].total === sorted[1].total) {
        return; // tied, needs another round (frontend will prompt for round `requiredRound + 1`)
    }

    const winnerId = sorted[0]?.player_id ?? null;
    await db.query(
        `UPDATE atw_games SET phase = 'finished', status = 'finished', winner_id = ?, finished_at = NOW() WHERE id = ?`,
        [winnerId, gameId]
    );
    await applyStreaks(gameId, winnerId, participants);
}

// ---------------------------------------------------------------------------
// Undo. Rather than hand-writing an inverse for every possible mutation a
// dart can cause (advancing a number, ending a turn, finishing the game,
// starting a finale, updating a win streak...), undo deletes the most
// recent action and replays everything else from scratch through the same
// recordThrow logic used for live play. That logic is already what's
// tested and trusted, so replay can't drift from it by construction.
// ---------------------------------------------------------------------------

async function spliceIntoQueueForReplay(gameId: string, participant: AtwParticipantRow): Promise<void> {
    const game = await loadGame(gameId);
    const queue = parseQueue(game);
    const needsCatchup = participant.catchup_target !== null && participant.catchup_target > 0;
    const newQueue = needsCatchup ? [participant.id, ...queue] : [...queue, participant.id];
    await db.query(`UPDATE atw_games SET turn_queue = ? WHERE id = ?`, [JSON.stringify(newQueue), gameId]);
}

async function resetAndReplay(gameId: string): Promise<void> {
    const game = await loadGame(gameId);
    const participants = await loadParticipants(gameId);

    // Streaks are a global, cross-game value on the player row -- restore
    // them to what they were right before this game ever started, then let
    // replay reapply whatever the (possibly now-different) outcome is.
    if (game.start_streaks_json) {
        const snapshot: Record<string, { win_streak: number; best_win_streak: number }> = JSON.parse(game.start_streaks_json);
        for (const [playerId, s] of Object.entries(snapshot)) {
            await db.query(
                `UPDATE players SET atw_win_streak = ?, atw_best_win_streak = ? WHERE id = ?`,
                [s.win_streak, s.best_win_streak, playerId]
            );
        }
    }

    for (const p of participants) {
        const needsCatchup = !!p.joined_mid_game && p.catchup_target !== null && p.catchup_target > 0;
        await db.query(
            `UPDATE atw_participants SET current_number = 1, finished = 0, finish_order = NULL, catching_up = ? WHERE id = ?`,
            [needsCatchup ? 1 : 0, p.id]
        );
    }

    const originalParticipants = participants
        .filter(p => !p.joined_mid_game)
        .sort((a, b) => a.turn_order - b.turn_order);
    const midGameJoiners = participants
        .filter(p => p.joined_mid_game)
        .sort((a, b) => a.id_seq - b.id_seq);

    await db.query(
        `UPDATE atw_games SET phase = 'normal', status = 'active', turn_queue = ?, turn_index = 0, turn_dart_count = 0,
                              turn_all_hit = 1, turn_in_bonus = 0, turn_catchup = 0, finishers_json = NULL, bonus_rounds_remaining = 0, winner_id = NULL, finished_at = NULL
         WHERE id = ?`,
        [JSON.stringify(originalParticipants.map(p => p.id)), gameId]
    );

    // Join with `ids` for each throw's true creation order (`ids.seq`), on
    // the same global counter participants are ordered by above -- a plain
    // DATETIME comparison isn't precise enough to interleave joins and
    // throws correctly when several happen within the same second.
    const [throws] = await db.query<RowDataPacket[]>(
        `SELECT t.*, ids.seq as id_seq FROM atw_throws t
                                                JOIN ids ON ids.id = t.id
         WHERE t.game_id = ? ORDER BY t.seq ASC`,
        [gameId]
    );

    let joinPointer = 0;
    for (const t of throws) {
        while (joinPointer < midGameJoiners.length && midGameJoiners[joinPointer].id_seq <= t.id_seq) {
            await spliceIntoQueueForReplay(gameId, midGameJoiners[joinPointer]);
            joinPointer++;
        }
        await recordThrow(gameId, t.result as ThrowResult, { skipInsert: true });
    }
    while (joinPointer < midGameJoiners.length) {
        await spliceIntoQueueForReplay(gameId, midGameJoiners[joinPointer]);
        joinPointer++;
    }
}

async function undoLastFinaleScore(gameId: string): Promise<void> {
    const game = await loadGame(gameId);
    const [[last]] = await db.query<RowDataPacket[]>(
        `SELECT id FROM atw_finale_scores WHERE game_id = ? ORDER BY seq DESC LIMIT 1`,
        [gameId]
    );
    if (!last) throw new AppError("Nothing to undo", 400);

    await db.query(`DELETE FROM atw_finale_scores WHERE id = ?`, [last.id]);

    if (game.phase === "finished") {
        // The deleted entry was the one that resolved the finale -- reopen
        // it and put the streak change (if any) back the way it was.
        if (game.start_streaks_json) {
            const snapshot: Record<string, { win_streak: number; best_win_streak: number }> = JSON.parse(game.start_streaks_json);
            for (const [playerId, s] of Object.entries(snapshot)) {
                await db.query(
                    `UPDATE players SET atw_win_streak = ?, atw_best_win_streak = ? WHERE id = ?`,
                    [s.win_streak, s.best_win_streak, playerId]
                );
            }
        }
        await db.query(
            `UPDATE atw_games SET phase = 'finale', status = 'finale', winner_id = NULL, finished_at = NULL WHERE id = ?`,
            [gameId]
        );
    }
}

// Public entry point: figures out whether the last action was a dart or a
// finale-round score, and undoes whichever one it actually was.
export async function undoLastAction(gameId: string): Promise<void> {
    const game = await loadGame(gameId);
    const finishers = parseFinishers(game);

    if (finishers.length >= 2) {
        const [[lastFinale]] = await db.query<RowDataPacket[]>(
            `SELECT id FROM atw_finale_scores WHERE game_id = ? ORDER BY seq DESC LIMIT 1`,
            [gameId]
        );
        if (lastFinale) {
            await undoLastFinaleScore(gameId);
            return;
        }
    }

    const [[lastThrow]] = await db.query<RowDataPacket[]>(
        `SELECT id FROM atw_throws WHERE game_id = ? ORDER BY seq DESC LIMIT 1`,
        [gameId]
    );
    if (!lastThrow) throw new AppError("Nothing to undo", 400);

    await db.query(`DELETE FROM atw_throws WHERE id = ?`, [lastThrow.id]);
    await resetAndReplay(gameId);
}

// Permanently deletes a game and everything recorded for it (participants,
// throws, and any finale scores). Unlike undo, which only reverts the most
// recent action, this discards the whole game outright. No player stats
// need reverting: win streaks are only touched once a game actually
// finishes (see applyStreaks), and a finished game is never "active", so it
// can't reach this function.
export async function discardGame(gameId: string): Promise<void> {
    await loadGame(gameId); // 404s if it doesn't exist

    const [participantRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM atw_participants WHERE game_id = ?`, [gameId]
    );
    const [throwRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM atw_throws WHERE game_id = ?`, [gameId]
    );
    const [finaleRows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM atw_finale_scores WHERE game_id = ?`, [gameId]
    );

    await db.query(`DELETE FROM atw_finale_scores WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM atw_throws WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM atw_participants WHERE game_id = ?`, [gameId]);
    await db.query(`DELETE FROM atw_games WHERE id = ?`, [gameId]);

    const allIds = [gameId, ...participantRows.map(r => r.id), ...throwRows.map(r => r.id), ...finaleRows.map(r => r.id)];
    await db.query(`DELETE FROM ids WHERE id IN (${allIds.map(() => "?").join(",")})`, allIds);
}