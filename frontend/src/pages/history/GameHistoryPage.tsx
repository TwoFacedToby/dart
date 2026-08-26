import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    getAtwGames, discardAtwGame, type AtwGameSummary,
    getCricketGames, discardCricketGame, type CricketGameSummary,
    getX01Games, discardX01Game, type X01GameSummary,
} from "../../api";
import { ConfirmDeleteModal } from "../../components/game-controls/ConfirmDeleteModal";

import "./GameHistoryPage.css";

type GameType = "atw" | "cricket" | "x01";

interface HistoryEntry {
    type: GameType;
    id: string;
    label: string;
    players: string;
    winner: string;
    created_at: string;
    finished_at: string | null;
}

function formatTime(iso: string | null): string {
    if (!iso) return "-";
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function toEntries(type: GameType, label: string, games: (AtwGameSummary | CricketGameSummary | X01GameSummary)[]): HistoryEntry[] {
    return games.map(g => ({
        type,
        id: g.id,
        label,
        players: g.player_initials ?? "-",
        winner: g.winner_initials ?? "-",
        created_at: g.created_at,
        finished_at: g.finished_at,
    }));
}

const DISCARD_BY_TYPE: Record<GameType, (id: string) => Promise<unknown>> = {
    atw: discardAtwGame,
    cricket: discardCricketGame,
    x01: discardX01Game,
};

export function GameHistoryPage() {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);

    function load() {
        setError(null);
        Promise.all([getAtwGames(), getCricketGames(), getX01Games()])
            .then(([atw, cricket, x01]) => {
                const merged = [
                    ...toEntries("atw", "Around the World", atw),
                    ...toEntries("cricket", "Cricket", cricket),
                    ...toEntries("x01", "101 / 301 / 501", x01),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setEntries(merged);
            })
            .catch(e => setError(e instanceof Error ? e.message : "Failed to load game history"));
    }

    useEffect(load, []);

    async function handleDelete(entry: HistoryEntry) {
        await DISCARD_BY_TYPE[entry.type](entry.id);
        setPendingDelete(null);
        load();
    }

    return (
        <div className="page">
            <h1 className="page__title">Game History</h1>

            {error && <div className="form-error">{error}</div>}

            {entries === null ? (
                <p className="form-help">Loading...</p>
            ) : entries.length === 0 ? (
                <p className="form-help">No games recorded yet.</p>
            ) : (
                <table className="stats-table history-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Players</th>
                            <th>Winner</th>
                            <th>Started</th>
                            <th>Finished</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(entry => (
                            <tr
                                key={`${entry.type}-${entry.id}`}
                                className="history-table__row"
                                onClick={() => navigate(`/history/${entry.type}/${entry.id}`)}
                            >
                                <td>
                                    <Link className="history-table__link" to={`/history/${entry.type}/${entry.id}`} onClick={e => e.stopPropagation()}>
                                        {entry.label}
                                    </Link>
                                </td>
                                <td>{entry.players}</td>
                                <td>{entry.winner}</td>
                                <td>{formatTime(entry.created_at)}</td>
                                <td>{formatTime(entry.finished_at)}</td>
                                <td className="history-table__actions">
                                    <button
                                        className="icon-btn"
                                        aria-label="Delete game"
                                        onClick={e => { e.stopPropagation(); setPendingDelete(entry); }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                                        </svg>
                                    </button>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="history-table__chevron" aria-hidden="true">
                                        <path d="M9 6l6 6-6 6" />
                                    </svg>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {pendingDelete && (
                <ConfirmDeleteModal
                    title="Delete game"
                    body={`Permanently delete this ${pendingDelete.label} game? This can't be undone.`}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={() => handleDelete(pendingDelete)}
                />
            )}
        </div>
    );
}
