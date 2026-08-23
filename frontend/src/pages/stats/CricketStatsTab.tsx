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
                        <th>Win rate</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map(s => (
                        <tr key={s.player.id}>
                            <td>{s.player.initials} {s.player.name}</td>
                            <td>{s.by_game.cricket.played}</td>
                            <td>{s.by_game.cricket.win_rate}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <PlayerBarChart
                data={stats.map(s => ({ label: s.player.initials, value: s.by_game.cricket.win_rate }))}
                valueLabel="Win rate %"
            />
        </>
    );
}
