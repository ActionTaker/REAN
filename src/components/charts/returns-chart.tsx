"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegend, ChartTooltip, SERIES, axisProps, pctFmt } from "./chart-tooltip";

export interface ReturnsDatum {
  name: string;
  capRate: number;
  cashOnCash: number;
}

/** Cap rate vs cash-on-cash per property — both are percentages, so one axis is honest. */
export function ReturnsChart({ data }: { data: ReturnsDatum[] }) {
  const height = Math.max(160, data.length * 44 + 40);
  return (
    <div className="space-y-3">
      <ChartLegend items={[{ label: "Cap rate", color: SERIES[0] }, { label: "Cash-on-cash", color: SERIES[1] }]} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barGap={2} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" {...axisProps} tickFormatter={(v: number) => `${v}%`} />
          <YAxis type="category" dataKey="name" {...axisProps} width={150} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <ReferenceLine x={0} stroke="var(--axis)" />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <ChartTooltip {...p} format={pctFmt} />} />
          <Bar dataKey="capRate" name="Cap rate" fill={SERIES[0]} radius={4} maxBarSize={12} />
          <Bar dataKey="cashOnCash" name="Cash-on-cash" fill={SERIES[1]} radius={4} maxBarSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
