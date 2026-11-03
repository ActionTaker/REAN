import Link from "next/link";
import { MapPin } from "lucide-react";
import { SampleBadge } from "@/components/common/sample-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { RatingBadge } from "@/components/common/rating-badge";
import { formatCurrency, formatPercent } from "@/lib/finance";
import { propertyTypeLabel } from "@/lib/constants";
import { formatAddress } from "@/lib/property-mapping";
import type { AnalyzedProperty } from "@/lib/analyze-record";
import { cn } from "@/lib/utils";

export function PropertyCard({ item }: { item: AnalyzedProperty }) {
  const { record: r, analysis: a, rating } = item;
  return (
    <Link
      href={`/properties/${r.id}`}
      className="group flex flex-col rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium group-hover:underline">{r.name}</h3>
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
        <div>
          <dt className="text-[11px] text-muted-foreground">Cash flow</dt>
          <dd className={cn("num font-semibold", a.monthlyCashFlow.isNegative() ? "text-negative" : "text-positive")}>
            {formatCurrency(a.monthlyCashFlow)}
            <span className="text-[11px] font-normal text-muted-foreground">/mo</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Cap rate</dt>
          <dd className="num font-semibold">{formatPercent(a.capRate)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">CoC</dt>
          <dd className="num font-semibold">{formatPercent(a.cashOnCash)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="num">{formatCurrency(a.purchasePrice)}</span>
        <StatusBadge status={r.status} />
      </div>
    </Link>
  );
}
