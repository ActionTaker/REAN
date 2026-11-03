"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegend, ChartTooltip, SERIES, axisProps, usd, usdCompact } from "./chart-tooltip";

export interface ProjectionDatum {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
}

const LINES = [
  { key: "propertyValue", label: "Property value", color: SERIES[0] },
  { key: "equity", label: "Equity", color: SERIES[1] },
  { key: "loanBalance", label: "Loan balance", color: SERIES[2] },
] as const;

export function ProjectionChart({ data }: { data: ProjectionDatum[] }) {
  return (
    <div className="space-y-3">
      <ChartLegend items={LINES.map((l) => ({ label: l.label, color: l.color }))} />
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="year" {...axisProps} tickFormatter={(v: number) => `Yr ${v}`} />
          <YAxis {...axisProps} tickFormatter={usdCompact} width={56} />
          <Tooltip
            cursor={{ stroke: "var(--axis)", strokeDasharray: "3 3" }}
            content={(p) => <ChartTooltip {...p} format={usd} labelFormat={(l) => `End of year ${l}`} />}
          />
          {LINES.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
