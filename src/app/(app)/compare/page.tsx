import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { listProperties } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { MAX_COMPARE } from "@/lib/constants";
import { CompareView } from "./compare-view";
import { taxAssumptionsFrom } from "@/lib/new-deal-defaults";

export const metadata: Metadata = { title: "Deal Comparison" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const [all, settings] = await Promise.all([listProperties(), getSettings()]);
  const requested = (ids ?? "").split(",").filter(Boolean);
  // Only ids that belong to this user survive; order is preserved.
  const selectedIds = requested.filter((id) => all.some((p) => p.id === id)).slice(0, MAX_COMPARE);
  // With nothing chosen, start with the two most recently updated deals.
  const initial = selectedIds.length ? selectedIds : all.slice(0, 2).map((p) => p.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Deal Comparison" description={`Line up to ${MAX_COMPARE} properties. The strongest value in each row is highlighted.`} />
      <CompareView properties={all} selectedIds={initial} criteria={settings} tax={taxAssumptionsFrom(settings)} />
    </div>
  );
}
