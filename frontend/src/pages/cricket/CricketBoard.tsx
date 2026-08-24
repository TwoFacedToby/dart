import type { CricketGameState } from "../../api";

import "./CricketBoard.css";

interface CricketBoardProps {
    game: CricketGameState;
    big?: boolean;
}

const ROWS: { key: keyof CricketGameState["participants"][number]["marks"]; label: string }[] = [
    { key: "20", label: "20" },
    { key: "19", label: "19" },
    { key: "18", label: "18" },
    { key: "17", label: "17" },
    { key: "16", label: "16" },
    { key: "15", label: "15" },
    { key: "bull", label: "Bull" },
];

function CricketMark({ count }: { count: number }) {
    if (count >= 3) {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="cricket-board__mark-icon">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9l6 6M15 9l-6 6" />
            </svg>
        );
    }
    if (count === 2) return <span>X</span>;
    if (count === 1) return <span>/</span>;
    return <span>-</span>;
}

// Shared marks table used by both the editor (compact) and viewer (big).
// Players run across the columns, target numbers down the rows, with the
// running score in the bottom row. Turn order is changed through the
// settings menu, not here.
export function CricketBoard({ game, big }: CricketBoardProps) {
    const participants = [...game.participants].sort((a, b) => a.turn_order - b.turn_order);

    return (
        <table className={`cricket-board${big ? " cricket-board--big" : ""}`}>
            <thead>
                <tr>
                    <th className="cricket-board__corner"></th>
                    {participants.map(p => (
                        <th
                            key={p.id}
                            className={p.id === game.current_participant_id ? "cricket-board__col--current" : ""}
                        >
                            <span className="cricket-board__player">
                                {p.player.initials}
                                {p.finish_order && <sup className="cricket-board__place">{p.finish_order}</sup>}
                            </span>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {ROWS.map(r => (
                    <tr key={r.key}>
                        <th scope="row" className="cricket-board__row-label">{r.label}</th>
                        {participants.map(p => (
                            <td
                                key={p.id}
                                className={p.marks[r.key] >= 3 ? "cricket-board__closed" : ""}
                            >
                                <CricketMark count={p.marks[r.key]} />
                            </td>
                        ))}
                    </tr>
                ))}
                <tr className="cricket-board__score-row">
                    <th scope="row" className="cricket-board__row-label">Score</th>
                    {participants.map(p => (
                        <td key={p.id} className="cricket-board__score">{p.score}</td>
                    ))}
                </tr>
            </tbody>
        </table>
    );
}
