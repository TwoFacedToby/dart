import { Request, Response } from "express";
import { db } from "../../config/db";
import { RowDataPacket } from "mysql2";

export async function getGames(_req: Request, res: Response) {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT g.id, g.starting_score, g.status, g.created_at, g.finished_at, w.initials as winner_initials,
               (SELECT GROUP_CONCAT(pl.initials ORDER BY p.turn_order SEPARATOR ',')
                FROM x01_participants p JOIN players pl ON pl.id = p.player_id
                WHERE p.game_id = g.id) as player_initials
        FROM x01_games g
        LEFT JOIN players w ON w.id = g.winner_id
        ORDER BY g.created_at DESC
        LIMIT 100
    `);
    return res.status(200).json(rows);
}
