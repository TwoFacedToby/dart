import { apiFetch } from "../client";

export interface X01PlayerRef {
    id: string;
    name: string;
    initials: string;
}

export interface X01Participant {
    id: string;
    player: X01PlayerRef;
    turn_order: number;
    remaining_score: number;
    finished: boolean;
}

export interface X01GameState {
    id: string;
    starting_score: number;
    status: string;
    winner_id: string | null;
    created_at: string;
    finished_at: string | null;
    current_turn_order: number;
    current_participant_id: string | null;
    participants: X01Participant[];
}

export interface X01GameSummary {
    id: string;
    starting_score: number;
    status: string;
    created_at: string;
    finished_at: string | null;
    winner_initials: string | null;
    player_initials: string | null;
}

export const createX01Game = (playerIds: string[], startingScore: 101 | 301 | 501) =>
    apiFetch<X01GameState>("/x01/games", {
        method: "POST",
        body: JSON.stringify({ player_ids: playerIds, starting_score: startingScore }),
    });

export const recordX01Turn = (gameId: string, score: number) =>
    apiFetch<X01GameState>("/x01/games/turn", { method: "POST", body: JSON.stringify({ game_id: gameId, score }) });

export const reorderX01 = (gameId: string, participantIds: string[]) =>
    apiFetch<X01GameState>("/x01/games/order", {
        method: "PUT",
        body: JSON.stringify({ game_id: gameId, participant_ids: participantIds }),
    });

export const undoX01 = (gameId: string) =>
    apiFetch<X01GameState>("/x01/games/undo", { method: "POST", body: JSON.stringify({ game_id: gameId }) });

export const discardX01Game = (gameId: string) =>
    apiFetch<{ id: string }>("/x01/games", { method: "DELETE", body: JSON.stringify({ game_id: gameId }) });

export const getX01ActiveGame = () => apiFetch<X01GameState | null>("/x01/games/active", { method: "GET" });

export const getX01Game = (id: string) => apiFetch<X01GameState>(`/x01/games/${id}`, { method: "GET" });

export const getX01Games = () => apiFetch<X01GameSummary[]>("/x01/games", { method: "GET" });