import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DealForm } from "@/components/deal/deal-form";
import { getProperty } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { recordToFormValues } from "@/lib/property-mapping";

export const metadata: Metadata = { title: "Edit analysis" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [property, settings] = await Promise.all([getProperty(id), getSettings()]);
  if (!property) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/properties/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" /> Back to analysis
        </Link>
        <PageHeader className="mt-2" title={`Edit · ${property.name}`} description="Adjust any assumption and see the impact before saving." />
      </div>
      <DealForm propertyId={id} defaultValues={recordToFormValues(property)} criteria={settings} isSample={property.isSample} initialMarketData={property.marketData} />
    </div>
  );
}
