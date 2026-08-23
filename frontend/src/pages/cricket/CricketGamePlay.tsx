import { useState } from "react";
import { throwCricketDart, reorderCricket, undoCricket, discardCricketGame, type CricketGameState, type CricketTarget, type CricketHitType } from "../../api";
import { CricketBoard } from "./CricketBoard";
import { CricketInputPanel } from "./CricketInputPanel";
import { DiscardGameButton } from "../../components/discard-game/DiscardGameButton";

import "./CricketGamePlay.css";

interface CricketGamePlayProps {
    game: CricketGameState;
    onGameChange: (game: CricketGameState) => void;
    onGameEnded: () => void;
}

export function CricketGamePlay({ game, onGameChange, onGameEnded }: CricketGamePlayProps) {
    const [error, setError] = useState<string | null>(null);
    const [throwing, setThrowing] = useState(false);

    async function handleThrow(target: CricketTarget, hitType: CricketHitType) {
        setThrowing(true);
        setError(null);
        try {
            onGameChange(await throwCricketDart(game.id, target, hitType));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to record throw");
        } finally {
            setThrowing(false);
        }
    }

    async function handleMove(participantId: string, direction: "up" | "down") {
        const order = [...game.participants].sort((a, b) => a.turn_order - b.turn_order).map(p => p.id);
        const idx = order.indexOf(participantId);
        const swapWith = direction === "up" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= order.length) return;
        [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
        try {
            onGameChange(await reorderCricket(game.id, order));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to reorder");
        }
    }

    async function handleUndo() {
        setError(null);
        try {
            onGameChange(await undoCricket(game.id));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Nothing to undo");
        }
    }

    return (
        <div className="page">
            <div className="cricket-game-play__header">
                <h1 className="page__title">Cricket</h1>
                <div className="cricket-game-play__header-actions">
                    <button className="btn btn-secondary" onClick={handleUndo}>Undo last</button>
                    <DiscardGameButton onDiscard={() => discardCricketGame(game.id).then(onGameEnded)} />
                </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {game.status === "finished" && (
                <div className="game-banner game-banner--success">
                    Game over, winner: {game.participants.find(p => p.player.id === game.winner_id)?.player.name ?? "-"}
                    <button className="btn btn-primary" onClick={onGameEnded}>Start a new game</button>
                </div>
            )}

            <div className="cricket-game-play__layout">
                {game.status !== "finished" && (
                    <CricketInputPanel game={game} onThrow={handleThrow} disabled={throwing} />
                )}

                <div className="cricket-game-play__board">
                    <CricketBoard game={game} onMove={game.status !== "finished" ? handleMove : undefined} />
                </div>
            </div>
        </div>
    );
}
