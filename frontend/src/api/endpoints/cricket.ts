import { apiFetch } from "../client";

export interface CricketPlayerRef {
    id: string;
    name: string;
    initials: string;
}

export interface CricketMarks {
    "15": number;
    "16": number;
    "17": number;
    "18": number;
    "19": number;
    "20": number;
    bull: number;
}

export interface CricketParticipant {
    id: string;
    player: CricketPlayerRef;
    turn_order: number;
    score: number;
    finished: boolean;
    finish_order: number | null;
    marks: CricketMarks;
}

export interface CricketGameState {
    id: string;
    status: string;
    winner_id: string | null;
    second_place_id: string | null;
    created_at: string;
    finished_at: string | null;
    current_turn_order: number;
    current_participant_id: string | null;
    turn_dart_count: number;
    targets: readonly string[];
    participants: CricketParticipant[];
}

export interface CricketGameSummary {
    id: string;
    status: string;
    created_at: string;
    finished_at: string | null;
    winner_initials: string | null;
    second_place_initials: string | null;
    player_initials: string | null;
}

export type CricketTarget = "15" | "16" | "17" | "18" | "19" | "20" | "bull";
export type CricketHitType = "miss" | "single" | "double" | "triple" | "ring" | "eye";

export const createCricketGame = (playerIds: string[]) =>
    apiFetch<CricketGameState>("/cricket/games", { method: "POST", body: JSON.stringify({ player_ids: playerIds }) });

export const throwCricketDart = (gameId: string, target: CricketTarget, hitType: CricketHitType) =>
    apiFetch<CricketGameState>("/cricket/games/throw", {
        method: "POST",
        body: JSON.stringify({ game_id: gameId, target, hit_type: hitType }),
    });

export const reorderCricket = (gameId: string, participantIds: string[]) =>
    apiFetch<CricketGameState>("/cricket/games/order", {
        method: "PUT",
        body: JSON.stringify({ game_id: gameId, participant_ids: participantIds }),
    });

export const undoCricket = (gameId: string) =>
    apiFetch<CricketGameState>("/cricket/games/undo", { method: "POST", body: JSON.stringify({ game_id: gameId }) });

export const discardCricketGame = (gameId: string) =>
    apiFetch<{ id: string }>("/cricket/games", { method: "DELETE", body: JSON.stringify({ game_id: gameId }) });

export const getCricketActiveGame = () => apiFetch<CricketGameState | null>("/cricket/games/active", { method: "GET" });

export const getCricketGame = (id: string) => apiFetch<CricketGameState>(`/cricket/games/${id}`, { method: "GET" });

export const getCricketGames = () => apiFetch<CricketGameSummary[]>("/cricket/games", { method: "GET" });