"use client";

/** Shared Recharts tooltip: values lead, labels follow, line keys rather than boxes. */
export function ChartTooltip({
  active,
  label,
  payload,
  format,
  labelFormat,
}: {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ name?: unknown; value?: unknown; color?: string; dataKey?: unknown }>;
  format: (v: number, key?: string) => string;
  labelFormat?: (l: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <div className="mb-1.5 font-medium text-popover-foreground">{labelFormat ? labelFormat(label) : label}</div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} />
            <span className="num font-semibold text-popover-foreground">{format(Number(p.value), String(p.dataKey))}</span>
            <span className="text-muted-foreground">{String(p.name ?? "")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"] as const;

export const axisProps = {
  stroke: "var(--axis)",
  tick: { fill: "var(--axis)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const usdCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
export const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
export const pctFmt = (v: number) => `${v.toFixed(2)}%`;
