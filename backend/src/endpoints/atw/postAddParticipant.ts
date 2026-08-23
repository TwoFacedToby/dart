import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { addParticipant, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    game_id: z.string().length(32),
    player_id: z.string().length(32),
});

export async function postAddParticipant(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { game_id: req.body.game_id, player_id: req.body.player_id });
    await addParticipant(body.game_id, body.player_id);
    return res.status(201).json(await getState(body.game_id));
}
