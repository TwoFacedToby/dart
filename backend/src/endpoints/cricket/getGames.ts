import { Request, Response } from "express";
import { db } from "../../config/db";
import { RowDataPacket } from "mysql2";

export async function getGames(_req: Request, res: Response) {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT g.id, g.status, g.created_at, g.finished_at, w.initials as winner_initials, s.initials as second_place_initials,
               (SELECT GROUP_CONCAT(pl.initials ORDER BY p.turn_order SEPARATOR ',')
                FROM cricket_participants p JOIN players pl ON pl.id = p.player_id
                WHERE p.game_id = g.id) as player_initials
        FROM cricket_games g
        LEFT JOIN players w ON w.id = g.winner_id
        LEFT JOIN players s ON s.id = g.second_place_id
        ORDER BY g.created_at DESC
        LIMIT 100
    `);
    return res.status(200).json(rows);
}
