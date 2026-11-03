import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { DealForm } from "@/components/deal/deal-form";
import { getSettings } from "@/lib/data/settings";
import { newDealDefaults } from "@/lib/new-deal-defaults";

export const metadata: Metadata = { title: "Deal Analyzer" };

export default async function AnalyzerPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal Analyzer"
        description="Enter the property's numbers. Results update instantly; defaults come from your Settings."
      />
      <DealForm propertyId={null} defaultValues={newDealDefaults(settings)} criteria={settings} />
    </div>
  );
}
