import { Request, Response } from "express";
import { db } from "../../config/db";
import { validateBody } from "../../utils/validate";
import { createNewId } from "../../utils/idHandler";
import z from "zod";

const ValidationRules = z.object({
    name: z.string().min(1).max(64),
    initials: z.string().min(1).max(8),
});

export async function postCreatePlayer(req: Request, res: Response) {
    const body = validateBody(ValidationRules, {
        name: req.body.name,
        initials: req.body.initials,
    });

    const [existing] = await db.query(
        `SELECT id FROM players WHERE name = ? OR initials = ?`,
        [body.name, body.initials]
    ) as any[];
    if (existing.length) {
        return res.status(400).json({ error: "A player with that name or those initials already exists" });
    }

    const id = await createNewId("player");
    await db.query(
        `INSERT INTO players (id, name, initials) VALUES (?, ?, ?)`,
        [id, body.name, body.initials]
    );

    return res.status(201).json({ id });
}
