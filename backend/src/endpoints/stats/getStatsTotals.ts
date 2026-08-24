import { Request, Response } from "express";
import { computeStatsTotals } from "./engine";

export async function getStatsTotals(req: Request, res: Response) {
    return res.status(200).json(await computeStatsTotals(req.query.period as string | undefined));
}
