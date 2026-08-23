import type { X01GameState } from "../../api";

import "./X01GameDisplay.css";

interface X01GameDisplayProps {
    game: X01GameState;
}

export function X01GameDisplay({ game }: X01GameDisplayProps) {
    return (
        <div className="game-viewer">
            <h1 className="game-viewer__title">{game.starting_score}</h1>

            {game.status === "finished" && (
                <div className="game-banner game-banner--success game-banner--large">
                    {game.participants.find(p => p.player.id === game.winner_id)?.player.initials ?? "-"} wins!
                </div>
            )}

            <div className="x01-game-display__board">
                {[...game.participants].sort((a, b) => a.turn_order - b.turn_order).map(p => (
                    <div
                        key={p.id}
                        className={`x01-game-display__row${p.id === game.current_participant_id ? " x01-game-display__row--current" : ""}`}
                    >
                        <span className="x01-game-display__name">{p.player.initials}</span>
                        <span className="x01-game-display__remaining">{p.remaining_score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
