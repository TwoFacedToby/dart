import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { recordThrow, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    game_id: z.string().length(32),
    result: z.enum(["miss", "single", "double", "triple"]),
});

export async function postThrow(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { game_id: req.body.game_id, result: req.body.result });
    await recordThrow(body.game_id, body.result);
    return res.status(200).json(await getState(body.game_id));
}
