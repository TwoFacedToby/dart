import { useState } from "react";
import { GameOrderList } from "./GameOrderList";

import "./SettingsMenu.css";

interface SettingsMenuOrderItem {
    id: string;
    label: string;
    locked?: boolean;
}

interface SettingsMenuProps {
    orderItems?: SettingsMenuOrderItem[];
    onMove?: (id: string, direction: "up" | "down") => Promise<void>;
    onDiscard: () => Promise<void>;
}

// Gear button that opens a small popover holding everything that used to
// sit permanently in the header: turn-order dragging and discarding the
// game. Both are rare, deliberate actions, so they're tucked away instead
// of competing with the scorecard for attention.
export function SettingsMenu({ orderItems, onMove, onDiscard }: SettingsMenuProps) {
    const [open, setOpen] = useState(false);
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function close() {
        setOpen(false);
        setConfirmingDiscard(false);
        setError(null);
    }

    async function handleConfirmDiscard() {
        setDiscarding(true);
        setError(null);
        try {
            await onDiscard();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to discard game");
        } finally {
            setDiscarding(false);
        }
    }

    return (
        <div className="settings-menu">
            <button
                type="button"
                className="icon-btn"
                onClick={() => (open ? close() : setOpen(true))}
                aria-label="Game settings"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="settings-menu__backdrop" onClick={close} />
                    <div className="settings-menu__popover">
                        {orderItems && onMove && (
                            <>
                                <div className="settings-menu__section-title">Turn order</div>
                                <GameOrderList items={orderItems} onMove={onMove} />
                            </>
                        )}

                        {error && <div className="form-error">{error}</div>}

                        <div className="settings-menu__discard">
                            {confirmingDiscard ? (
                                <div className="settings-menu__discard-confirm">
                                    <span className="settings-menu__discard-text">Discard this game permanently?</span>
                                    <div className="settings-menu__discard-actions">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setConfirmingDiscard(false)}
                                            disabled={discarding}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            onClick={handleConfirmDiscard}
                                            disabled={discarding}
                                        >
                                            {discarding ? "Discarding..." : "Discard"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-danger settings-menu__discard-trigger"
                                    onClick={() => setConfirmingDiscard(true)}
                                >
                                    Discard game
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
