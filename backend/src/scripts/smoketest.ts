// ---------------------------------------------------------------------------
// DEV-ONLY smoke test for the three game engines. Run with:
//   npx ts-node --transpile-only src/scripts/smoketest.ts
//
// WARNING: this WIPES all data in the configured database (players, games,
// throws) before running. Never point it at a database with real game data.
// ---------------------------------------------------------------------------
import dotenv from "dotenv";
dotenv.config();

import { db } from "../config/db";
import { createTables } from "../config/migration";
import { createNewId } from "../utils/idHandler";

import * as atw from "../endpoints/atw/engine";
import * as cricket from "../endpoints/cricket/engine";
import * as x01 from "../endpoints/x01/engine";
import { computeAllPlayerStats } from "../endpoints/stats/engine";

function assert(cond: any, msg: string) {
    if (!cond) {
        console.error("FAIL:", msg);
        process.exitCode = 1;
    } else {
        console.log("ok:", msg);
    }
}

async function makePlayer(name: string, initials: string): Promise<string> {
    const id = await createNewId("player");
    await db.query(`INSERT INTO players (id, name, initials) VALUES (?, ?, ?)`, [id, name, initials]);
    return id;
}

async function main() {
    await createTables();

    // Clean slate
    await db.query("SET FOREIGN_KEY_CHECKS=0");
    for (const t of [
        "atw_finale_scores", "atw_throws", "atw_participants", "atw_games",
        "cricket_throws", "cricket_participants", "cricket_games",
        "x01_turns", "x01_participants", "x01_games",
        "players", "ids",
    ]) {
        await db.query(`DELETE FROM ${t}`);
    }
    await db.query("SET FOREIGN_KEY_CHECKS=1");

    const alice = await makePlayer("Alice", "AL");
    const bob = await makePlayer("Bob", "BO");
    const carol = await makePlayer("Carol", "CA");
    const dave = await makePlayer("Dave", "DA");

    // ---------------- ATW: basic game, no previous history ----------------
    console.log("\n--- ATW game 1 ---");
    const g1 = await atw.createGame([alice, bob, carol]);
    let state = await atw.getState(g1);
    assert(state.participants.length === 3, "3 participants created");
    assert(state.current_turn?.participant_id === state.participants[0].id, "first participant is up");

    // Alice throws: single, single, single -> not all hit (they ARE all hit actually), let's do single,single,miss
    await atw.recordThrow(g1, "single");
    await atw.recordThrow(g1, "single");
    await atw.recordThrow(g1, "miss");
    state = await atw.getState(g1);
    const aliceP = state.participants.find(p => p.player.id === alice)!;
    assert(aliceP.current_number === 3, `Alice at 3 after 2 hits + miss, got ${aliceP.current_number}`);
    assert(state.current_participant_id !== aliceP.id, "turn passed to next participant after 3 darts");

    // Bob: hit hit hit (bonus dart) then miss -> ends after bonus miss
    await atw.recordThrow(g1, "single");
    await atw.recordThrow(g1, "single");
    await atw.recordThrow(g1, "single");
    state = await atw.getState(g1);
    let bobP = state.participants.find(p => p.player.id === bob)!;
    assert(bobP.current_number === 4, `Bob at 4 after 3 hits (still same turn, bonus dart pending), got ${bobP.current_number}`);
    assert(state.current_turn?.in_bonus === true, "bob is in bonus dart phase");
    await atw.recordThrow(g1, "miss");
    state = await atw.getState(g1);
    bobP = state.participants.find(p => p.player.id === bob)!;
    assert(bobP.current_number === 4, "bob's number unchanged on bonus miss");
    assert(state.current_turn?.participant_id !== bobP.id, "turn passed after bonus miss");

    // Carol's turn now (first lap done for her too eventually) - just miss all
    await atw.recordThrow(g1, "miss");
    await atw.recordThrow(g1, "miss");
    await atw.recordThrow(g1, "miss");
    state = await atw.getState(g1);
    assert(state.current_participant_id === aliceP.id, "rotation wrapped back to Alice");

    // ---------------- ATW: catch-up rule + mid-game join ----------------
    console.log("\n--- ATW catch-up + mid-game join ---");
    // Fast-forward Alice with triples while NOT behind by 5 -> should only advance by 1 each
    await atw.recordThrow(g1, "triple"); // alice at 3 -> should be 4 (no catchup active, leader currently bob@4, alice@3, diff=1)
    state = await atw.getState(g1);
    let aliceP2 = state.participants.find(p => p.player.id === alice)!;
    assert(aliceP2.current_number === 4, `triple with no catchup only advances by 1, got ${aliceP2.current_number}`);
    await atw.recordThrow(g1, "miss");
    await atw.recordThrow(g1, "miss");
    state = await atw.getState(g1);

    // Add Dave mid-game; catch-up target is how many turns the others have
    // already taken, not a board number to chase.
    await atw.addParticipant(g1, dave);
    state = await atw.getState(g1);
    const daveP = state.participants.find(p => p.player.id === dave)!;
    assert(daveP.joined_mid_game === true, "dave flagged joined_mid_game");
    assert(daveP.catching_up === true, "dave flagged catching up");
    const targetTurns = daveP.catchup_target ?? 0;
    assert(targetTurns > 0, "dave has a positive catch-up target, since others have already played");
    assert(state.current_participant_id === daveP.id, "dave inserted at front of queue to catch up");

    // Play exactly targetTurns turns for Dave, missing every dart. This is
    // the scenario that used to hang: catch-up used to require reaching a
    // board number, which a miss (0 advancement) can never do. It should
    // now end strictly on turn-count parity regardless of hits or misses.
    for (let i = 0; i < targetTurns; i++) {
        const s = await atw.getState(g1);
        const d = s.participants.find(p => p.player.id === dave)!;
        assert(d.catching_up === true, `dave still catching up before turn ${i + 1} of ${targetTurns}`);
        await atw.recordThrow(g1, "miss");
        await atw.recordThrow(g1, "miss");
        await atw.recordThrow(g1, "miss");
    }
    state = await atw.getState(g1);
    const daveP2 = state.participants.find(p => p.player.id === dave)!;
    assert(daveP2.catching_up === false, `dave finished catching up after exactly ${targetTurns} turn(s), even with all misses`);
    assert(daveP2.current_number === 1, "dave's number is unchanged, since he missed every catch-up dart");
    assert(state.current_participant_id !== daveP2.id, "turn passed on to someone else once dave caught up");

    // ---------------- ATW: race to the finish + ending round ----------------
    console.log("\n--- ATW finish + ending round ---");
    async function forceFinish(gameId: string, playerId: string) {
        let iterations = 0;
        while (true) {
            const s = await atw.getState(gameId);
            if (s.phase !== "normal" && s.phase !== "ending") break;
            const cur = s.current_turn;
            if (!cur) break;
            const curPlayerId = s.participants.find(p => p.id === cur.participant_id)?.player.id;
            if (curPlayerId === playerId) {
                await atw.recordThrow(gameId, "triple");
            } else {
                await atw.recordThrow(gameId, "miss");
                await atw.recordThrow(gameId, "miss");
                await atw.recordThrow(gameId, "miss");
            }
            iterations++;
            if (iterations > 500) throw new Error("forceFinish did not terminate");
        }
    }
    await forceFinish(g1, alice);
    state = await atw.getState(g1);
    assert(state.phase === "finished" || state.phase === "finale", `game reached ending state, phase=${state.phase}`);
    if (state.phase === "finished") {
        assert(state.winner_id === alice, "alice recorded as winner");
    }
    console.log("ATW game 1 final phase:", state.phase, "winner:", state.winner_id);

    // ---------------- ATW: seeding order from previous game ----------------
    console.log("\n--- ATW game 2: seeded order ---");
    const g2 = await atw.createGame([alice, bob, carol]);
    const g2state = await atw.getState(g2);
    console.log("g2 order:", g2state.participants.map(p => p.player.name));
    if (state.winner_id) {
        assert(g2state.participants[0].player.id === state.winner_id, "winner from last game seeded first");
    }

    // ---------------- Cricket ----------------
    console.log("\n--- Cricket ---");
    const cId = await createNewId("cricket_game");
    await db.query(`INSERT INTO cricket_games (id, status, current_turn_order) VALUES (?, 'active', 0)`, [cId]);
    for (let i = 0; i < 2; i++) {
        const pid = await createNewId("cricket_participant");
        await db.query(`INSERT INTO cricket_participants (id, game_id, player_id, turn_order) VALUES (?, ?, ?, ?)`,
            [pid, cId, [alice, bob][i], i]);
    }

    // Alice closes 20 with a triple (3 marks in one dart)
    await cricket.recordThrow(cId, "20", "triple");
    let cState = await cricket.getState(cId);
    let aliceC = cState.participants.find(p => p.player.id === alice)!;
    let bobC = cState.participants.find(p => p.player.id === bob)!;
    assert(aliceC.marks["20"] === 3, "alice closed 20 with a triple");
    assert(aliceC.score === 0, "closing a number scores nothing by itself");
    assert(bobC.score === 0, "bob untouched before alice hits 20 again");

    // Alice hits 20 again (single) - bob hasn't closed 20, so bob takes the penalty, not alice
    await cricket.recordThrow(cId, "20", "single");
    cState = await cricket.getState(cId);
    aliceC = cState.participants.find(p => p.player.id === alice)!;
    bobC = cState.participants.find(p => p.player.id === bob)!;
    assert(aliceC.score === 0, `alice's own score stays 0 after hitting a closed number, got ${aliceC.score}`);
    assert(bobC.score === 20, `bob (hasn't closed 20) takes the 20-point penalty, got ${bobC.score}`);

    await cricket.recordThrow(cId, "15", "miss");
    cState = await cricket.getState(cId);
    assert(cState.current_participant_id !== aliceC.id, "cricket turn passes after 3 darts");

    // ---------------- X01 ----------------
    console.log("\n--- X01 ---");
    const xId = await createNewId("x01_game");
    await db.query(`INSERT INTO x01_games (id, starting_score, status, current_turn_order) VALUES (?, 101, 'active', 0)`, [xId]);
    for (let i = 0; i < 2; i++) {
        const pid = await createNewId("x01_participant");
        await db.query(`INSERT INTO x01_participants (id, game_id, player_id, turn_order, remaining_score) VALUES (?, ?, ?, ?, ?)`,
            [pid, xId, [carol, dave][i], i, 101]);
    }

    await x01.recordTurn(xId, 150); // bust, over 101
    let xState = await x01.getState(xId);
    let carolX = xState.participants.find(p => p.player.id === carol)!;
    assert(carolX.remaining_score === 101, `bust leaves remaining unchanged, got ${carolX.remaining_score}`);
    assert(xState.current_participant_id !== carolX.id, "turn passes after a bust");

    await x01.recordTurn(xId, 41); // dave: 101-41=60
    await x01.recordTurn(xId, 101); // carol checks out exactly
    xState = await x01.getState(xId);
    assert(xState.status === "finished", "x01 game finished on exact checkout");
    assert(xState.winner_id === carol, "carol wins x01 game");

    // ---------------- ATW: finale (two finishers same round) ----------------
    console.log("\n--- ATW finale ---");
    const g3 = await atw.createGame([alice, bob]);
    // Force both players to 19 directly, then have alice finish, then bob
    // finish on his turn within the same ending round -> finale.
    await db.query(`UPDATE atw_participants SET current_number = 19 WHERE game_id = ?`, [g3]);
    let s3 = await atw.getState(g3);
    const aliceIsFirst = s3.participants[0].player.id === alice;
    // Alice's turn (whoever is first): single -> finishes at 20
    await atw.recordThrow(g3, "single");
    s3 = await atw.getState(g3);
    assert(s3.phase === "ending", `first finisher moves game to ending phase, got ${s3.phase}`);
    // Next participant (bob, still queued for this round) also finishes
    await atw.recordThrow(g3, "single");
    s3 = await atw.getState(g3);
    assert(s3.phase === "finale", `two finishers in the same round trigger a finale, got ${s3.phase}`);
    assert(s3.finishers.length === 2, "both participants recorded as finishers");
    void aliceIsFirst;

    // Tied finale (1-1, 1-1, 1-1) should require an extra round automatically
    await atw.recordFinaleScore(g3, alice, 1, 10);
    await atw.recordFinaleScore(g3, bob, 1, 10);
    await atw.recordFinaleScore(g3, alice, 2, 20);
    await atw.recordFinaleScore(g3, bob, 2, 20);
    await atw.recordFinaleScore(g3, alice, 3, 15);
    await atw.recordFinaleScore(g3, bob, 3, 15);
    s3 = await atw.getState(g3);
    assert(s3.phase === "finale", `tied 3-round finale stays open for a tiebreaker round, got ${s3.phase}`);

    await atw.recordFinaleScore(g3, alice, 4, 30);
    await atw.recordFinaleScore(g3, bob, 4, 25);
    s3 = await atw.getState(g3);
    assert(s3.phase === "finished", `finale resolves once untied, got ${s3.phase}`);
    assert(s3.winner_id === alice, "alice wins the finale with the higher round-4 score");


    console.log("\n--- Stats ---");
    const allStats = await computeAllPlayerStats();
    const aliceStats = allStats.find(s => s.player.id === alice)!;
    console.log("alice stats:", JSON.stringify(aliceStats, null, 2));
    assert(aliceStats.darts_thrown > 0, "alice has recorded darts");
    assert(aliceStats.by_game.around_the_world.played >= 1, "alice played at least 1 atw game");

    console.log("\nSmoke test complete.");
    process.exit(process.exitCode ?? 0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
