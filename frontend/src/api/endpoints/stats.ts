import { apiFetch } from "../client";

export type StatsPeriod = "month" | "3months" | "year" | "all";

export interface PlayerStats {
    player: { id: string; name: string; initials: string };
    games_played: number;
    wins: number;
    win_rate: number;
    darts_thrown: number;
    atw: {
        played: number;
        wins: number;
        win_rate: number;
        accuracy_percentage: number;
        current_win_streak: number;
        best_win_streak: number;
        longest_hit_streak: number;
        biggest_single_turn_gain: number;
        average_turns_to_win: number;
    };
    cricket: {
        played: number;
        wins: number;
        win_rate: number;
        accuracy_percentage: number;
        times_second: number;
        highest_received: number;
        average_received: number;
        highest_given: number;
        average_given: number;
        average_turns_to_win: number;
    };
    x01: Record<"101" | "301" | "501", {
        played: number;
        wins: number;
        win_rate: number;
        highest_turn: number;
        // average_arrows_to_win disabled -- see engine.ts on the backend.
        // average_arrows_to_win: number;
    }>;
}

export interface StatsTotals {
    atw_games: number;
    cricket_games: number;
    x01_games: { total: number; by_starting_score: Record<string, number> };
    darts_thrown: number;
}

function periodQuery(period: StatsPeriod): string {
    return period === "all" ? "" : `?period=${period}`;
}

export const getAllStats = (period: StatsPeriod = "all") =>
    apiFetch<PlayerStats[]>(`/stats${periodQuery(period)}`, { method: "GET" });

export const getPlayerStats = (id: string, period: StatsPeriod = "all") =>
    apiFetch<PlayerStats>(`/stats/${id}${periodQuery(period)}`, { method: "GET" });

export const compareStats = (playerIds: string[], period: StatsPeriod = "all") =>
    apiFetch<PlayerStats[]>("/stats/compare", { method: "POST", body: JSON.stringify({ player_ids: playerIds, period: period === "all" ? undefined : period }) });

export const getStatsTotals = (period: StatsPeriod = "all") =>
    apiFetch<StatsTotals>(`/stats/totals${periodQuery(period)}`, { method: "GET" });
