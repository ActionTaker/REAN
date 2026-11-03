import { cn } from "@/lib/utils";
import type { DealRating } from "@/lib/finance";

const STYLES: Record<DealRating, { label: string; className: string }> = {
  strong: { label: "Meets criteria", className: "bg-positive/10 text-positive" },
  moderate: { label: "Partial", className: "bg-caution/10 text-caution" },
  weak: { label: "Below criteria", className: "bg-caution/10 text-caution" },
  negative: { label: "Negative CF", className: "bg-negative/10 text-negative" },
};

export function RatingBadge({ rating, className }: { rating: DealRating; className?: string }) {
  const s = STYLES[rating];
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", s.className, className)}>
      {s.label}
    </span>
  );
}
