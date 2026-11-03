import { cn } from "@/lib/utils";
import { dealStatusLabel } from "@/lib/constants";

const dot: Record<string, string> = {
  ANALYZING: "bg-series-1",
  OFFER_MADE: "bg-series-4",
  UNDER_CONTRACT: "bg-series-2",
  OWNED: "bg-series-3",
  PASSED: "bg-muted-foreground/50",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground", className)}>
      <span className={cn("size-1.5 rounded-full", dot[status] ?? "bg-muted-foreground")} />
      {dealStatusLabel(status)}
    </span>
  );
}
