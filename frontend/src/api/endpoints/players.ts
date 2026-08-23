import { apiFetch } from "../client";

export interface Player {
    id: string;
    name: string;
    initials: string;
    atw_win_streak: number;
    atw_best_win_streak: number;
    created_at: string;
}

export const getPlayers = () => apiFetch<Player[]>("/players", { method: "GET" });

export const createPlayer = (name: string, initials: string) =>
    apiFetch<{ id: string }>("/players", { method: "POST", body: JSON.stringify({ name, initials }) });

export const updatePlayer = (id: string, fields: { name?: string; initials?: string }) =>
    apiFetch<{ id: string }>("/players", { method: "PUT", body: JSON.stringify({ id, ...fields }) });

export const deletePlayer = (id: string) =>
    apiFetch<{ id: string }>("/players", { method: "DELETE", body: JSON.stringify({ id }) });
