import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import type { AtwGameState, AtwHistoryThrow } from "../../api";

import "./AtwBoard.css";

interface AtwBoardProps {
    game: AtwGameState;
    big?: boolean;
}

// Shared scorecard grid used by both the editor and viewer. Players run
// across the columns, rounds down the rows -- this doubles as the turn
// order display, since the column position already reflects it. Turn
// order itself is changed through the settings menu, not here.
export function AtwBoard({ game, big }: AtwBoardProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [game.history.length]);

    const columns = [...game.participants].sort((a, b) => a.turn_order - b.turn_order);
    const rows = buildScorecardRows(game.history);

    return (
        <div className={`atw-board${big ? " atw-board--big" : ""}`} ref={scrollRef}>
            <div className="atw-board__header" style={{ "--atw-columns": columns.length } as CSSProperties}>
                {columns.map(p => (
                    <div
                        key={p.id}
                        className={`atw-board__header-cell${p.id === game.current_participant_id ? " atw-board__header-cell--current" : ""}${p.finished ? " atw-board__header-cell--finished" : ""}`}
                    >
                        <span className="atw-board__player-name">
                            {p.player.initials}
                            {p.player.win_streak >= 2 && (
                                <sup className="atw-board__streak">{p.player.win_streak}</sup>
                            )}
                        </span>
                        <span className="atw-board__player-number">{p.current_number}</span>

                        {p.behind_by >= 5 && !p.finished && !p.catching_up && (
                            <span className="atw-board__badge atw-board__badge--catchup">catch-up</span>
                        )}
                        {p.catching_up && (
                            <span className="atw-board__badge atw-board__badge--joining">
                                joining, {p.catchup_target} turn{p.catchup_target === 1 ? "" : "s"} to catch up
                            </span>
                        )}
                        {p.finished && (
                            <span className="atw-board__badge atw-board__badge--finished">
                                finished{p.finish_order ? ` #${p.finish_order}` : ""}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {rows.map(row => (
                <div
                    key={row.round}
                    className="atw-board__row"
                    style={{ "--atw-columns": columns.length } as CSSProperties}
                >
                    {columns.map(col => {
                        const throws = row.cells.get(col.id);
                        return (
                            <div key={col.id} className="atw-board__cell">
                                {throws && (
                                    <div className="atw-board__badges">
                                        {throws.map(t => (
                                            <ArrowBadge key={t.dart_index} throwResult={t} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
            {rows.length === 0 && (
                <p className="atw-board__empty">No arrows thrown yet</p>
            )}
        </div>
    );
}

interface ScorecardRow {
    round: number;
    cells: Map<string, AtwHistoryThrow[]>;
}

// Rows are "round N" -- the Nth turn taken by each participant individually,
// not a shared chronological turn counter. Normally everyone advances one
// round per lap in lockstep, so this reads like a standard scorecard. A
// catching-up player who gets several turns in a row will fill in several
// of their own rounds in quick succession, visibly climbing to match
// everyone else's round number.
function buildScorecardRows(history: AtwHistoryThrow[]): ScorecardRow[] {
    const turnGroups = new Map<number, { participantId: string; throws: AtwHistoryThrow[] }>();
    for (const t of history) {
        let group = turnGroups.get(t.turn_index);
        if (!group) {
            group = { participantId: t.participant_id, throws: [] };
            turnGroups.set(t.turn_index, group);
        }
        group.throws.push(t);
    }
    const chronologicalTurns = [...turnGroups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, group]) => group);

    const roundByParticipant = new Map<string, number>();
    const rowsByRound = new Map<number, ScorecardRow>();
    for (const turn of chronologicalTurns) {
        const round = (roundByParticipant.get(turn.participantId) ?? 0) + 1;
        roundByParticipant.set(turn.participantId, round);

        let row = rowsByRound.get(round);
        if (!row) {
            row = { round, cells: new Map() };
            rowsByRound.set(round, row);
        }
        row.cells.set(turn.participantId, turn.throws);
    }

    return [...rowsByRound.values()].sort((a, b) => a.round - b.round);
}

function ArrowBadge({ throwResult }: { throwResult: AtwHistoryThrow }) {
    if (throwResult.result === "miss") {
        return <span className="atw-board__badge-arrow atw-board__badge-arrow--miss">-</span>;
    }
    const variant = throwResult.result === "single" ? "single" : throwResult.result === "double" ? "double" : "triple";
    return <span className={`atw-board__badge-arrow atw-board__badge-arrow--${variant}`}>{throwResult.target_number}</span>;
}
