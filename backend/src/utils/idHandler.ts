import { db } from "../config/db";
import { RowDataPacket } from "mysql2";
import { randomBytes } from "node:crypto";

// Same global-id pattern as the template: every table's PK is also inserted
// into `ids`, so any id can be traced back to its entity type if needed.
interface IdRow extends RowDataPacket {
    id: string;
    type: string;
}

export async function getIdTypeFromId(id: string): Promise<string | null> {
    const [[result]] = await db.query<IdRow[]>(`
        SELECT id, type FROM ids WHERE id = ? LIMIT 1
    `, [id]);
    return result?.type ?? null;
}

export async function createNewId(type: string): Promise<string> {
    let id = generateId();
    while (await idAlreadyExists(id)) id = generateId();
    await db.query(`INSERT INTO ids (id, type) VALUES (?, ?)`, [id, type]);
    return id;
}

export async function idAlreadyExists(id: string): Promise<boolean> {
    const [[result]] = await db.query<RowDataPacket[]>(
        `SELECT 1 FROM ids WHERE id = ? LIMIT 1`,
        [id]
    );
    return !!result;
}

function generateId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from(randomBytes(32), byte => chars[byte % chars.length]).join("");
}
