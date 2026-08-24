import type { PlayerStats } from "../../api";
import { PlayerBarChart } from "../../components/charts/PlayerBarChart";

interface AtwStatsTabProps {
    stats: PlayerStats[];
}

export function AtwStatsTab({ stats }: AtwStatsTabProps) {
    return (
        <>
            <table className="stats-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Played</th>
                        <th>Won</th>
                        <th>Win rate</th>
                        <th>Accuracy</th>
                        <th>Avg turns to win</th>
                        <th>Current streak</th>
                        <th>Best streak</th>
                        <th>Longest hit streak</th>
                        <th>Biggest single-turn jump</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map(s => (
                        <tr key={s.player.id}>
                            <td>{s.player.initials} {s.player.name}</td>
                            <td>{s.atw.played}</td>
                            <td>{s.atw.wins}</td>
                            <td>{s.atw.win_rate}%</td>
                            <td>{s.atw.accuracy_percentage}%</td>
                            <td>{s.atw.average_turns_to_win || "-"}</td>
                            <td>{s.atw.current_win_streak}</td>
                            <td>{s.atw.best_win_streak}</td>
                            <td>{s.atw.longest_hit_streak}</td>
                            <td>{s.atw.biggest_single_turn_gain}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="stats-chart-row">
                <PlayerBarChart
                    data={stats.map(s => ({ label: s.player.initials, value: s.atw.win_rate }))}
                    valueLabel="Win rate %"
                />
                <PlayerBarChart
                    data={stats.map(s => ({ label: s.player.initials, value: s.atw.best_win_streak }))}
                    valueLabel="Best win streak"
                />
            </div>
        </>
    );
}
