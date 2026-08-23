import { Request, Response } from "express";
import { db } from "../../config/db";
import { validateBody } from "../../utils/validate";
import { createNewId } from "../../utils/idHandler";
import { getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    player_ids: z.array(z.string().length(32)).min(1),
});

export async function postCreateGame(req: Request, res: Response) {
    const body = validateBody(ValidationRules, { player_ids: req.body.player_ids });

    const gameId = await createNewId("cricket_game");
    await db.query(`INSERT INTO cricket_games (id, status, current_turn_order) VALUES (?, 'active', 0)`, [gameId]);
    for (let i = 0; i < body.player_ids.length; i++) {
        const participantId = await createNewId("cricket_participant");
        await db.query(
            `INSERT INTO cricket_participants (id, game_id, player_id, turn_order) VALUES (?, ?, ?, ?)`,
            [participantId, gameId, body.player_ids[i], i]
        );
    }

    return res.status(201).json(await getState(gameId));
}
