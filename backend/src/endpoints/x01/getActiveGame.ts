import { Request, Response } from "express";
import { db } from "../../config/db";
import { getState } from "./engine";
import { RowDataPacket } from "mysql2";

export async function getActiveGame(_req: Request, res: Response) {
    const [[game]] = await db.query<RowDataPacket[]>(
        `SELECT id FROM x01_games ORDER BY created_at DESC LIMIT 1`
    );
    if (!game) return res.status(200).json(null);
    return res.status(200).json(await getState(game.id));
}
