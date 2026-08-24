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

// Lets a turn be entered as "38+19+3" instead of doing the addition by
// hand. Splits on "+", requires every term to be a plain non-negative
// whole number, and sums them -- a single plain number (no "+" at all)
// works the same way it always did.
function evaluateEntry(raw: string): number | null {
    const terms = raw.split("+").map(t => t.trim());
    if (terms.some(t => t === "")) return null;

    let total = 0;
    for (const term of terms) {
        if (!/^\d+$/.test(term)) return null;
        total += Number(term);
    }
    return total;
}

export function X01InputPanel({ game, onSubmit, disabled }: X01InputPanelProps) {
    const [value, setValue] = useState("");
    const current = game.participants.find(p => p.id === game.current_participant_id);
    if (!current) return null;

    const checkout = checkoutSuggestion(current.remaining_score);
    const evaluated = evaluateEntry(value);
    const valid = evaluated !== null && evaluated >= 0 && evaluated <= 180;

    function submit() {
        if (evaluated === null || evaluated < 0 || evaluated > 180) return;
        onSubmit(evaluated);
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
                    type="text"
                    inputMode="numeric"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Turn score, e.g. 38+19+3"
                    autoFocus
                />
                <button
                    className="btn btn-primary x01-input__submit"
                    disabled={disabled || value === "" || !valid}
                    onClick={submit}
                >
                    {evaluated !== null && value.includes("+") ? `Submit (${evaluated})` : "Submit"}
                </button>
            </div>
        </div>
    );
}
