import { Request, Response } from "express";
import { db } from "../../config/db";
import { validateBody } from "../../utils/validate";
import { ResultSetHeader } from "mysql2";
import z from "zod";

const ValidationRules = z.object({
    id: z.string().length(32),
    name: z.string().min(1).max(64).optional(),
    initials: z.string().min(1).max(8).optional(),
}).refine(({ name, initials }) => name !== undefined || initials !== undefined, {
    message: "At least one field must be provided to update",
});

export async function putUpdatePlayer(req: Request, res: Response) {
    const body = validateBody(ValidationRules, {
        id: req.body.id,
        name: req.body.name,
        initials: req.body.initials,
    });

    const [clashes] = await db.query(
        `SELECT id FROM players WHERE (name = ? OR initials = ?) AND id != ?`,
        [body.name ?? "", body.initials ?? "", body.id]
    ) as any[];
    if (clashes.length) {
        return res.status(400).json({ error: "A player with that name or those initials already exists" });
    }

    const fields: Record<string, any> = {};
    if (body.name !== undefined) fields.name = body.name;
    if (body.initials !== undefined) fields.initials = body.initials;
    const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(", ");

    const [result] = await db.query<ResultSetHeader>(
        `UPDATE players SET ${setClauses} WHERE id = ?`,
        [...Object.values(fields), body.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Player not found" });
    return res.status(200).json({ id: body.id });
}
