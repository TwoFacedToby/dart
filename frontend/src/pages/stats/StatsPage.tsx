import { useEffect, useState } from "react";
import { getAllStats, getStatsTotals, compareStats, type PlayerStats, type StatsTotals, type StatsPeriod } from "../../api";
import { PlayerPicker } from "../../components/game-setup/PlayerPicker";
import { PeriodSelector } from "./PeriodSelector";
import { OverviewTotals } from "./OverviewTotals";
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
    const [period, setPeriod] = useState<StatsPeriod>("all");
    const [stats, setStats] = useState<PlayerStats[]>([]);
    const [totals, setTotals] = useState<StatsTotals | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [compareIds, setCompareIds] = useState<string[]>([]);
    const [comparison, setComparison] = useState<PlayerStats[] | null>(null);
    const [comparing, setComparing] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([getAllStats(period), getStatsTotals(period)])
            .then(([s, t]) => { setStats(s); setTotals(t); })
            .catch(e => setError(e instanceof Error ? e.message : "Failed to load stats"))
            .finally(() => setLoading(false));
    }, [period]);

    async function handleCompare() {
        if (compareIds.length < 2) return;
        setComparing(true);
        setError(null);
        try {
            setComparison(await compareStats(compareIds, period));
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

            <PeriodSelector value={period} onChange={setPeriod} />

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
                    {tab === "overview" && <OverviewTotals totals={totals} />}
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

                            <h4 className="stats-comparison__group-title">Around the World</h4>
                            <dl className="stats-comparison__list">
                                <dt>Played</dt><dd>{s.atw.played}</dd>
                                <dt>Won</dt><dd>{s.atw.wins}</dd>
                                <dt>Win rate</dt><dd>{s.atw.win_rate}%</dd>
                                <dt>Accuracy</dt><dd>{s.atw.accuracy_percentage}%</dd>
                                <dt>Avg turns to win</dt><dd>{s.atw.average_turns_to_win || "-"}</dd>
                                <dt>Current streak</dt><dd>{s.atw.current_win_streak}</dd>
                                <dt>Best streak</dt><dd>{s.atw.best_win_streak}</dd>
                                <dt>Longest hit streak</dt><dd>{s.atw.longest_hit_streak}</dd>
                                <dt>Biggest single-turn jump</dt><dd>{s.atw.biggest_single_turn_gain}</dd>
                            </dl>

                            <h4 className="stats-comparison__group-title">Cricket</h4>
                            <dl className="stats-comparison__list">
                                <dt>Played</dt><dd>{s.cricket.played}</dd>
                                <dt>Won</dt><dd>{s.cricket.wins}</dd>
                                <dt>Win rate</dt><dd>{s.cricket.win_rate}%</dd>
                                <dt>2nd place</dt><dd>{s.cricket.times_second}</dd>
                                <dt>Accuracy</dt><dd>{s.cricket.accuracy_percentage}%</dd>
                                <dt>Avg turns to win</dt><dd>{s.cricket.average_turns_to_win || "-"}</dd>
                                <dt>Highest received</dt><dd>{s.cricket.highest_received}</dd>
                                <dt>Avg received</dt><dd>{s.cricket.average_received || "-"}</dd>
                                <dt>Highest given</dt><dd>{s.cricket.highest_given}</dd>
                                <dt>Avg given</dt><dd>{s.cricket.average_given || "-"}</dd>
                            </dl>

                            <h4 className="stats-comparison__group-title">101</h4>
                            <dl className="stats-comparison__list">
                                <dt>Played</dt><dd>{s.x01["101"].played}</dd>
                                <dt>Won</dt><dd>{s.x01["101"].wins}</dd>
                                <dt>Win rate</dt><dd>{s.x01["101"].win_rate}%</dd>
                                <dt>Highest turn</dt><dd>{s.x01["101"].highest_turn}</dd>
                                {/* <dt>Avg arrows to win</dt><dd>{s.x01["101"].average_arrows_to_win || "-"}</dd> */}
                            </dl>

                            <h4 className="stats-comparison__group-title">301</h4>
                            <dl className="stats-comparison__list">
                                <dt>Played</dt><dd>{s.x01["301"].played}</dd>
                                <dt>Won</dt><dd>{s.x01["301"].wins}</dd>
                                <dt>Win rate</dt><dd>{s.x01["301"].win_rate}%</dd>
                                <dt>Highest turn</dt><dd>{s.x01["301"].highest_turn}</dd>
                                {/* <dt>Avg arrows to win</dt><dd>{s.x01["301"].average_arrows_to_win || "-"}</dd> */}
                            </dl>

                            <h4 className="stats-comparison__group-title">501</h4>
                            <dl className="stats-comparison__list">
                                <dt>Played</dt><dd>{s.x01["501"].played}</dd>
                                <dt>Won</dt><dd>{s.x01["501"].wins}</dd>
                                <dt>Win rate</dt><dd>{s.x01["501"].win_rate}%</dd>
                                <dt>Highest turn</dt><dd>{s.x01["501"].highest_turn}</dd>
                                {/* <dt>Avg arrows to win</dt><dd>{s.x01["501"].average_arrows_to_win || "-"}</dd> */}
                            </dl>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
