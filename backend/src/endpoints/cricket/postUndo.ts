import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { undoLastThrow, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({ game_id: z.string().length(32) });

export async function postUndo(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { game_id: req.body.game_id });
    await undoLastThrow(body.game_id);
    return res.status(200).json(await getState(body.game_id));
}