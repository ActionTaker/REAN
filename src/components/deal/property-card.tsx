import Link from "next/link";
import { MapPin } from "lucide-react";
import { SampleBadge } from "@/components/common/sample-badge";
import { StrategyBadge } from "@/components/common/strategy-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { RatingBadge } from "@/components/common/rating-badge";
import { dec, formatCurrency, formatPercent } from "@/lib/finance";
import { propertyTypeLabel } from "@/lib/constants";
import { formatAddress } from "@/lib/property-mapping";
import type { AnalyzedProperty } from "@/lib/analyze-record";

export function PropertyCard({ item }: { item: AnalyzedProperty }) {
  const { record: r, analysis: a, rating, flip, brrrr } = item;
  const metrics: [string, React.ReactNode][] = flip
    ? [
        ["Profit", <span key="p" className={flip.profit.isNegative() ? "text-negative" : "text-positive"}>{formatCurrency(flip.profit)}</span>],
        ["ROI", formatPercent(flip.roi, 1)],
        ["Hold", `${flip.hold.months} mo`],
      ]
    : brrrr
      ? [
          ["Cash flow", <span key="c" className={a.monthlyCashFlow.isNegative() ? "text-negative" : "text-positive"}>{formatCurrency(a.monthlyCashFlow)}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></span>],
          ["Cash left", brrrr.cashLeftInDeal.gt(0) ? formatCurrency(brrrr.cashLeftInDeal) : "$0"],
          ["CoC", brrrr.infiniteReturn ? "∞" : formatPercent(a.cashOnCash)],
        ]
      : [
          ["Cash flow", <span key="c" className={a.monthlyCashFlow.isNegative() ? "text-negative" : "text-positive"}>{formatCurrency(a.monthlyCashFlow)}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></span>],
          ["Cap rate", formatPercent(a.capRate)],
          ["CoC", formatPercent(a.cashOnCash)],
        ];
  return (
    <Link
      href={`/properties/${r.id}`}
      className="group flex flex-col rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium group-hover:underline">{r.name}</h3>
            <StrategyBadge strategy={r.strategy} />
            {r.isSample && <SampleBadge />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {formatAddress({ ...r, address: null }) || "No location"} · {propertyTypeLabel(r.propertyType)}
          </p>
        </div>
        <RatingBadge rating={rating} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        {metrics.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className="num font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="num">{formatCurrency(dec(r.purchasePrice))}</span>
        <StatusBadge status={r.status} />
      </div>
    </Link>
  );
}
