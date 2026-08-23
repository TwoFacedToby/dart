import type { PlayerStats } from "../../api";
import { PlayerBarChart } from "../../components/charts/PlayerBarChart";

interface OverviewTabProps {
    stats: PlayerStats[];
}

export function OverviewTab({ stats }: OverviewTabProps) {
    return (
        <>
            <table className="stats-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Games</th>
                        <th>Win rate</th>
                        <th>Accuracy</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map(s => (
                        <tr key={s.player.id}>
                            <td>{s.player.initials} {s.player.name}</td>
                            <td>{s.games_played}</td>
                            <td>{s.win_rate}%</td>
                            <td>{s.accuracy_percentage}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <PlayerBarChart
                data={stats.map(s => ({ label: s.player.initials, value: s.win_rate }))}
                valueLabel="Win rate %"
            />
        </>
    );
}
