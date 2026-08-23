import { useEffect, useState } from "react";
import { getAllStats, compareStats, type PlayerStats } from "../../api";
import { PlayerPicker } from "../../components/game-setup/PlayerPicker";
import { OverviewTab } from "./OverviewTab";
import { AtwStatsTab } from "./AtwStatsTab";
import { CricketStatsTab } from "./CricketStatsTab";
import { X01StatsTab } from "./X01StatsTab";

import "./StatsPage.css";

type Tab = "overview" | "atw" | "cricket" | "x01";

const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "atw", label: "Around the World" },
    { key: "cricket", label: "Cricket" },
    { key: "x01", label: "101 / 301 / 501" },
];

export function StatsPage() {
    const [tab, setTab] = useState<Tab>("overview");
    const [stats, setStats] = useState<PlayerStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [compareIds, setCompareIds] = useState<string[]>([]);
    const [comparison, setComparison] = useState<PlayerStats[] | null>(null);
    const [comparing, setComparing] = useState(false);

    useEffect(() => {
        getAllStats()
            .then(setStats)
            .catch(e => setError(e instanceof Error ? e.message : "Failed to load stats"))
            .finally(() => setLoading(false));
    }, []);

    async function handleCompare() {
        if (compareIds.length < 2) return;
        setComparing(true);
        setError(null);
        try {
            setComparison(await compareStats(compareIds));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to compare players");
        } finally {
            setComparing(false);
        }
    }

    return (
        <div className="page">
            <h1 className="page__title">Stats</h1>

            {error && <div className="form-error">{error}</div>}

            <div className="stats-tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`stats-tabs__btn${tab === t.key ? " stats-tabs__btn--active" : ""}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="form-help">Loading...</p>
            ) : (
                <>
                    {tab === "overview" && <OverviewTab stats={stats} />}
                    {tab === "atw" && <AtwStatsTab stats={stats} />}
                    {tab === "cricket" && <CricketStatsTab stats={stats} />}
                    {tab === "x01" && <X01StatsTab stats={stats} />}
                </>
            )}

            <h2 className="section-subtitle">Compare players</h2>
            <PlayerPicker selectedIds={compareIds} onChange={setCompareIds} />
            <button
                className="btn btn-primary setup-start-btn"
                onClick={handleCompare}
                disabled={comparing || compareIds.length < 2 || compareIds.length > 4}
            >
                {comparing ? "Comparing..." : "Compare"}
            </button>

            {comparison && (
                <div className="stats-comparison">
                    {comparison.map(s => (
                        <div key={s.player.id} className="stats-comparison__card">
                            <h3 className="stats-comparison__name">{s.player.initials} {s.player.name}</h3>
                            <dl className="stats-comparison__list">
                                <dt>Games played</dt><dd>{s.games_played}</dd>
                                <dt>Win rate</dt><dd>{s.win_rate}%</dd>
                                <dt>Accuracy</dt><dd>{s.accuracy_percentage}%</dd>
                                <dt>Darts thrown</dt><dd>{s.darts_thrown}</dd>
                                <dt>Highest x01 turn</dt><dd>{s.highest_x01_turn}</dd>
                                <dt>ATW win rate</dt><dd>{s.by_game.around_the_world.win_rate}%</dd>
                                <dt>Cricket win rate</dt><dd>{s.by_game.cricket.win_rate}%</dd>
                                <dt>X01 win rate</dt><dd>{s.by_game.x01.win_rate}%</dd>
                                <dt>ATW current streak</dt><dd>{s.atw_current_win_streak}</dd>
                                <dt>ATW best streak</dt><dd>{s.atw_best_win_streak}</dd>
                                <dt>ATW longest hit streak</dt><dd>{s.atw_longest_hit_streak}</dd>
                                <dt>ATW biggest single-turn jump</dt><dd>{s.atw_biggest_single_turn_gain}</dd>
                            </dl>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
