import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { discardGame } from "./engine";
import z from "zod";

const ValidationRules = z.object({ game_id: z.string().length(32) });

export async function deleteGame(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { game_id: req.body.game_id });
    await discardGame(body.game_id);
    return res.status(200).json({ id: body.game_id });
}
