import { cn } from "@/lib/utils";
import type { MetricDefinition } from "@/lib/finance/formulas";
import { InfoTip } from "./info-tip";

export type Tone = "default" | "positive" | "negative" | "muted";

export const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
  muted: "text-muted-foreground",
};

export function MetricCard({
  label,
  value,
  sub,
  metric,
  tone = "default",
  className,
  size = "default",
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  metric?: MetricDefinition;
  tone?: Tone;
  className?: string;
  size?: "default" | "lg";
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-xs", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {metric && <InfoTip metric={metric} />}
      </div>
      <div className={cn("mt-1.5 font-semibold tracking-tight", size === "lg" ? "text-3xl" : "text-2xl", toneClass[tone])}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function toneFor(value: { isNegative(): boolean; isZero(): boolean } | null | undefined): Tone {
  if (!value) return "muted";
  if (value.isNegative()) return "negative";
  if (value.isZero()) return "default";
  return "positive";
}
