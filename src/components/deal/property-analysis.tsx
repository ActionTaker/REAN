"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cashFlowRequired, rateAgainstGoals, resolveOfferGoals, type OfferGoals } from "@/lib/offer-goals";
import { saveOfferGoals } from "@/app/actions/properties";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeDeal, dec, formatCurrency, type InvestmentCriteria } from "@/lib/finance";
import { recordToInputs, trimZeros, type PropertyRecord } from "@/lib/property-mapping";
import { Disclaimer } from "@/components/common/disclaimer";
import { MarketDataSummary } from "./market-data";
import { DealTools } from "./deal-tools";
import { REHAB_SCOPES, rehabTotals, type RehabPlan } from "@/lib/estimates/rehab";
import {
  AcquisitionSummary,
  AmortizationTable,
  ArvBreakdown,
  CashFlowStatement,
  CriteriaPanel,
  FormulaReference,
  KeyMetrics,
  ProjectionPanel,
  RatioSummary,
  YearOneReturn,
} from "./analysis-panels";

function Panel({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function PropertyAnalysis({
  record,
  criteria,
  acquisitionFirst = false,
}: {
  record: PropertyRecord;
  criteria: InvestmentCriteria;
  /** Report layout: Acquisition & financing → Cash flow statement → Year-1 return (also the printed order). */
  acquisitionFirst?: boolean;
}) {
  const a = useMemo(() => analyzeDeal(recordToInputs(record)), [record]);
  const savedGoals = useMemo(() => resolveOfferGoals(record.offerGoals, criteria), [record.offerGoals, criteria]);
  const [goals, setGoals] = useState<OfferGoals>(savedGoals);
  const { checks, rating } = useMemo(() => rateAgainstGoals(a, goals), [a, goals]);
  const pct = (s: string) => `${trimZeros(s)}%`;

  const acquisition = (
    <>
      <AcquisitionSummary a={a} interestRate={trimZeros(record.interestRate)} termYears={record.loanTermYears} isCash={record.isCashPurchase} />
      <ArvBreakdown a={a} className="mt-3" />
    </>
  );
  return (
    <div className="space-y-5">
      <CriteriaPanel
        rating={rating}
        checks={checks}
        cashFlowNote={!cashFlowRequired(goals) && a.monthlyCashFlow.isNegative()}
        footer="Goals for this deal are set under Max offer price below."
      />
      <KeyMetrics a={a} columns={6} />

      {acquisitionFirst ? (
        // DOM order = reading/print order; on wide screens the cash flow statement spans both rows on the right.
        <div className="grid gap-5 lg:grid-cols-5">
          <Panel title="Acquisition & financing" className="lg:col-span-2 print:break-inside-avoid">
            {acquisition}
          </Panel>
          <Panel title="Cash flow statement" description="Year 1, at the assumptions entered" className="lg:col-span-3 lg:row-span-2 print:break-inside-avoid">
            <CashFlowStatement a={a} />
          </Panel>
          <Panel title="Year-1 total return" description="Cash flow plus equity build-up" className="lg:col-span-2 print:break-inside-avoid">
            <YearOneReturn a={a} />
          </Panel>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-5">
          <Panel title="Cash flow statement" description="Year 1, at the assumptions entered" className="lg:col-span-3 print:break-inside-avoid">
            <CashFlowStatement a={a} />
          </Panel>
          <div className="space-y-5 lg:col-span-2">
            <Panel title="Acquisition & financing" className="print:break-inside-avoid">
              {acquisition}
            </Panel>
            <Panel title="Year-1 total return" description="Cash flow plus equity build-up" className="print:break-inside-avoid">
              <YearOneReturn a={a} />
            </Panel>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title="Investment ratios" description="Screening metrics and rules of thumb" className="lg:col-span-2 print:break-inside-avoid">
          <RatioSummary a={a} />
        </Panel>
        <Panel title="Assumptions used" description="Every input behind these numbers" className="lg:col-span-3 print:break-inside-avoid">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {[
              ["Monthly rent", formatCurrency(dec(record.monthlyRent))],
              ["Other income", `${formatCurrency(dec(record.otherMonthlyIncome))}/mo`],
              ["Vacancy", pct(record.vacancyRate)],
              ["Property tax", `${formatCurrency(dec(record.propertyTaxAnnual))}/yr`],
              ["Insurance", `${formatCurrency(dec(record.insuranceAnnual))}/yr`],
              ["HOA", `${formatCurrency(dec(record.hoaMonthly))}/mo`],
              ["Utilities", `${formatCurrency(dec(record.utilitiesMonthly))}/mo`],
              ["Other expenses", `${formatCurrency(dec(record.otherMonthlyExpenses))}/mo`],
              ["Maintenance", pct(record.maintenancePercent)],
              ["CapEx", pct(record.capexPercent)],
              ["Management", pct(record.managementPercent)],
              ["Appreciation", `${pct(record.appreciationRate)}/yr`],
              ["Rent growth", `${pct(record.rentGrowthRate)}/yr`],
              ["Expense growth", `${pct(record.expenseGrowthRate)}/yr`],
              ["Selling costs", pct(record.sellingCostPercent)],
              ["Holding period", `${record.holdingPeriodYears} years`],
              ["Down payment", record.isCashPurchase ? "All cash" : pct(record.downPaymentPercent)],
              ["After-repair value", record.afterRepairValue ? formatCurrency(dec(record.afterRepairValue)) : "Not set"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="num">{v}</dd>
              </div>
            ))}
          </dl>
          {record.notes && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line">{record.notes}</div>
          )}
        </Panel>
      </div>

      <OfferTools record={record} goals={goals} savedGoals={savedGoals} onGoalsChange={setGoals} />

      {record.rehabPlan && <RehabBudget plan={record.rehabPlan} squareFeet={record.squareFeet} />}

      {record.marketData && (
        <Panel
          title="Market data"
          description="Automated estimates captured when this deal was analyzed"
          className="print:break-inside-avoid"
        >
          <MarketDataSummary data={record.marketData} />
        </Panel>
      )}

      <Panel
        title={`${a.sale.holdingPeriodYears}-year projection`}
        description="Rent, expenses and value compound at the growth rates entered; sale assumed at the end of the holding period."
        className="print:break-before-page"
      >
        <ProjectionPanel a={a} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Loan amortization" description="Annual totals of the monthly schedule" className="print:hidden">
          <AmortizationTable a={a} />
        </Panel>
        <Panel title="How these numbers are calculated" className="print:break-before-page">
          <FormulaReference />
        </Panel>
      </div>

      <Disclaimer />
    </div>
  );
}

function RehabBudget({ plan, squareFeet }: { plan: RehabPlan; squareFeet: number | null }) {
  const t = rehabTotals(plan);
  const scope = REHAB_SCOPES.find((s) => s.value === plan.scope);
  return (
    <Panel
      title="Rehab budget"
      description={`${scope?.label ?? plan.scope} scope${plan.customized ? " · customized line items" : " · estimated from property size & region"}`}
      className="print:break-inside-avoid"
    >
      <dl className="grid gap-x-8 text-sm sm:grid-cols-2">
        {plan.items.map((i) => (
          <div key={i.key} className="flex items-baseline justify-between gap-4 border-b py-1.5">
            <dt>
              {i.label}
              {i.basis && <span className="ml-2 text-xs text-muted-foreground">{i.basis}</span>}
            </dt>
            <dd className="num">{formatCurrency(dec(i.amount))}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm">
        <span className="text-muted-foreground">Subtotal <span className="num text-foreground">{formatCurrency(t.subtotal)}</span></span>
        <span className="text-muted-foreground">Contingency {plan.contingencyPct}% <span className="num text-foreground">{formatCurrency(t.contingency)}</span></span>
        <span className="font-semibold">
          Total {formatCurrency(t.total)}
          {squareFeet ? <span className="ml-1 font-normal text-muted-foreground">({formatCurrency(t.total.div(squareFeet))}/sq ft)</span> : null}
        </span>
      </div>
    </Panel>
  );
}

/** Max offer with goals editable in place; "Save goals" persists them to this deal. */
function OfferTools({
  record,
  goals,
  savedGoals,
  onGoalsChange,
}: {
  record: PropertyRecord;
  goals: OfferGoals;
  savedGoals: OfferGoals;
  onGoalsChange: (g: OfferGoals) => void;
}) {
  const [pending, start] = useTransition();
  const inputs = useMemo(() => recordToInputs(record), [record]);
  const dirty = JSON.stringify(goals) !== JSON.stringify(savedGoals);
  return (
    <DealTools
      inputs={inputs}
      goals={goals}
      onGoalsChange={onGoalsChange}
      action={
        dirty ? (
          <Button
            size="sm"
            className="no-print"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveOfferGoals(record.id, goals);
                if (res.ok) toast.success("Goals saved for this deal");
                else toast.error("Couldn't save goals");
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save goals
          </Button>
        ) : undefined
      }
    />
  );
}
