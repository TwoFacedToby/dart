import { useState } from "react";
import { throwAtwDart, swapAtwOrder, undoAtw, discardAtwGame, type AtwGameState } from "../../api";
import { AtwBoard } from "./AtwBoard";
import { AtwTurnStatus } from "./AtwTurnStatus";
import { AtwActionBar } from "./AtwActionBar";
import { AtwFinalePanel } from "./AtwFinalePanel";
import { AtwAddPlayer } from "./AtwAddPlayer";
import { SettingsMenu } from "../../components/game-controls/SettingsMenu";
import { UndoButton } from "../../components/game-controls/UndoButton";

import "./AtwGamePlay.css";

interface AtwGamePlayProps {
    game: AtwGameState;
    onGameChange: (game: AtwGameState) => void;
    onGameEnded: () => void;
}

export function AtwGamePlay({ game, onGameChange, onGameEnded }: AtwGamePlayProps) {
    const [error, setError] = useState<string | null>(null);
    const [throwing, setThrowing] = useState(false);

    async function handleThrow(result: "miss" | "single" | "double" | "triple") {
        setThrowing(true);
        setError(null);
        try {
            onGameChange(await throwAtwDart(game.id, result));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to record throw");
        } finally {
            setThrowing(false);
        }
    }

    async function handleMove(participantId: string, direction: "up" | "down") {
        try {
            onGameChange(await swapAtwOrder(game.id, participantId, direction));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to reorder");
        }
    }

    async function handleUndo() {
        setError(null);
        try {
            onGameChange(await undoAtw(game.id));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Nothing to undo");
        }
    }

    const canReorder = game.phase === "normal" || game.phase === "ending";
    const orderedParticipants = [...game.participants].sort((a, b) => a.turn_order - b.turn_order);
    const orderItems = orderedParticipants.map(p => ({
        id: p.id,
        label: p.player.initials,
        locked: p.id === game.current_participant_id || p.finished,
    }));

    return (
        <div className="page atw-game-play">
            <div className="atw-game-play__header">
                <h1 className="page__title">Around the World</h1>
                <div className="atw-game-play__header-actions">
                    {game.phase === "normal" && <AtwAddPlayer game={game} onAdded={onGameChange} />}
                    <UndoButton onUndo={handleUndo} />
                    <SettingsMenu
                        orderItems={canReorder ? orderItems : undefined}
                        onMove={canReorder ? handleMove : undefined}
                        onDiscard={() => discardAtwGame(game.id).then(onGameEnded)}
                    />
                </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {game.phase === "ending" && (
                <div className="game-banner">
                    Someone finished, everyone still in this round gets their turn.
                </div>
            )}

            {game.phase === "finished" && (
                <div className="game-banner game-banner--success">
                    Game over, winner: {game.participants.find(p => p.player.id === game.winner_id)?.player.initials ?? "-"}
                    <button className="btn btn-primary" onClick={onGameEnded}>Start a new game</button>
                </div>
            )}

            <AtwBoard game={game} />

            {game.phase === "finale" && (
                <AtwFinalePanel game={game} onScoreRecorded={onGameChange} />
            )}

            {(game.phase === "normal" || game.phase === "ending") && (
                <>
                    <AtwTurnStatus game={game} />
                    <AtwActionBar onThrow={handleThrow} disabled={throwing} />
                </>
            )}
        </div>
    );
}
