import { Request, Response } from "express";
import { db } from "../../config/db";
import { validateBody } from "../../utils/validate";
import { AppError } from "../../errors/AppError";
import { loadGame, loadParticipants, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    game_id: z.string().length(32),
    participant_ids: z.array(z.string().length(32)),
});

// Re-numbers turn_order to match the given sequence. If the participant
// currently up changes position, the game just continues from whichever
// turn_order the mid-turn player now has, to avoid losing marks scored so
// far this turn.
export async function putReorder(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { game_id: req.body.game_id, participant_ids: req.body.participant_ids });

    const game = await loadGame(body.game_id);
    const participants = await loadParticipants(body.game_id);
    const currentParticipant = participants.find(p => p.turn_order === game.current_turn_order);

    const currentSet = participants.map(p => p.id).sort().join(",");
    const newSet = [...body.participant_ids].sort().join(",");
    if (currentSet !== newSet) {
        throw new AppError("New order must contain exactly the participants in this game", 400);
    }

    for (let i = 0; i < body.participant_ids.length; i++) {
        await db.query(`UPDATE cricket_participants SET turn_order = ? WHERE id = ?`, [i, body.participant_ids[i]]);
    }

    if (currentParticipant) {
        const newOrder = body.participant_ids.indexOf(currentParticipant.id);
        await db.query(`UPDATE cricket_games SET current_turn_order = ? WHERE id = ?`, [newOrder, body.game_id]);
    }

    return res.status(200).json(await getState(body.game_id));
}
