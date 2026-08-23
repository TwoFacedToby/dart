import { useState } from "react";
import { PlayerPicker } from "../../components/game-setup/PlayerPicker";
import { createX01Game, type X01GameState } from "../../api";

import "./X01Setup.css";

interface X01SetupProps {
    onGameCreated: (game: X01GameState) => void;
    onBack?: () => void;
}

const OPTIONS: Array<101 | 301 | 501> = [101, 301, 501];

export function X01Setup({ onGameCreated, onBack }: X01SetupProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [startingScore, setStartingScore] = useState<101 | 301 | 501>(301);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleStart() {
        if (selectedIds.length === 0) return;
        setStarting(true);
        setError(null);
        try {
            const game = await createX01Game(selectedIds, startingScore);
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
            <h1 className="page__title">Start a countdown game</h1>

            {error && <div className="form-error">{error}</div>}

            <div className="x01-setup__score-picker">
                {OPTIONS.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        className={`chip${startingScore === opt ? " chip--selected" : ""}`}
                        onClick={() => setStartingScore(opt)}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            <PlayerPicker selectedIds={selectedIds} onChange={setSelectedIds} />

            <button
                className="btn btn-primary setup-start-btn"
                onClick={handleStart}
                disabled={starting || selectedIds.length === 0}
            >
                {starting ? "Starting..." : `Start ${startingScore} (${selectedIds.length} players)`}
            </button>
        </div>
    );
}
