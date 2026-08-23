import { Request, Response } from "express";
import { db } from "../../config/db";
import { validateBody } from "../../utils/validate";
import { createNewId } from "../../utils/idHandler";
import { getState } from "./engine";
import z from "zod";

const ValidationRules = z.object({
    player_ids: z.array(z.string().length(32)).min(1),
    starting_score: z.union([z.literal(101), z.literal(301), z.literal(501)]),
});

export async function postCreateGame(req: Request, res: Response) {
    const body = validateBody(ValidationRules, {
        player_ids: req.body.player_ids,
        starting_score: req.body.starting_score,
    });

    const gameId = await createNewId("x01_game");
    await db.query(
        `INSERT INTO x01_games (id, starting_score, status, current_turn_order) VALUES (?, ?, 'active', 0)`,
        [gameId, body.starting_score]
    );
    for (let i = 0; i < body.player_ids.length; i++) {
        const participantId = await createNewId("x01_participant");
        await db.query(
            `INSERT INTO x01_participants (id, game_id, player_id, turn_order, remaining_score) VALUES (?, ?, ?, ?, ?)`,
            [participantId, gameId, body.player_ids[i], i, body.starting_score]
        );
    }

    return res.status(201).json(await getState(gameId));
}
