import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marks demonstration data everywhere it appears. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      title="Sample data for demonstration — not one of your properties"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-sample-foreground/20 bg-sample px-1.5 py-px text-[10px] font-semibold tracking-wide text-sample-foreground uppercase",
        className,
      )}
    >
      <FlaskConical className="size-2.5" />
      Sample
    </span>
  );
}
