import { Request, Response } from "express";
import { getState } from "./engine";

export async function getGame(req: Request, res: Response) {
    return res.status(200).json(await getState(String(req.params.id)));
}
