"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, SERIES, axisProps } from "./chart-tooltip";

/**
 * One metric across the compared properties. Each property keeps the color of
 * its selection slot, so identity is stable across every small multiple.
 */
export function CompareChart({
  data,
  format,
  axisFormat,
}: {
  data: { name: string; value: number; slot: number }[];
  format: (v: number) => string;
  axisFormat: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="name" hide />
        <YAxis {...axisProps} tickFormatter={axisFormat} width={56} />
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
