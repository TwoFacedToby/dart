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
                        <th>Win rate</th>
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
                            <td>{s.by_game.around_the_world.played}</td>
                            <td>{s.by_game.around_the_world.win_rate}%</td>
                            <td>{s.atw_current_win_streak}</td>
                            <td>{s.atw_best_win_streak}</td>
                            <td>{s.atw_longest_hit_streak}</td>
                            <td>{s.atw_biggest_single_turn_gain}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="stats-chart-row">
                <PlayerBarChart
                    data={stats.map(s => ({ label: s.player.initials, value: s.by_game.around_the_world.win_rate }))}
                    valueLabel="Win rate %"
                />
                <PlayerBarChart
                    data={stats.map(s => ({ label: s.player.initials, value: s.atw_best_win_streak }))}
                    valueLabel="Best win streak"
                />
            </div>
        </>
    );
}
