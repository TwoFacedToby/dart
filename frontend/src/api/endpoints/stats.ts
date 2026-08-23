import { apiFetch } from "../client";

export interface PlayerStats {
    player: { id: string; name: string; initials: string };
    games_played: number;
    wins: number;
    win_rate: number;
    by_game: {
        around_the_world: { played: number; wins: number; win_rate: number };
        cricket: { played: number; wins: number; win_rate: number };
        x01: { played: number; wins: number; win_rate: number };
    };
    accuracy_percentage: number;
    darts_thrown: number;
    highest_x01_turn: number;
    atw_current_win_streak: number;
    atw_best_win_streak: number;
    atw_longest_hit_streak: number;
    atw_biggest_single_turn_gain: number;
}

export const getAllStats = () => apiFetch<PlayerStats[]>("/stats", { method: "GET" });

export const getPlayerStats = (id: string) => apiFetch<PlayerStats>(`/stats/${id}`, { method: "GET" });

export const compareStats = (playerIds: string[]) =>
    apiFetch<PlayerStats[]>("/stats/compare", { method: "POST", body: JSON.stringify({ player_ids: playerIds }) });
