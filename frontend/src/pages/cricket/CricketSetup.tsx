import { useState } from "react";
import { PlayerPicker } from "../../components/game-setup/PlayerPicker";
import { createCricketGame, type CricketGameState } from "../../api";

interface CricketSetupProps {
    onGameCreated: (game: CricketGameState) => void;
    onBack?: () => void;
}

export function CricketSetup({ onGameCreated, onBack }: CricketSetupProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleStart() {
        if (selectedIds.length === 0) return;
        setStarting(true);
        setError(null);
        try {
            const game = await createCricketGame(selectedIds);
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
            <h1 className="page__title">Cricket, start today's game</h1>
            <p className="form-help">
                Pick who's playing, in the order you want them to throw first. You can change order once the game starts.
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
