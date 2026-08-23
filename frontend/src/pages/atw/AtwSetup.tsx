import { useState } from "react";
import { PlayerPicker } from "../../components/game-setup/PlayerPicker";
import { createAtwGame, type AtwGameState } from "../../api";

interface AtwSetupProps {
    onGameCreated: (game: AtwGameState) => void;
    onBack?: () => void;
}

export function AtwSetup({ onGameCreated, onBack }: AtwSetupProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleStart() {
        if (selectedIds.length === 0) return;
        setStarting(true);
        setError(null);
        try {
            const game = await createAtwGame(selectedIds);
            onGameCreated(game);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to start game");
        } finally {
            setStarting(false);
        }
    }

    return (
        <div className="page">
            {onBack && <button className="btn btn-secondary setup-back-btn" onClick={onBack}>Back</button>}
            <h1 className="page__title">Around the World, start today's game</h1>
            <p className="form-help">
                Pick who's playing. Order is carried over from the last finished game (best player
                first); anyone new gets added at a random spot. You can still reorder manually once
                the game starts.
            </p>

            {error && <div className="form-error">{error}</div>}

            <PlayerPicker selectedIds={selectedIds} onChange={setSelectedIds} />

            <button
                className="btn btn-primary setup-start-btn"
                onClick={handleStart}
                disabled={starting || selectedIds.length === 0}
            >
                {starting ? "Starting..." : `Start game (${selectedIds.length} players)`}
            </button>
        </div>
    );
}
