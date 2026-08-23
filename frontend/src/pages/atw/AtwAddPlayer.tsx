import { useEffect, useState } from "react";
import { getPlayers, addAtwParticipant, type AtwGameState, type Player } from "../../api";
import { Modal } from "../../components/modal/Modal";

import "./AtwAddPlayer.css";

interface AtwAddPlayerProps {
    game: AtwGameState;
    onAdded: (game: AtwGameState) => void;
}

// Small "+" button above the scorecard, opens a popup listing players not
// already in the game.
export function AtwAddPlayer({ game, onAdded }: AtwAddPlayerProps) {
    const [open, setOpen] = useState(false);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [adding, setAdding] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) getPlayers().then(setAllPlayers);
    }, [open]);

    const inGame = new Set(game.participants.map(p => p.player.id));
    const available = allPlayers.filter(p => !inGame.has(p.id));

    async function handleAdd(playerId: string) {
        setAdding(playerId);
        setError(null);
        try {
            const updated = await addAtwParticipant(game.id, playerId);
            onAdded(updated);
            setOpen(false);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to add player");
        } finally {
            setAdding(null);
        }
    }

    return (
        <>
            <button className="atw-add-player-btn" onClick={() => setOpen(true)} aria-label="Add player">+</button>

            {open && (
                <Modal title="Add a player" onClose={() => setOpen(false)}>
                    {error && <div className="form-error">{error}</div>}
                    {available.length === 0 ? (
                        <p className="form-help">Everyone is already in this game.</p>
                    ) : (
                        <div className="atw-add-player-list">
                            {available.map(p => (
                                <button
                                    key={p.id}
                                    className="btn btn-secondary atw-add-player-list__item"
                                    disabled={adding === p.id}
                                    onClick={() => handleAdd(p.id)}
                                >
                                    <span className="atw-add-player-list__initials">{p.initials}</span>
                                    <span>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </Modal>
            )}
        </>
    );
}
