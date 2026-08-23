import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import "./PlayerBarChart.css";

interface PlayerBarChartDatum {
    label: string;
    value: number;
}

interface PlayerBarChartProps {
    data: PlayerBarChartDatum[];
    valueLabel: string;
}

export function PlayerBarChart({ data, valueLabel }: PlayerBarChartProps) {
    if (data.length === 0) return null;

    return (
        <div className="player-bar-chart">
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                    <Tooltip
                        contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6 }}
                        labelStyle={{ color: "var(--color-text)" }}
                        formatter={(value: number) => [value, valueLabel]}
                    />
                    <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
