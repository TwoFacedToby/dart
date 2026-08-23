import type { AtwGameState } from "../../api";
import { AtwBoard } from "./AtwBoard";

import "./AtwGameDisplay.css";

interface AtwGameDisplayProps {
    game: AtwGameState;
}

export function AtwGameDisplay({ game }: AtwGameDisplayProps) {
    const finalists = game.finishers.map(id => game.participants.find(p => p.id === id)).filter(Boolean);

    return (
        <div className="game-viewer game-viewer--scrollable">
            <h1 className="game-viewer__title">Around the World</h1>

            {game.phase === "ending" && (
                <div className="game-banner game-banner--large">Someone finished! Final turns for the rest of the round</div>
            )}
            {game.phase === "finale" && (
                <div className="game-banner game-banner--large">
                    Finale between {finalists.map(f => f!.player.initials).join(" and ")}
                </div>
            )}
            {game.phase === "finished" && (
                <div className="game-banner game-banner--success game-banner--large">
                    {game.participants.find(p => p.player.id === game.winner_id)?.player.initials ?? "-"} wins!
                </div>
            )}

            {(game.phase === "normal" || game.phase === "ending") && game.current_turn?.catchup_active && (
                <div className="atw-game-display__catchup-banner">CATCH-UP TURN</div>
            )}

            <AtwBoard game={game} big />

            {game.phase === "finale" && (
                <table className="atw-game-display__finale-table">
                    <thead>
                    <tr>
                        <th>Player</th>
                        {[1, 2, 3].map(r => <th key={r}>R{r}</th>)}
                        <th>Total</th>
                    </tr>
                    </thead>
                    <tbody>
                    {finalists.map(f => {
                        const scores = game.finale_scores.filter(s => s.player_id === f!.player.id);
                        return (
                            <tr key={f!.id}>
                                <td>{f!.player.initials}</td>
                                {[1, 2, 3].map(r => <td key={r}>{scores.find(s => s.round === r)?.score ?? "-"}</td>)}
                                <td>{scores.reduce((a, s) => a + s.score, 0)}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
