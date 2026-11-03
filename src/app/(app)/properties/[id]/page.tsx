import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SampleBadge } from "@/components/common/sample-badge";
import { PropertyAnalysis } from "@/components/deal/property-analysis";
import { PropertyActions } from "@/components/deal/property-actions";
import { StatusSelect } from "@/components/deal/status-select";
import { getProperty } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { formatAddress, recordPhotoLocation } from "@/lib/property-mapping";
import { PropertyPhoto } from "@/components/deal/property-photo";
import { propertyTypeLabel } from "@/lib/constants";
import { relativeTime } from "@/lib/analyze-record";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getProperty((await params).id);
  return { title: p?.name ?? "Property" };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProperty(id), getSettings()]);
  if (!p) notFound();

  const facts = [
    propertyTypeLabel(p.propertyType),
    p.units > 1 ? `${p.units} units` : null,
    p.bedrooms !== null ? `${p.bedrooms} bd` : null,
    p.bathrooms ? `${p.bathrooms.replace(/\.0$/, "")} ba` : null,
    p.squareFeet ? `${p.squareFeet.toLocaleString("en-US")} sq ft` : null,
    p.yearBuilt ? `Built ${p.yearBuilt}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" /> My Properties
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
          <PropertyPhoto location={recordPhotoLocation(p)} className="hidden w-44 shrink-0 sm:block" width={352} height={220} />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
              {p.isSample && <SampleBadge />}
            </div>
            {formatAddress(p) && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" /> {formatAddress(p)}</p>
            )}
            <p className="text-xs text-muted-foreground">{facts.join(" · ")} · Updated {relativeTime(p.updatedAt)}</p>
          </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusSelect id={p.id} status={p.status} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reports/${p.id}`}><FileText /> Report</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/properties/${p.id}/edit`}><Pencil /> Edit</Link>
            </Button>
            <PropertyActions id={p.id} name={p.name} strategy={p.strategy} redirectAfterDelete="/properties" />
          </div>
        </div>
      </div>
      {p.isSample && (
        <p className="rounded-lg border border-sample-foreground/20 bg-sample px-3 py-2 text-xs text-sample-foreground">
          This is a sample property included for demonstration. Its figures are realistic but illustrative — not a listing, quote or appraisal.
          Duplicate it to make your own working copy.
        </p>
      )}
      <PropertyAnalysis record={p} criteria={settings} />
    </div>
  );
}
