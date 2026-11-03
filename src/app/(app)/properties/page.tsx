import type { Metadata } from "next";
import Link from "next/link";
import { Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { listProperties } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { analyzeRecords } from "@/lib/analyze-record";
import { formatCurrency, formatPercent, formatRatio } from "@/lib/finance";
import { formatAddress } from "@/lib/property-mapping";
import { propertyTypeLabel } from "@/lib/constants";
import { PropertiesTable, type PropertyRow } from "./properties-table";

export const metadata: Metadata = { title: "My Properties" };

export default async function PropertiesPage() {
  const [records, settings] = await Promise.all([listProperties(), getSettings()]);
  const rows: PropertyRow[] = analyzeRecords(records, settings).map(({ record: r, analysis: a, rating }) => ({
    id: r.id,
    name: r.name,
    isSample: r.isSample,
    status: r.status,
    location: formatAddress({ ...r, address: null }),
    type: propertyTypeLabel(r.propertyType),
    units: r.units,
    updatedAt: r.updatedAt,
    rating,
    // Sort keys (numbers) alongside exact, decimal-formatted display strings.
    sort: {
      price: a.purchasePrice.toNumber(),
      cashFlow: a.monthlyCashFlow.toNumber(),
      capRate: a.capRate?.toNumber() ?? -Infinity,
      coc: a.cashOnCash?.toNumber() ?? -Infinity,
      updated: new Date(r.updatedAt).getTime(),
    },
    display: {
      price: formatCurrency(a.purchasePrice),
      cashInvested: formatCurrency(a.totalCashInvested),
      cashFlow: formatCurrency(a.monthlyCashFlow),
      capRate: formatPercent(a.capRate),
      coc: formatPercent(a.cashOnCash),
      dscr: a.dscr ? formatRatio(a.dscr, 2, "×") : "n/a",
    },
    negative: a.monthlyCashFlow.isNegative(),
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
