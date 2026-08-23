import { apiFetch } from "../client";

export interface AtwPlayerRef {
    id: string;
    name: string;
    initials: string;
}

export interface AtwParticipant {
    id: string;
    player: AtwPlayerRef;
    turn_order: number;
    current_number: number;
    finished: boolean;
    finish_order: number | null;
    joined_mid_game: boolean;
    catching_up: boolean;
    catchup_target: number | null;
    behind_by: number;
}

export interface AtwThrow {
    dart_index: number;
    result: "miss" | "single" | "double" | "triple";
    target_number: number;
    advancement: number;
}

export interface AtwCurrentTurn {
    participant_id: string;
    dart_count: number;
    in_bonus: boolean;
    catchup_active: boolean;
    throws: AtwThrow[];
}

export interface AtwFinaleScore {
    player_id: string;
    round: number;
    score: number;
}

export interface AtwHistoryThrow {
    participant_id: string;
    turn_index: number;
    dart_index: number;
    result: "miss" | "single" | "double" | "triple";
    target_number: number;
}

export interface AtwGameState {
    id: string;
    status: string;
    phase: "normal" | "ending" | "finale" | "finished";
    winner_id: string | null;
    created_at: string;
    finished_at: string | null;
    leader_number: number;
    participants: AtwParticipant[];
    /** Upcoming turn order, front = current turn. Entries are participant ids. */
    queue: string[];
    current_participant_id: string | null;
    current_turn: AtwCurrentTurn | null;
    finishers: string[];
    finale_scores: AtwFinaleScore[];
    /** Every dart thrown this game, oldest first. One scorecard row per (participant_id, turn_index) group. */
    history: AtwHistoryThrow[];
}

export interface AtwGameSummary {
    id: string;
    status: string;
    phase: string;
    created_at: string;
    finished_at: string | null;
    winner_name: string | null;
    winner_initials: string | null;
}

export const createAtwGame = (playerIds: string[]) =>
    apiFetch<AtwGameState>("/atw/games", { method: "POST", body: JSON.stringify({ player_ids: playerIds }) });

export const addAtwParticipant = (gameId: string, playerId: string) =>
    apiFetch<AtwGameState>("/atw/games/participants", {
        method: "POST",
        body: JSON.stringify({ game_id: gameId, player_id: playerId }),
    });

export const throwAtwDart = (gameId: string, result: "miss" | "single" | "double" | "triple") =>
    apiFetch<AtwGameState>("/atw/games/throw", {
        method: "POST",
        body: JSON.stringify({ game_id: gameId, result }),
    });

export const recordAtwFinaleScore = (gameId: string, playerId: string, round: number, score: number) =>
    apiFetch<AtwGameState>("/atw/games/finale-score", {
        method: "POST",
        body: JSON.stringify({ game_id: gameId, player_id: playerId, round, score }),
    });

export const swapAtwOrder = (gameId: string, participantId: string, direction: "up" | "down") =>
    apiFetch<AtwGameState>("/atw/games/order", {
        method: "PUT",
        body: JSON.stringify({ game_id: gameId, participant_id: participantId, direction }),
    });

export const undoAtw = (gameId: string) =>
    apiFetch<AtwGameState>("/atw/games/undo", { method: "POST", body: JSON.stringify({ game_id: gameId }) });

export const discardAtwGame = (gameId: string) =>
    apiFetch<{ id: string }>("/atw/games", { method: "DELETE", body: JSON.stringify({ game_id: gameId }) });

export const getAtwActiveGame = () => apiFetch<AtwGameState | null>("/atw/games/active", { method: "GET" });

export const getAtwGame = (id: string) => apiFetch<AtwGameState>(`/atw/games/${id}`, { method: "GET" });

export const getAtwGames = () => apiFetch<AtwGameSummary[]>("/atw/games", { method: "GET" });