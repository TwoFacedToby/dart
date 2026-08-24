import { useState } from "react";
import { throwCricketDart, reorderCricket, undoCricket, discardCricketGame, type CricketGameState, type CricketTarget, type CricketHitType } from "../../api";
import { CricketBoard } from "./CricketBoard";
import { CricketInputPanel } from "./CricketInputPanel";
import { SettingsMenu } from "../../components/game-controls/SettingsMenu";
import { UndoButton } from "../../components/game-controls/UndoButton";

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

    const orderedParticipants = [...game.participants].sort((a, b) => a.turn_order - b.turn_order);
    const orderItems = orderedParticipants.map(p => ({
        id: p.id,
        label: p.player.initials,
        locked: p.id === game.current_participant_id,
    }));
    const canReorder = game.status !== "finished";

    return (
        <div className="page">
            <div className="cricket-game-play__header">
                <h1 className="page__title">Cricket</h1>
                <div className="cricket-game-play__header-actions">
                    <UndoButton onUndo={handleUndo} />
                    <SettingsMenu
                        orderItems={canReorder ? orderItems : undefined}
                        onMove={canReorder ? handleMove : undefined}
                        onDiscard={() => discardCricketGame(game.id).then(onGameEnded)}
                    />
                </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {game.status === "finished" && (
                <div className="game-banner game-banner--success">
                    Winner: {game.participants.find(p => p.player.id === game.winner_id)?.player.initials ?? "-"},
                    2nd: {game.participants.find(p => p.player.id === game.second_place_id)?.player.initials ?? "-"}
                    <button className="btn btn-primary" onClick={onGameEnded}>Start a new game</button>
                </div>
            )}

            {game.status !== "finished" && game.participants.some(p => p.finish_order === 1) && (
                <div className="game-banner">
                    {game.participants.find(p => p.finish_order === 1)?.player.initials} closed out first. Still playing for 2nd.
                </div>
            )}

            <div className="cricket-game-play__layout">
                {game.status !== "finished" && (
                    <CricketInputPanel game={game} onThrow={handleThrow} disabled={throwing} />
                )}

                <div className="cricket-game-play__board">
                    <CricketBoard game={game} />
                </div>
            </div>
        </div>
    );
}
