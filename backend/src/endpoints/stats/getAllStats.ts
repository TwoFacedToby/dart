import { Request, Response } from "express";
import { computeAllPlayerStats } from "./engine";

export async function getAllStats(_req: Request, res: Response) {
    return res.status(200).json(await computeAllPlayerStats());
}
