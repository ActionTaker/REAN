"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, SERIES, axisProps, usd } from "./chart-tooltip";

export interface CashFlowDatum {
  name: string;
  cashFlow: number;
}

/** Monthly cash flow per property — one series, zero baseline, negative bars extend left. */
export function CashFlowChart({ data }: { data: CashFlowDatum[] }) {
  const height = Math.max(160, data.length * 36 + 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke="var(--grid)" />
        <XAxis type="number" {...axisProps} tickFormatter={usd} />
        <YAxis type="category" dataKey="name" {...axisProps} width={150} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <ReferenceLine x={0} stroke="var(--axis)" />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={(p) => <ChartTooltip {...p} format={(v) => `${usd(v)}/mo`} />}
        />
        <Bar dataKey="cashFlow" name="Monthly cash flow" fill={SERIES[0]} radius={4} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
