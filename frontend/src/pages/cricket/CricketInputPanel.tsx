import type { CricketGameState, CricketTarget, CricketHitType } from "../../api";

import "./CricketInputPanel.css";

interface CricketInputPanelProps {
    game: CricketGameState;
    onThrow: (target: CricketTarget, hitType: CricketHitType) => void;
    disabled: boolean;
}

const NUMBERS: CricketTarget[] = ["20", "19", "18", "17", "16", "15"];

export function CricketInputPanel({ game, onThrow, disabled }: CricketInputPanelProps) {
    const current = game.participants.find(p => p.id === game.current_participant_id);
    if (!current) return null;

    return (
        <div className="cricket-input">
            <div className="cricket-input__who">
                <span className="cricket-input__initials">{current.player.initials}</span>
                <span className="cricket-input__name">{current.player.name}'s turn</span>
            </div>

            <div className="cricket-input__arrow">
                Arrow <span className="cricket-input__arrow-num">{game.turn_dart_count + 1}</span> of 3
            </div>

            <div className="cricket-input__column">
                {NUMBERS.map(n => (
                    <div key={n} className="cricket-input__number-row">
                        <span className="cricket-input__number-label">{n}</span>
                        <button className="btn cricket-input__btn" disabled={disabled} onClick={() => onThrow(n, "single")}>S</button>
                        <button className="btn cricket-input__btn" disabled={disabled} onClick={() => onThrow(n, "double")}>D</button>
                        <button className="btn cricket-input__btn" disabled={disabled} onClick={() => onThrow(n, "triple")}>T</button>
                    </div>
                ))}
                <div className="cricket-input__number-row">
                    <span className="cricket-input__number-label">Bull</span>
                    <button className="btn cricket-input__btn cricket-input__btn--wide" disabled={disabled} onClick={() => onThrow("bull", "ring")}>Ring</button>
                    <button className="btn cricket-input__btn cricket-input__btn--wide" disabled={disabled} onClick={() => onThrow("bull", "eye")}>Eye</button>
                </div>

                <button
                    className="btn cricket-input__miss"
                    disabled={disabled}
                    onClick={() => onThrow("15", "miss")}
                >
                    Missed
                </button>
            </div>
        </div>
    );
}
