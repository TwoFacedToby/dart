import "./AtwActionBar.css";

interface AtwActionBarProps {
    onThrow: (result: "miss" | "single" | "double" | "triple") => void;
    disabled: boolean;
}

// Sticks to the bottom of the screen, so the person at the board never
// needs to scroll to log a dart.
export function AtwActionBar({ onThrow, disabled }: AtwActionBarProps) {
    return (
        <div className="atw-action-bar">
            <button className="btn atw-action-bar__btn atw-action-bar__btn--hit" disabled={disabled} onClick={() => onThrow("single")}>Hit</button>
            <button className="btn atw-action-bar__btn atw-action-bar__btn--hit" disabled={disabled} onClick={() => onThrow("double")}>Hit Double</button>
            <button className="btn atw-action-bar__btn atw-action-bar__btn--hit" disabled={disabled} onClick={() => onThrow("triple")}>Hit Triple</button>
            <button className="btn atw-action-bar__btn atw-action-bar__btn--miss" disabled={disabled} onClick={() => onThrow("miss")}>Missed</button>
        </div>
    );
}
