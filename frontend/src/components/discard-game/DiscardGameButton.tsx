import { useState } from "react";
import { Modal } from "../modal/Modal";

import "./DiscardGameButton.css";

interface DiscardGameButtonProps {
    onDiscard: () => Promise<void>;
}

// Confirms, then permanently deletes the current game and every shot
// recorded for it. Shared by AtwGamePlay, CricketGamePlay and X01GamePlay
// so the confirmation flow is identical regardless of game type.
export function DiscardGameButton({ onDiscard }: DiscardGameButtonProps) {
    const [confirming, setConfirming] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleConfirm() {
        setDiscarding(true);
        setError(null);
        try {
            await onDiscard();
            setConfirming(false);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to discard game");
        } finally {
            setDiscarding(false);
        }
    }

    return (
        <>
            <button className="btn btn-danger" onClick={() => setConfirming(true)}>Discard game</button>

            {confirming && (
                <Modal title="Discard this game?" onClose={() => setConfirming(false)}>
                    <p className="form-help">
                        This permanently deletes the game and every shot recorded for it. This can't be undone.
                    </p>

                    {error && <div className="form-error">{error}</div>}

                    <div className="discard-game-button__actions">
                        <button className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={discarding}>
                            Cancel
                        </button>
                        <button className="btn btn-danger" onClick={handleConfirm} disabled={discarding}>
                            {discarding ? "Discarding..." : "Discard game"}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}
