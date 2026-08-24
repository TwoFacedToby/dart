import type { StatsTotals } from "../../api";

interface OverviewTotalsProps {
    totals: StatsTotals | null;
}

// Deliberately not per-player: a global win rate here would get skewed by
// whichever game type fewer people play, and accuracy already lives in
// each game's own tab. This is just how much has actually been played.
export function OverviewTotals({ totals }: OverviewTotalsProps) {
    if (!totals) return <p className="form-help">Loading...</p>;

    const x01Breakdown = Object.entries(totals.x01_games.by_starting_score)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([score, count]) => `${score}: ${count}`)
        .join(", ");

    return (
        <div className="overview-totals">
            <div className="overview-totals__card">
                <span className="overview-totals__value">{totals.atw_games}</span>
                <span className="overview-totals__label">Around the World games</span>
            </div>
            <div className="overview-totals__card">
                <span className="overview-totals__value">{totals.cricket_games}</span>
                <span className="overview-totals__label">Cricket games</span>
            </div>
            <div className="overview-totals__card">
                <span className="overview-totals__value">{totals.x01_games.total}</span>
                <span className="overview-totals__label">101 / 301 / 501 games</span>
                {x01Breakdown && <span className="overview-totals__sublabel">{x01Breakdown}</span>}
            </div>
            <div className="overview-totals__card">
                <span className="overview-totals__value">{totals.darts_thrown}</span>
                <span className="overview-totals__label">Darts thrown by everyone</span>
            </div>
        </div>
    );
}
