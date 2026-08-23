import { useState } from "react";
import type { AtwGameState } from "../../api";
import { recordAtwFinaleScore } from "../../api";

import "./AtwFinalePanel.css";

interface AtwFinalePanelProps {
    game: AtwGameState;
    onScoreRecorded: (game: AtwGameState) => void;
}

// Two or more players finished in the same round: point-based finale, one
// arrow per person per round, three rounds (extra rounds are added
// automatically by the backend if it's still tied after three).
export function AtwFinalePanel({ game, onScoreRecorded }: AtwFinalePanelProps) {
    const finalists = game.participants.filter(p => game.finishers.includes(p.id));
    const scoresByPlayer = new Map<string, number[]>();
    for (const f of finalists) scoresByPlayer.set(f.player.id, []);
    for (const s of game.finale_scores) {
        scoresByPlayer.get(s.player_id)?.push(s.score);
    }

    const round = 1 + Math.min(...finalists.map(f => scoresByPlayer.get(f.player.id)?.length ?? 0));

    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function submit(playerId: string) {
        const value = Number(inputs[playerId]);
        if (!Number.isFinite(value) || value < 0) return;
        setSubmitting(playerId);
        setError(null);
        try {
            const updated = await recordAtwFinaleScore(game.id, playerId, round, value);
            onScoreRecorded(updated);
            setInputs(prev => ({ ...prev, [playerId]: "" }));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to record score");
        } finally {
            setSubmitting(null);
        }
    }

    return (
        <div className="atw-finale">
            <h2 className="atw-finale__title">Finale, round {round}</h2>
            <p className="form-help">One arrow each, highest total after three rounds wins.</p>

            {error && <div className="form-error">{error}</div>}

            <table className="atw-finale__table">
                <thead>
                    <tr>
                        <th>Player</th>
                        {[1, 2, 3].map(r => <th key={r}>R{r}</th>)}
                        <th>Total</th>
                        <th>Enter score</th>
                    </tr>
                </thead>
                <tbody>
                    {finalists.map(f => {
                        const scores = scoresByPlayer.get(f.player.id) ?? [];
                        const hasThisRound = scores.length >= round;
                        return (
                            <tr key={f.id}>
                                <td>{f.player.initials}</td>
                                {[0, 1, 2].map(i => <td key={i}>{scores[i] ?? "-"}</td>)}
                                <td>{scores.reduce((a, b) => a + b, 0)}</td>
                                <td>
                                    {hasThisRound ? (
                                        <span className="form-help">recorded</span>
                                    ) : (
                                        <div className="atw-finale__input-row">
                                            <input
                                                className="form-input atw-finale__input"
                                                type="number"
                                                min={0}
                                                value={inputs[f.player.id] ?? ""}
                                                onChange={e => setInputs(prev => ({ ...prev, [f.player.id]: e.target.value }))}
                                            />
                                            <button
                                                className="btn btn-primary"
                                                disabled={submitting === f.player.id || inputs[f.player.id] === undefined || inputs[f.player.id] === ""}
                                                onClick={() => submit(f.player.id)}
                                            >
                                                Submit
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
