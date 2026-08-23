import type { AtwGameState, AtwParticipant } from "../../api";

import "./AtwParticipantList.css";

interface AtwParticipantListProps {
    game: AtwGameState;
    onSwap?: (participantId: string, direction: "up" | "down") => void;
}

// Shows every participant in a stable order (their persisted turn_order),
// which only ever changes through an explicit swap here -- never
// automatically as turns are taken. Whoever's turn it is gets highlighted
// instead of being moved to the top, so the rows don't shuffle mid-game.
export function AtwParticipantList({ game, onSwap }: AtwParticipantListProps) {
    const ordered = [...game.participants].sort((a, b) => a.turn_order - b.turn_order);

    // A swap is only allowed between two participants who are both still
    // waiting for a turn this game -- not the one currently up (mid-turn)
    // and not anyone who's already finished. This is what stops an
    // accidental reorder from handing someone an extra go or overwriting
    // whoever the input is actually meant for.
    const eligible = (p: AtwParticipant) => p.id !== game.current_participant_id && !p.finished;

    return (
        <ul className="atw-participant-list">
            {ordered.map((p, idx) => {
                const isCurrent = p.id === game.current_participant_id;
                const prev = ordered[idx - 1];
                const next = ordered[idx + 1];
                const canMoveUp = !!onSwap && eligible(p) && !!prev && eligible(prev);
                const canMoveDown = !!onSwap && eligible(p) && !!next && eligible(next);

                return (
                    <li
                        key={p.id}
                        className={`atw-participant-list__item${isCurrent ? " atw-participant-list__item--current" : ""}${p.finished ? " atw-participant-list__item--finished" : ""}`}
                    >
                        <span className="atw-participant-list__initials">{p.player.initials}</span>
                        <span className="atw-participant-list__name">{p.player.name}</span>
                        <span className="atw-participant-list__number">{p.current_number}</span>

                        {p.behind_by >= 5 && !p.finished && !p.catching_up && (
                            <span className="atw-participant-list__badge atw-participant-list__badge--catchup">catch-up</span>
                        )}
                        {p.catching_up && (
                            <span className="atw-participant-list__badge atw-participant-list__badge--joining">
                                joining, target {p.catchup_target}
                            </span>
                        )}
                        {p.finished && (
                            <span className="atw-participant-list__badge atw-participant-list__badge--finished">
                                finished{p.finish_order ? ` #${p.finish_order}` : ""}
                            </span>
                        )}

                        {onSwap && (
                            <span className="atw-participant-list__move">
                                <button
                                    type="button"
                                    className="atw-participant-list__move-btn"
                                    disabled={!canMoveUp}
                                    onClick={() => onSwap(p.id, "up")}
                                    aria-label="Move earlier in turn order"
                                >
                                    ▲
                                </button>
                                <button
                                    type="button"
                                    className="atw-participant-list__move-btn"
                                    disabled={!canMoveDown}
                                    onClick={() => onSwap(p.id, "down")}
                                    aria-label="Move later in turn order"
                                >
                                    ▼
                                </button>
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}