import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { createGame, getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    player_ids: z.array(z.string().length(32)).min(1),
});

export async function postCreateGame(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { player_ids: req.body.player_ids });
    const gameId = await createGame(body.player_ids);
    return res.status(201).json(await getState(gameId));
}
