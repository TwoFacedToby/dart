import { Request, Response } from "express";
import { computePlayerStats } from "./engine";

export async function getPlayerStats(req: Request, res: Response) {
    const stats = await computePlayerStats(String(req.params.id), req.query.period as string | undefined);
    if (!stats) return res.status(404).json({ error: "Player not found" });
    return res.status(200).json(stats);
}
