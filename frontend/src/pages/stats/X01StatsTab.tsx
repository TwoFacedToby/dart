import type { PlayerStats } from "../../api";
import { PlayerBarChart } from "../../components/charts/PlayerBarChart";

interface X01StatsTabProps {
    stats: PlayerStats[];
}

const SCORES = ["101", "301", "501"] as const;

// Kept fully separate per starting score rather than combined -- "average
// arrows to win" in particular is meaningless pooled together, since a 101
// finishes in a handful of darts and a 501 never will, so the average
// would just reflect which game type someone plays most, not how well
// they play it.
export function X01StatsTab({ stats }: X01StatsTabProps) {
    return (
        <>
            {SCORES.map(score => (
                <div key={score} className="x01-stats-group">
                    <h3 className="x01-stats-group__title">{score}</h3>
                    <table className="stats-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Played</th>
                                <th>Won</th>
                                <th>Win rate</th>
                                <th>Highest turn</th>
                                {/* <th>Avg arrows to win</th> disabled, see api/endpoints/stats.ts */}
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map(s => (
                                <tr key={s.player.id}>
                                    <td>{s.player.initials} {s.player.name}</td>
                                    <td>{s.x01[score].played}</td>
                                    <td>{s.x01[score].wins}</td>
                                    <td>{s.x01[score].win_rate}%</td>
                                    <td>{s.x01[score].highest_turn}</td>
                                    {/* <td>{s.x01[score].average_arrows_to_win || "-"}</td> */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <PlayerBarChart
                        data={stats.map(s => ({ label: s.player.initials, value: s.x01[score].win_rate }))}
                        valueLabel="Win rate %"
                    />
                </div>
            ))}
        </>
    );
}
