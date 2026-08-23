import { Request, Response } from "express";
import { db } from "../../config/db";

export async function getPlayers(_req: Request, res: Response) {
    const [rows] = await db.query(
        `SELECT id, name, initials, atw_win_streak, atw_best_win_streak, created_at
         FROM players ORDER BY name ASC`
    ) as any[];
    return res.json(rows);
}
