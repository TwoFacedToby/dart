import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { recordThrow, getState, TARGETS } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    game_id: z.string().length(32),
    target: z.enum(TARGETS),
    hit_type: z.enum(["miss", "single", "double", "triple", "ring", "eye"]),
});

export async function postThrow(req: Request, res: Response) {
    const body = validateBody(ValidationRules, {
        game_id: req.body.game_id,
        target: req.body.target,
        hit_type: req.body.hit_type,
    });
    await recordThrow(body.game_id, body.target, body.hit_type);
    return res.status(200).json(await getState(body.game_id));
}
