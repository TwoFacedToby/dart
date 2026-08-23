import type { AtwGameState } from "../../api";

import "./AtwTurnStatus.css";

interface AtwTurnStatusProps {
    game: AtwGameState;
}

const RESULT_LABEL: Record<string, string> = {
    miss: "Miss",
    single: "Hit",
    double: "Hit Double",
    triple: "Hit Triple",
};

// Who's up, which arrow they're on, and a look at every arrow thrown this
// turn so far, not just the resulting number.
export function AtwTurnStatus({ game }: AtwTurnStatusProps) {
    const current = game.participants.find(p => p.id === game.current_participant_id);
    const turn = game.current_turn;
    if (!current || !turn) return null;

    const arrowNumber = turn.throws.length + 1;

    return (
        <div className="atw-turn-status">
            <div className="atw-turn-status__who">
                <span className="atw-turn-status__initials">{current.player.initials}</span>
                <span className="atw-turn-status__name">{current.player.name}</span>
                <span className="atw-turn-status__target">aiming for {current.current_number}</span>
            </div>

            <div className="atw-turn-status__arrow">
                Arrow <span className="atw-turn-status__arrow-num">{arrowNumber}</span>
                {!turn.in_bonus && <span> of 3</span>}
            </div>

            {turn.catchup_active && (
                <div className="atw-turn-status__tag atw-turn-status__tag--catchup">Catch-up turn, doubles and triples count in full</div>
            )}
            {turn.in_bonus && (
                <div className="atw-turn-status__tag atw-turn-status__tag--bonus">Bonus dart, keep going until you miss</div>
            )}
            {current.catching_up && (
                <div className="atw-turn-status__tag atw-turn-status__tag--catchup">
                    Catching up, {current.catchup_target} turn{current.catchup_target === 1 ? "" : "s"} total before joining normal rotation
                </div>
            )}

            {turn.throws.length > 0 && (
                <div className="atw-turn-status__arrows">
                    {turn.throws.map(t => (
                        <span
                            key={t.dart_index}
                            className={`atw-turn-status__arrow-chip${t.result === "miss" ? " atw-turn-status__arrow-chip--miss" : " atw-turn-status__arrow-chip--hit"}`}
                        >
                            {RESULT_LABEL[t.result]}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
