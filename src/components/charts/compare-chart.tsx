"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, SERIES, axisProps } from "./chart-tooltip";

/**
 * One metric across the compared properties. Each property keeps the color of
 * its selection slot, so identity is stable across every small multiple.
 */
/** Round tick values (1, 2, 2.5, 5 × 10ⁿ steps) covering the data and zero. */
function niceTicks(values: number[], count = 4): number[] {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  if (lo === hi) return [0];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const ticks: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= Math.ceil(hi / step) * step + step / 2; t += step) ticks.push(Number(t.toFixed(10)));
  return ticks;
}

export function CompareChart({
  data,
  format,
  axisFormat,
}: {
  data: { name: string; value: number; slot: number }[];
  format: (v: number) => string;
  axisFormat: (v: number) => string;
}) {
  const ticks = niceTicks(data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="name" hide />
        <YAxis {...axisProps} tickFormatter={axisFormat} width={56} ticks={ticks} domain={[ticks[0], ticks.at(-1)!]} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <ChartTooltip {...p} format={format} />} />
        <Bar dataKey="value" name="" radius={4} maxBarSize={40}>
          {data.map((d) => (
            <Cell key={d.name} fill={SERIES[d.slot % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
