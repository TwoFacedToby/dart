import { Request, Response } from "express";
import { db } from "../../config/db";
import { RowDataPacket } from "mysql2";

export async function getGames(_req: Request, res: Response) {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT g.id, g.starting_score, g.status, g.created_at, g.finished_at, w.name as winner_name, w.initials as winner_initials
        FROM x01_games g
        LEFT JOIN players w ON w.id = g.winner_id
        ORDER BY g.created_at DESC
        LIMIT 100
    `);
    return res.status(200).json(rows);
}
