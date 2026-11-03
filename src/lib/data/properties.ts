import "server-only";
import type { Prisma, Property } from "@prisma/client";
import { needsCoordinates, withCoordinates } from "@/lib/property-data/geocode";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import type { PropertyRecord } from "@/lib/property-mapping";
import { sampleRowsFor } from "@/lib/sample-data";
import type { PropertyLookup } from "@/lib/property-data/types";
import type { RehabPlan } from "@/lib/estimates/rehab";
import type { OfferGoals } from "@/lib/offer-goals";
import type { ArvAnalysis } from "@/lib/property-data/arv-analysis";

const s = (v: { toString(): string } | null) => (v === null ? null : v.toString());

function toRecord(p: Property): PropertyRecord {
  return {
    id: p.id,
    isSample: p.isSample,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    zip: p.zip,
    propertyType: p.propertyType,
    units: p.units,
    bedrooms: p.bedrooms,
    bathrooms: s(p.bathrooms),
    squareFeet: p.squareFeet,
    yearBuilt: p.yearBuilt,
    notes: p.notes,
    purchasePrice: p.purchasePrice.toString(),
    closingCosts: p.closingCosts.toString(),
    rehabCosts: p.rehabCosts.toString(),
    afterRepairValue: s(p.afterRepairValue),
    marketData: (p.marketData as PropertyLookup | null) ?? null,
    rehabPlan: (p.rehabPlan as RehabPlan | null) ?? null,
    offerGoals: (p.offerGoals as OfferGoals | null) ?? null,
    arvAnalysis: (p.arvAnalysis as ArvAnalysis | null) ?? null,
    rentAnalysis: (p.rentAnalysis as ArvAnalysis | null) ?? null,
    isCashPurchase: p.isCashPurchase,
    downPaymentPercent: p.downPaymentPercent.toString(),
    interestRate: p.interestRate.toString(),
    loanTermYears: p.loanTermYears,
    monthlyRent: p.monthlyRent.toString(),
    otherMonthlyIncome: p.otherMonthlyIncome.toString(),
    vacancyRate: p.vacancyRate.toString(),
    propertyTaxAnnual: p.propertyTaxAnnual.toString(),
    insuranceAnnual: p.insuranceAnnual.toString(),
    hoaMonthly: p.hoaMonthly.toString(),
    utilitiesMonthly: p.utilitiesMonthly.toString(),
    otherMonthlyExpenses: p.otherMonthlyExpenses.toString(),
    maintenancePercent: p.maintenancePercent.toString(),
    capexPercent: p.capexPercent.toString(),
    managementPercent: p.managementPercent.toString(),
    appreciationRate: p.appreciationRate.toString(),
    rentGrowthRate: p.rentGrowthRate.toString(),
    expenseGrowthRate: p.expenseGrowthRate.toString(),
    sellingCostPercent: p.sellingCostPercent.toString(),
    holdingPeriodYears: p.holdingPeriodYears,
  };
}

/** All of the signed-in user's properties, most recently updated first. */
export async function listProperties(opts: { includeSamples?: boolean } = {}): Promise<PropertyRecord[]> {
  const user = await requireUser();
  const rows = await prisma.property.findMany({
    where: { userId: user.id, ...(opts.includeSamples === false ? { isSample: false } : {}) },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toRecord);
}

/** Scoped to the signed-in user — another user's id returns null. */
export async function getProperty(id: string): Promise<PropertyRecord | null> {
  const user = await requireUser();
  const row = await prisma.property.findFirst({ where: { id, userId: user.id } });
  return row ? toRecord(row) : null;
}

export async function getPropertiesByIds(ids: string[]): Promise<PropertyRecord[]> {
  if (ids.length === 0) return [];
  const user = await requireUser();
  const rows = await prisma.property.findMany({ where: { id: { in: ids }, userId: user.id } });
  // Preserve the caller's order.
  return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is Property => !!r).map(toRecord);
}

export async function countSampleProperties(userId: string) {
  return prisma.property.count({ where: { userId, isSample: true } });
}

export async function seedSamples(userId: string) {
  await prisma.property.createMany({ data: sampleRowsFor(userId) });
}

/** Fill missing comp coordinates in a deal's saved market data and persist them (scoped to the signed-in user). */
export async function ensureCoordinates(id: string, lookup: PropertyLookup): Promise<PropertyLookup> {
  if (!needsCoordinates(lookup)) return lookup;
  const filled = await withCoordinates(lookup);
  if (filled !== lookup) {
    const user = await requireUser();
    await prisma.property.updateMany({ where: { id, userId: user.id }, data: { marketData: filled as unknown as Prisma.InputJsonValue } });
  }
  return filled;
}
