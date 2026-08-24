import type { PlayerStats } from "../../api";
import { PlayerBarChart } from "../../components/charts/PlayerBarChart";

interface X01StatsTabProps {
    stats: PlayerStats[];
}

export function X01StatsTab({ stats }: X01StatsTabProps) {
    return (
        <>
            <table className="stats-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Played</th>
                        <th>Won</th>
                        <th>Win rate</th>
                        <th>Highest turn</th>
                        <th>Avg arrows to win</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map(s => (
                        <tr key={s.player.id}>
                            <td>{s.player.initials} {s.player.name}</td>
                            <td>{s.x01.played}</td>
                            <td>{s.x01.wins}</td>
                            <td>{s.x01.win_rate}%</td>
                            <td>{s.x01.highest_turn}</td>
                            <td>{s.x01.average_arrows_to_win || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="stats-chart-row">
                <PlayerBarChart
                    data={stats.map(s => ({ label: s.player.initials, value: s.x01.win_rate }))}
                    valueLabel="Win rate %"
                />
                <PlayerBarChart
                    data={stats.map(s => ({ label: s.player.initials, value: s.x01.highest_turn }))}
                    valueLabel="Highest turn"
                />
            </div>
        </>
    );
}
