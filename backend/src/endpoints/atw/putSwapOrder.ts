import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { swapDisplayOrder, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    game_id: z.string().length(32),
    participant_id: z.string().length(32),
    direction: z.enum(["up", "down"]),
});

// Swaps a participant with their neighbor in the stable turn_order, one
// step at a time. Editor and viewer both display participants sorted by
// this field, so this is the only thing that moves rows around; ordinary
// turn-taking never touches it.
export async function putSwapOrder(req: Request, res: Response) {
    const body = validateBody(ValidationRules, {
        game_id: req.body.game_id,
        participant_id: req.body.participant_id,
        direction: req.body.direction,
    });
    await swapDisplayOrder(body.game_id, body.participant_id, body.direction);
    return res.status(200).json(await getState(body.game_id));
}