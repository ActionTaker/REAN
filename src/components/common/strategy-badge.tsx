import { cn } from "@/lib/utils";
import { strategyLabel } from "@/lib/strategy";

/** Small pill for BRRRR / Flip deals (Buy & Hold is the default and stays unlabelled to keep lists quiet). */
export function StrategyBadge({ strategy, className }: { strategy: string; className?: string }) {
  if (!strategy || strategy === "BUY_HOLD") return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase",
        strategy === "FLIP" ? "border-series-2/40 text-series-2" : "border-series-3/50 text-series-3",
        className,
      )}
    >
      {strategyLabel(strategy)}
    </span>
  );
}
