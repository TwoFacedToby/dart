import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { recordTurn, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    game_id: z.string().length(32),
    score: z.number().int().min(0).max(180),
});

export async function postTurn(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { game_id: req.body.game_id, score: req.body.score });
    await recordTurn(body.game_id, body.score);
    return res.status(200).json(await getState(body.game_id));
}
