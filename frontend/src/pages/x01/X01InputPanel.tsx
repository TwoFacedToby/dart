import { useState, type KeyboardEvent } from "react";
import type { X01GameState } from "../../api";

import "./X01InputPanel.css";

interface X01InputPanelProps {
    game: X01GameState;
    onSubmit: (score: number) => void;
    disabled: boolean;
}

// A direct single-dart double checkout only exists for even remaining
// scores from 2 to 40, or exactly 50 (bullseye). Anything else needs a
// combination of darts first, so nothing is shown.
function checkoutSuggestion(remaining: number): string | null {
    if (remaining === 50) return "Bullseye";
    if (remaining > 0 && remaining <= 40 && remaining % 2 === 0) return `Double ${remaining / 2}`;
    return null;
}

export function X01InputPanel({ game, onSubmit, disabled }: X01InputPanelProps) {
    const [value, setValue] = useState("");
    const current = game.participants.find(p => p.id === game.current_participant_id);
    if (!current) return null;

    const checkout = checkoutSuggestion(current.remaining_score);

    function submit() {
        const score = Number(value);
        if (!Number.isFinite(score) || score < 0 || score > 180) return;
        onSubmit(score);
        setValue("");
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") submit();
    }

    return (
        <div className="x01-input">
            <div className="x01-input__who">
                <span className="x01-input__initials">{current.player.initials}</span>
                <span className="x01-input__remaining">{current.remaining_score} left</span>
            </div>

            {checkout && (
                <div className="x01-input__checkout">Checkout: {checkout}</div>
            )}

            <div className="x01-input__entry">
                <input
                    className="form-input x01-input__field"
                    type="number"
                    min={0}
                    max={180}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Turn score"
                    autoFocus
                />
                <button
                    className="btn btn-primary"
                    disabled={disabled || value === "" || Number(value) < 0 || Number(value) > 180}
                    onClick={submit}
                >
                    Submit
                </button>
            </div>
        </div>
    );
}
