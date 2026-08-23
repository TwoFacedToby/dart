import { useState } from "react";
import { recordX01Turn, reorderX01, undoX01, discardX01Game, type X01GameState } from "../../api";
import { X01InputPanel } from "./X01InputPanel";
import { DiscardGameButton } from "../../components/discard-game/DiscardGameButton";

import "./X01GamePlay.css";

interface X01GamePlayProps {
    game: X01GameState;
    onGameChange: (game: X01GameState) => void;
    onGameEnded: () => void;
}

export function X01GamePlay({ game, onGameChange, onGameEnded }: X01GamePlayProps) {
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(score: number) {
        setSubmitting(true);
        setError(null);
        try {
            onGameChange(await recordX01Turn(game.id, score));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to record turn");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleMove(participantId: string, direction: "up" | "down") {
        const order = [...game.participants].sort((a, b) => a.turn_order - b.turn_order).map(p => p.id);
        const idx = order.indexOf(participantId);
        const swapWith = direction === "up" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= order.length) return;
        [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
        try {
            onGameChange(await reorderX01(game.id, order));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to reorder");
        }
    }

    async function handleUndo() {
        setError(null);
        try {
            onGameChange(await undoX01(game.id));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Nothing to undo");
        }
    }

    const orderedParticipants = [...game.participants].sort((a, b) => a.turn_order - b.turn_order);

    return (
        <div className="page">
            <div className="x01-game-play__header">
                <h1 className="page__title">{game.starting_score}</h1>
                <div className="x01-game-play__header-actions">
                    <button className="btn btn-secondary" onClick={handleUndo}>Undo last</button>
                    <DiscardGameButton onDiscard={() => discardX01Game(game.id).then(onGameEnded)} />
                </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {game.status === "finished" ? (
                <div className="game-banner game-banner--success">
                    Game over, winner: {game.participants.find(p => p.player.id === game.winner_id)?.player.name ?? "-"}
                    <button className="btn btn-primary" onClick={onGameEnded}>Start a new game</button>
                </div>
            ) : (
                <X01InputPanel game={game} onSubmit={handleSubmit} disabled={submitting} />
            )}

            <h2 className="section-subtitle">Order</h2>
            <ul className="x01-game-play__list">
                {orderedParticipants.map((p, idx) => (
                    <li key={p.id} className={`x01-game-play__item${p.id === game.current_participant_id ? " x01-game-play__item--current" : ""}`}>
                        <span className="x01-game-play__name">{p.player.initials} {p.player.name}</span>
                        <span className="x01-game-play__remaining">{p.remaining_score}</span>
                        <span className="x01-game-play__controls">
                            <button className="btn btn-secondary" disabled={idx === 0} onClick={() => handleMove(p.id, "up")}>▲</button>
                            <button className="btn btn-secondary" disabled={idx === orderedParticipants.length - 1} onClick={() => handleMove(p.id, "down")}>▼</button>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
