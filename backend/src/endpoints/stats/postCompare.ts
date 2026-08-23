import { Request, Response } from "express";
import { validateBody } from "../../utils/validate";
import { computePlayerStats } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    player_ids: z.array(z.string().length(32)).min(2).max(4),
});

export async function postCompare(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { player_ids: req.body.player_ids });
    const results = [];
    for (const id of body.player_ids) {
        const stats = await computePlayerStats(id);
        if (stats) results.push(stats);
    }
    return res.status(200).json(results);
}
