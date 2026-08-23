import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { recordFinaleScore, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    game_id: z.string().length(32),
    player_id: z.string().length(32),
    round: z.number().int().min(1),
    score: z.number().int().min(0).max(180),
});

export async function postFinaleScore(req: Request, res: Response) {
    const body = validateBody(ValidationRules, {
        game_id: req.body.game_id,
        player_id: req.body.player_id,
        round: req.body.round,
        score: req.body.score,
    });
    await recordFinaleScore(body.game_id, body.player_id, body.round, body.score);
    return res.status(200).json(await getState(body.game_id));
}
