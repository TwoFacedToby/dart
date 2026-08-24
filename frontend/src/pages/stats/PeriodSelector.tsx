import type { StatsPeriod } from "../../api";

interface PeriodSelectorProps {
    value: StatsPeriod;
    onChange: (period: StatsPeriod) => void;
}

const PERIODS: { key: StatsPeriod; label: string }[] = [
    { key: "month", label: "Last month" },
    { key: "3months", label: "Last 3 months" },
    { key: "year", label: "Last year" },
    { key: "all", label: "All time" },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
    return (
        <div className="game-editor__type-picker">
            {PERIODS.map(p => (
                <button
                    key={p.key}
                    type="button"
                    className={`game-editor__type-btn${value === p.key ? " game-editor__type-btn--selected" : ""}`}
                    onClick={() => onChange(p.key)}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
