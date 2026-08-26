import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { AtwGameState, AtwParticipant } from "../../../api";

import "../NewView.css";
import "./NewAtwView.css";

interface NewAtwViewProps {
    game: AtwGameState;
}

interface NumberEntry {
    value: number;
    missCount: number; // rounds spent stuck on this number before it (eventually) advanced
}

interface PlayerProgress {
    passed: NumberEntry[]; // superseded numbers, in order, each shown once, crossed out
    active: NumberEntry; // the single live number they're now aiming for
    isWinning: boolean;
}

// Walks the participant's rounds in chronological order, collapsing any
// run of consecutive rounds that start and end on the same number (pure
// misses) into that number's own miss count, and only emitting a new
// entry when the target actually advances. A number's miss count is
// exactly "how many rounds were spent stuck on it" -- the round that
// finally advances away from it doesn't itself count as a stuck round,
// and the count travels with the number once it's crossed out rather
// than resetting.
function buildPlayerProgress(game: AtwGameState): Map<string, PlayerProgress> {
    const byParticipantTurn = new Map<string, Map<number, number>>(); // participantId -> turnIndex -> first dart's target_number
    for (const t of game.history) {
        if (t.dart_index !== 1) continue;
        let turns = byParticipantTurn.get(t.participant_id);
        if (!turns) {
            turns = new Map();
            byParticipantTurn.set(t.participant_id, turns);
        }
        if (!turns.has(t.turn_index)) turns.set(t.turn_index, t.target_number);
    }

    const result = new Map<string, PlayerProgress>();
    for (const p of game.participants) {
        const turns = byParticipantTurn.get(p.id);
        const starts = turns ? [...turns.entries()].sort((a, b) => a[0] - b[0]).map(([, target]) => target) : [];

        const passed: NumberEntry[] = [];
        let curValue = starts.length ? starts[0] : p.current_number;
        let curMiss = 0;

        for (let i = 0; i < starts.length; i++) {
            const roundEnd = i < starts.length - 1 ? starts[i + 1] : p.current_number;
            if (roundEnd === curValue) {
                curMiss += 1;
            } else {
                passed.push({ value: curValue, missCount: curMiss });
                curValue = roundEnd;
                curMiss = 0;
            }
        }

        result.set(p.id, { passed, active: { value: curValue, missCount: curMiss }, isWinning: p.finished });
    }
    return result;
}

interface NumberBadgeProps {
    value: number;
    missCount: number;
    variant: "past" | "target";
}

// Actual stacked tick-mark elements for the miss count, not a CSS
// box-shadow trick -- that approach couldn't produce thin lines with real
// gaps between them (a box-shadow's "thickness" tracks the element's own
// height, not a fixed pixel size), so extra misses just made one tall
// blob instead of distinct lines.
function NumberBadge({ value, missCount, variant }: NumberBadgeProps) {
    const ticks = Math.min(missCount, 4);
    return (
        <span className="new-atw-view__slot">
            <span className={`new-atw-view__num new-atw-view__num--${variant}`}>
                <span className="new-atw-view__num-text">{value}</span>
                {ticks > 0 && (
                    <span className="new-atw-view__ticks">
                        {Array.from({ length: ticks }, (_, i) => <span key={i} className="new-atw-view__tick" />)}
                    </span>
                )}
            </span>
        </span>
    );
}

export function NewAtwView({ game }: NewAtwViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const columns = [...game.participants].sort((a, b) => a.turn_order - b.turn_order);
    const playerProgress = buildPlayerProgress(game);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [game.history.length]);

    const current = game.participants.find(p => p.id === game.current_participant_id) ?? null;
    const leader = columns.reduce<AtwParticipant | null>((best, p) => (!best || p.current_number > best.current_number ? p : best), null);
    const nextId = game.queue[1];
    const next = nextId ? game.participants.find(p => p.id === nextId) ?? null : null;
    const currentHasCatchup = !!(game.current_turn?.catchup_active || current?.catching_up);

    return (
        <div className="new-view new-atw-view">
            <div className="new-atw-view__top">
                {current ? (
                    <>
                        <div className="new-atw-view__side">
                            {leader && (
                                <>
                                    <div className="new-atw-view__side-label">Leading</div>
                                    <div className="new-atw-view__side-initials">
                                        {leader.player.initials}
                                        {leader.player.win_streak >= 2 && <sup className="new-atw-view__streak">{leader.player.win_streak}</sup>}
                                    </div>
                                    <div className="new-atw-view__side-number">{leader.current_number}</div>
                                </>
                            )}
                        </div>

                        <div className="new-atw-view__center">
                            <div className="new-atw-view__catchup-slot">
                                {currentHasCatchup && <div className="new-atw-view__catchup-badge">CATCH-UP</div>}
                            </div>
                            <div className="new-atw-view__center-initials">
                                {current.player.initials}
                                {current.player.win_streak >= 2 && <sup className="new-atw-view__streak">{current.player.win_streak}</sup>}
                            </div>
                            <div className="new-atw-view__center-number">{current.current_number}</div>
                        </div>

                        <div className="new-atw-view__side">
                            {next && (
                                <>
                                    <div className="new-atw-view__side-label">Up next</div>
                                    <div className="new-atw-view__side-initials">
                                        {next.player.initials}
                                        {next.player.win_streak >= 2 && <sup className="new-atw-view__streak">{next.player.win_streak}</sup>}
                                    </div>
                                    <div className="new-atw-view__side-number">{next.current_number}</div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="new-atw-view__banner">
                        {game.phase === "finale" && "Finale"}
                        {game.phase === "finished" && (
                            <>{game.participants.find(p => p.player.id === game.winner_id)?.player.initials ?? "-"} wins!</>
                        )}
                    </div>
                )}
            </div>

            <div className="new-atw-view__bottom" style={{ "--cols": columns.length } as CSSProperties}>
                <div className="new-atw-view__header">
                    {columns.map(p => (
                        <div
                            key={p.id}
                            className={`new-atw-view__header-cell${p.id === game.current_participant_id ? " new-atw-view__header-cell--current" : ""}`}
                        >
                            {p.player.initials}
                            {p.player.win_streak >= 2 && <sup className="new-atw-view__streak">{p.player.win_streak}</sup>}
                        </div>
                    ))}
                </div>

                <div className="new-atw-view__body" ref={scrollRef}>
                    {columns.map(p => {
                        const progress = playerProgress.get(p.id);
                        return (
                            <div key={p.id} className="new-atw-view__column">
                                {progress?.passed.map((entry, i) => (
                                    <NumberBadge key={i} value={entry.value} missCount={entry.missCount} variant="past" />
                                ))}
                                {progress && (
                                    progress.isWinning ? (
                                        <span className="new-atw-view__slot">
                                            <span className="new-atw-view__win">{progress.active.value}</span>
                                        </span>
                                    ) : (
                                        <NumberBadge value={progress.active.value} missCount={progress.active.missCount} variant="target" />
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
