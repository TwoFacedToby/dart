import type { PlayerStats } from "../../api";
import { PlayerBarChart } from "../../components/charts/PlayerBarChart";

interface CricketStatsTabProps {
    stats: PlayerStats[];
}

export function CricketStatsTab({ stats }: CricketStatsTabProps) {
    return (
        <>
            <table className="stats-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Played</th>
                        <th>Won</th>
                        <th>Win rate</th>
                        <th>2nd place</th>
                        <th>Accuracy</th>
                        <th>Avg turns to win</th>
                        <th>Highest received</th>
                        <th>Avg received</th>
                        <th>Highest given</th>
                        <th>Avg given</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map(s => (
                        <tr key={s.player.id}>
                            <td>{s.player.initials} {s.player.name}</td>
                            <td>{s.cricket.played}</td>
                            <td>{s.cricket.wins}</td>
                            <td>{s.cricket.win_rate}%</td>
                            <td>{s.cricket.times_second}</td>
                            <td>{s.cricket.accuracy_percentage}%</td>
                            <td>{s.cricket.average_turns_to_win || "-"}</td>
                            <td>{s.cricket.highest_received}</td>
                            <td>{s.cricket.average_received || "-"}</td>
                            <td>{s.cricket.highest_given}</td>
                            <td>{s.cricket.average_given || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <PlayerBarChart
                data={stats.map(s => ({ label: s.player.initials, value: s.cricket.win_rate }))}
                valueLabel="Win rate %"
            />
        </>
    );
}
