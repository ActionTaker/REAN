import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MetricDefinition } from "@/lib/finance/formulas";

/** Formula + plain-language explanation for a metric. */
export function InfoTip({ metric }: { metric: MetricDefinition }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground"
          aria-label={`How ${metric.label} is calculated`}
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 space-y-1.5 p-3 text-left">
        <p className="font-semibold">{metric.label}</p>
        <p className="font-mono text-[11px] leading-snug opacity-90">{metric.formula}</p>
        <p className="leading-snug opacity-80">{metric.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
