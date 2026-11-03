import type { Metadata } from "next";
import Link from "next/link";
import { Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { listProperties } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { analyzeRecords } from "@/lib/analyze-record";
import { dec, formatCurrency, formatPercent, formatRatio } from "@/lib/finance";
import { formatAddress } from "@/lib/property-mapping";
import { propertyTypeLabel } from "@/lib/constants";
import { PropertiesTable, type PropertyRow } from "./properties-table";

export const metadata: Metadata = { title: "My Properties" };

export default async function PropertiesPage() {
  const [records, settings] = await Promise.all([listProperties(), getSettings()]);
  const rows: PropertyRow[] = analyzeRecords(records, settings).map(({ record: r, analysis: a, rating, flip, brrrr }) => ({
    id: r.id,
    strategy: r.strategy,
    hasAdu: !!r.aduInputs && r.strategy !== "FLIP",
    name: r.name,
    isSample: r.isSample,
    status: r.status,
    location: formatAddress({ ...r, address: null }),
    type: propertyTypeLabel(r.propertyType),
    units: r.units,
    updatedAt: r.updatedAt,
    rating,
    // Sort keys (numbers) alongside exact, decimal-formatted display strings.
    // Flips have no rental numbers: their columns show profit / ROI instead (BRRRR shows post-refinance numbers).
    sort: {
      price: dec(r.purchasePrice).toNumber(),
      cashFlow: flip ? -Infinity : a.monthlyCashFlow.toNumber(),
      capRate: flip ? -Infinity : a.capRate?.toNumber() ?? -Infinity,
      coc: flip ? flip.roi?.toNumber() ?? -Infinity : brrrr?.infiniteReturn ? Infinity : a.cashOnCash?.toNumber() ?? -Infinity,
      updated: new Date(r.updatedAt).getTime(),
    },
    display: {
      price: formatCurrency(dec(r.purchasePrice)),
      cashInvested: formatCurrency(flip?.hold.totalCashIn ?? brrrr?.hold.totalCashIn ?? a.totalCashInvested),
      cashFlow: flip ? `${formatCurrency(flip.profit)} profit` : formatCurrency(a.monthlyCashFlow),
      capRate: flip ? "—" : formatPercent(a.capRate),
      coc: flip ? `${formatPercent(flip.roi)} ROI` : brrrr?.infiniteReturn ? "∞" : formatPercent(a.cashOnCash),
      dscr: flip ? "—" : a.dscr ? formatRatio(a.dscr, 2, "×") : "n/a",
    },
    negative: flip ? flip.profit.isNegative() : a.monthlyCashFlow.isNegative(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Properties"
        description="Every deal you've saved. Select up to four to compare side by side."
        actions={<Button asChild><Link href="/analyzer"><Plus /> New analysis</Link></Button>}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No saved properties"
          description="Analyses you save from the Deal Analyzer appear here."
          action={<Button asChild><Link href="/analyzer"><Plus /> Analyze a property</Link></Button>}
        />
      ) : (
        <PropertiesTable rows={rows} />
      )}
    </div>
  );
}
