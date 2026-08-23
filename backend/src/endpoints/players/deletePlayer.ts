import { Request, Response } from "express";
import { db } from "../../config/db";
import { validateBody } from "../../utils/validate";
import { ResultSetHeader } from "mysql2";
import z from "zod";

const ValidationRules = z.object({ id: z.string().length(32) });

export async function deletePlayer(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { id: req.body.id });

    const [result] = await db.query<ResultSetHeader>(
        `DELETE FROM players WHERE id = ?`,
        [body.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Player not found" });
    return res.status(200).json({ id: body.id });
}
