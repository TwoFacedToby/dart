import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { db } from "./db";
import { createNewId } from "../utils/idHandler";

interface SeedPlayer {
    name: string;
    initials: string;
}

// backend/players.seed.json, two levels up from both src/config (dev) and dist/config (build).
const SEED_FILE_PATH = path.join(__dirname, "../../players.seed.json");

const DEFAULT_SEED: SeedPlayer[] = [];

// Runs on every boot, after createTables(). Creates the seed file if it does
// not exist yet, then inserts its players into the players table, but only
// if that table is currently empty. Editing the file later has no effect
// until the table is emptied again, so this never overwrites real data.
export async function seedPlayers(): Promise<void> {
    if (!existsSync(SEED_FILE_PATH)) {
        writeFileSync(SEED_FILE_PATH, JSON.stringify(DEFAULT_SEED, null, 4) + "\n");
        console.log(`Created players seed file at ${SEED_FILE_PATH}`);
    }

    const seed: SeedPlayer[] = JSON.parse(readFileSync(SEED_FILE_PATH, "utf-8"));
    if (seed.length === 0) return;

    const [rows] = await db.query(`SELECT COUNT(*) as count FROM players`) as any[];
    if (rows[0].count > 0) return;

    console.log(`Seeding ${seed.length} player(s) from players.seed.json...`);
    for (const player of seed) {
        const id = await createNewId("player");
        await db.query(
            `INSERT INTO players (id, name, initials) VALUES (?, ?, ?)`,
            [id, player.name, player.initials]
        );
    }
    console.log("Player seeding complete.");
}
