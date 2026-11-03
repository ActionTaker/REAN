import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Brand } from "@/components/shell/brand";
import { SampleBadge } from "@/components/common/sample-badge";
import { PropertyAnalysis } from "@/components/deal/property-analysis";
import { getProperty } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { requireUser } from "@/lib/auth-helpers";
import { formatAddress, recordPhotoLocation } from "@/lib/property-mapping";
import { PropertyPhoto } from "@/components/deal/property-photo";
import { dealStatusLabel, propertyTypeLabel } from "@/lib/constants";
import { PrintButton } from "../print-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getProperty((await params).id);
  return { title: p ? `${p.name} — Investment Analysis` : "Report" };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, p, settings] = await Promise.all([requireUser(), getProperty(id), getSettings()]);
  if (!p) notFound();
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const facts: [string, string][] = [
    ["Property type", propertyTypeLabel(p.propertyType)],
    ["Units", String(p.units)],
    ["Bed / bath", [p.bedrooms ?? "—", p.bathrooms?.replace(/\.0$/, "") ?? "—"].join(" / ")],
    ["Square feet", p.squareFeet ? p.squareFeet.toLocaleString("en-US") : "—"],
    ["Year built", p.yearBuilt ? String(p.yearBuilt) : "—"],
    ["Status", dealStatusLabel(p.status)],
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href="/reports" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" /> Reports
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-5xl space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-10 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
          <PropertyPhoto location={recordPhotoLocation(p)} className="hidden w-48 shrink-0 sm:block" width={384} height={240} />
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Rental Property Investment Analysis</p>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
              {p.isSample && <SampleBadge />}
            </div>
            <p className="text-sm text-muted-foreground">{formatAddress(p) || "Address not provided"}</p>
          </div>
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <Brand />
            <p className="text-xs text-muted-foreground">Prepared by {user.name || user.email}</p>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
        </header>

        {p.isSample && (
          <p className="rounded-lg border border-sample-foreground/20 bg-sample px-3 py-2 text-xs text-sample-foreground">
            Sample property — illustrative figures for demonstration only.
          </p>
        )}

        <dl className="grid grid-cols-3 gap-4 text-sm sm:grid-cols-6">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <PropertyAnalysis record={p} criteria={settings} acquisitionFirst />
      </article>
    </div>
  );
}
