"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionNav } from "./section-nav";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cashFlowRequired, rateAgainstGoals, resolveOfferGoals, type OfferGoals } from "@/lib/offer-goals";
import { saveOfferGoals, saveStrategyGoals } from "@/app/actions/properties";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeBrrrr, analyzeDeal, analyzeFlip, dec, formatCurrency, type InvestmentCriteria } from "@/lib/finance";
import { recordToInputs, trimZeros, type PropertyRecord } from "@/lib/property-mapping";
import { Disclaimer } from "@/components/common/disclaimer";
import { MarketDataSummary } from "./market-data";
import { BrrrrMetrics, BrrrrSteps, FlipMetrics, FlipStatement, StrategyOfferTools, rateStrategy, strategyChecks } from "./strategy-panels";
import { resolveStrategyInputs, toEngineInputs, type StrategyGoals, type StrategyValue } from "@/lib/strategy";
import { DealTools } from "./deal-tools";
import { AduPanel } from "./adu-panels";
import { AfterTaxSummary } from "./tax-panel";
import { OtherEstimatesSummary } from "./other-estimates";
import { DEFAULT_TAX_ASSUMPTIONS, type TaxAssumptions } from "@/lib/finance/tax";
import { runAdu } from "@/lib/adu";
import type { DealAnalysis } from "@/lib/finance";
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

function Panel({ id, title, description, children, className }: { id?: string; title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card id={id} className={cn(id && "scroll-mt-28", className)}>
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
  tax = DEFAULT_TAX_ASSUMPTIONS,
}: {
  record: PropertyRecord;
  criteria: InvestmentCriteria;
  tax?: TaxAssumptions;
  /** Report layout: Acquisition & financing → Cash flow statement → Year-1 return (also the printed order). */
  acquisitionFirst?: boolean;
}) {
  if (record.strategy && record.strategy !== "BUY_HOLD") return <StrategyPropertyAnalysis record={record} criteria={criteria} showNav={!acquisitionFirst} />;
  return <BuyHoldAnalysis record={record} criteria={criteria} acquisitionFirst={acquisitionFirst} tax={tax} />;
}

function BuyHoldAnalysis({
  record,
  criteria,
  acquisitionFirst,
  tax,
}: {
  record: PropertyRecord;
  criteria: InvestmentCriteria;
  acquisitionFirst: boolean;
  tax: TaxAssumptions;
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
  const nav = [
    { id: "overview", label: "Overview" },
    { id: "cash-flow", label: "Cash flow" },
    { id: "returns", label: "Ratios & tax" },
    { id: "offer", label: "Max offer" },
    ...(record.aduInputs ? [{ id: "adu", label: "ADU" }] : []),
    ...(record.marketData || record.otherEstimates?.length ? [{ id: "market", label: "Market data" }] : []),
    { id: "projection", label: "Projection" },
    { id: "details", label: "Loan & formulas" },
  ];
  return (
    <div className="space-y-5">
      {!acquisitionFirst && <SectionNav items={nav} />}
      <div id="overview" className="scroll-mt-28" />
      <CriteriaPanel
        rating={rating}
        checks={checks}
        cashFlowNote={!cashFlowRequired(goals) && a.monthlyCashFlow.isNegative()}
        footer="Goals for this deal are set under Max offer price below."
      />
      <KeyMetrics a={a} columns={6} checks={checks} />

      {acquisitionFirst ? (
        // DOM order = reading/print order; on wide screens the cash flow statement spans both rows on the right.
        <div className="grid gap-5 lg:grid-cols-5">
          <Panel id="cash-flow" title="Acquisition & financing" className="lg:col-span-2 print:break-inside-avoid">
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
          <Panel id="cash-flow" title="Cash flow statement" description="Year 1, at the assumptions entered" className="lg:col-span-3 print:break-inside-avoid">
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

      <div id="returns" className="grid scroll-mt-28 gap-5 lg:grid-cols-2">
        <Panel title="Investment ratios" description="Screening metrics and rules of thumb" className="print:break-inside-avoid">
          <RatioSummary a={a} />
        </Panel>
        <Panel title="After-tax cash flow" description="Year 1, with depreciation and the interest deduction" className="print:break-inside-avoid">
          <AfterTaxSummary a={a} tax={tax} />
        </Panel>
      </div>
      <div>
        <Panel title="Assumptions used" description="Every input behind these numbers" className="print:break-inside-avoid">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4 lg:grid-cols-6">
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
          {record.rentRoll && record.rentRoll.length > 1 && (
            <div className="mt-4">
              <div className="mb-1 text-xs text-muted-foreground">Rent roll</div>
              <div className="divide-y rounded-lg border text-sm">
                {record.rentRoll.slice(0, record.units).map((u, i) => (
                  <div key={i} className="flex justify-between gap-4 px-3 py-1.5">
                    <span>{u.label || `Unit ${i + 1}`}{u.beds || u.baths ? <span className="text-xs text-muted-foreground"> · {u.beds || "—"} bd / {u.baths || "—"} ba</span> : null}</span>
                    <span className="num">{u.rent ? formatCurrency(dec(u.rent.replace(/[,$\s]/g, "") || "0")) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {record.notes && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line">{record.notes}</div>
          )}
        </Panel>
      </div>

      <div id="offer" className="scroll-mt-28">
        <OfferTools record={record} goals={goals} savedGoals={savedGoals} onGoalsChange={setGoals} />
      </div>

      {record.rehabPlan && <RehabBudget plan={record.rehabPlan} squareFeet={record.squareFeet} />}

      <div id="adu" className="scroll-mt-28">
        <SavedAdu record={record} analysis={a} />
      </div>

      <div id="market" className="scroll-mt-28 space-y-5">
      {record.otherEstimates && record.otherEstimates.length > 0 && (
        <Panel title="Outside estimates" description="Entered by hand from Zillow, Redfin, agents and others" className="print:break-inside-avoid">
          <OtherEstimatesSummary rows={record.otherEstimates} currentArv={record.afterRepairValue ?? ""} currentRent={record.monthlyRent} />
        </Panel>
      )}

      {record.marketData && (
        <Panel
          title="Market data"
          description="Automated estimates captured when this deal was analyzed"
          className="print:break-inside-avoid"
        >
          <MarketDataSummary data={record.marketData} />
        </Panel>
      )}
      </div>

      <Panel
        id="projection"
        title={`${a.sale.holdingPeriodYears}-year projection`}
        description="Rent, expenses and value compound at the growth rates entered; sale assumed at the end of the holding period."
        className="print:break-before-page"
      >
        <ProjectionPanel a={a} />
      </Panel>

      <div id="details" className="grid scroll-mt-28 items-start gap-5 lg:grid-cols-2">
        <Panel title="Loan amortization" description="Annual totals of the monthly schedule" className="print:hidden">
          <AmortizationTable a={a} />
        </Panel>
        <Panel title="How these numbers are calculated" description="Every metric's formula, in plain terms" className="print:break-before-page">
          {acquisitionFirst ? <FormulaReference /> : <FoldedFormulas />}
        </Panel>
      </div>

      <Disclaimer />
    </div>
  );
}

function FoldedFormulas() {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" /> Show formulas
      </summary>
      <div className="mt-4">
        <FormulaReference />
      </div>
    </details>
  );
}

function SavedAdu({ record, analysis }: { record: PropertyRecord; analysis: DealAnalysis }) {
  const r = useMemo(() => (record.aduInputs ? runAdu(record.aduInputs, recordToInputs(record), analysis, record.state) : null), [record, analysis]);
  if (!r || !record.aduInputs) return null;
  return <AduPanel r={r} s={record.aduInputs} stateCode={record.state?.toUpperCase() ?? null} base={analysis} />;
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

/** BRRRR / Flip deal page and report. */
function StrategyPropertyAnalysis({ record, criteria, showNav }: { record: PropertyRecord; criteria: InvestmentCriteria; showNav: boolean }) {
  const strategy = record.strategy as Exclude<StrategyValue, "BUY_HOLD">;
  const inputs = useMemo(() => recordToInputs(record), [record]);
  const saved = useMemo(() => resolveStrategyInputs(record.strategyInputs, String(criteria.minDscr)), [record.strategyInputs, criteria.minDscr]);
  const engine = useMemo(() => toEngineInputs(saved), [saved]);
  const [goals, setGoals] = useState<StrategyGoals>(saved.goals);
  const [pending, start] = useTransition();
  const brrrr = useMemo(() => (strategy === "BRRRR" ? analyzeBrrrr(inputs, engine) : undefined), [strategy, inputs, engine]);
  const flip = useMemo(() => (strategy === "FLIP" ? analyzeFlip(inputs, engine) : undefined), [strategy, inputs, engine]);
  const checks = useMemo(() => strategyChecks(strategy, goals, { brrrr, flip }, inputs), [strategy, goals, brrrr, flip, inputs]);
  const rating = rateStrategy(strategy, checks, { brrrr, flip });
  const base = useMemo(() => analyzeDeal(inputs), [inputs]); // for the ARV / 70% rule breakdown
  const hold = (brrrr ?? flip)!.hold;
  const dirty = JSON.stringify(goals) !== JSON.stringify(saved.goals);
  const acqLabel = { hardMoney: "Hard money", conventional: "Conventional mortgage", cash: "All cash" }[saved.acquisition.type];

  const nav = [
    { id: "overview", label: "Overview" },
    { id: "steps", label: brrrr ? "Step by step" : "Profit & loss" },
    { id: "offer", label: "Max offer" },
    ...(brrrr && record.aduInputs ? [{ id: "adu", label: "ADU" }] : []),
    ...(record.marketData || record.otherEstimates?.length ? [{ id: "market", label: "Market data" }] : []),
    ...(brrrr ? [{ id: "projection", label: "Projection" }] : []),
  ];
  return (
    <div className="space-y-5">
      {showNav && <SectionNav items={nav} />}
      <div id="overview" className="scroll-mt-28" />
      <CriteriaPanel rating={rating} checks={checks} footer="Goals for this deal are set under Max offer price below." />
      {brrrr ? <BrrrrMetrics b={brrrr} columns={3} /> : <FlipMetrics f={flip!} columns={3} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel id="steps" title={brrrr ? "BRRRR step by step" : "Profit & loss"} className="print:break-inside-avoid">
          {brrrr ? <BrrrrSteps b={brrrr} input={inputs} /> : <FlipStatement f={flip!} input={inputs} />}
        </Panel>
        {brrrr ? (
          <Panel title="Rental after refinance" description="Year 1 with the new loan" className="print:break-inside-avoid">
            <CashFlowStatement a={brrrr.rental} />
          </Panel>
        ) : (
          <Panel title="Financing & holding" className="print:break-inside-avoid">
            <dl className="divide-y text-sm">
              {[
                ["Purchase loan", `${acqLabel}${hold.loanAmount.gt(0) ? ` · ${formatCurrency(hold.loanAmount)}` : ""}`],
                ["Interest while holding", formatCurrency(hold.interestPaid)],
                ["Points", formatCurrency(hold.points)],
                ["Hold time", `${hold.months} months`],
                ["Carrying costs", `${formatCurrency(hold.monthlyHoldingCost)}/mo · ${formatCurrency(hold.holdingCosts)} total`],
                ["Selling costs", `${trimZeros(saved.flip.sellingCostPct)}% · ${formatCurrency(flip!.sellingCosts)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="num text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <ArvBreakdown a={base} className="mt-3" />
          </Panel>
        )}
      </div>

      {brrrr && (
        <Panel title="After-repair value" className="print:break-inside-avoid">
          <ArvBreakdown a={base} />
          {!base.afterRepairValue && <p className="text-sm text-muted-foreground">No ARV entered — the refinance uses purchase price + rehab.</p>}
        </Panel>
      )}

      <div id="offer" className="scroll-mt-28">
      <StrategyOfferTools
        strategy={strategy}
        inputs={inputs}
        s={engine}
        goals={goals}
        onGoalsChange={setGoals}
        action={
          dirty ? (
            <Button
              size="sm"
              className="no-print"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveStrategyGoals(record.id, goals);
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
      </div>

      {record.rehabPlan && <RehabBudget plan={record.rehabPlan} squareFeet={record.squareFeet} />}

      <div id="adu" className="scroll-mt-28">{brrrr && <SavedAdu record={record} analysis={brrrr.rental} />}</div>

      <div id="market" className="scroll-mt-28 space-y-5">
      {record.otherEstimates && record.otherEstimates.length > 0 && (
        <Panel title="Outside estimates" description="Entered by hand from Zillow, Redfin, agents and others" className="print:break-inside-avoid">
          <OtherEstimatesSummary rows={record.otherEstimates} currentArv={record.afterRepairValue ?? ""} currentRent={record.monthlyRent} />
        </Panel>
      )}

      {record.marketData && (
        <Panel title="Market data" description="Automated estimates captured when this deal was analyzed" className="print:break-inside-avoid">
          <MarketDataSummary data={record.marketData} />
        </Panel>
      )}
      </div>

      {brrrr && (
        <Panel
          id="projection"
          title={`${brrrr.rental.sale.holdingPeriodYears}-year projection after refinance`}
          description="Rent, expenses and value compound from the ARV; returns are measured on the cash left in the deal."
          className="print:break-before-page"
        >
          <ProjectionPanel
            a={brrrr.rental}
            note={
              brrrr.cashLeftInDeal.lte(brrrr.hold.totalCashIn.times("0.25"))
                ? `IRR and equity multiple look very high because only ${brrrr.cashLeftInDeal.gt(0) ? formatCurrency(brrrr.cashLeftInDeal) : "$0"} of your ${formatCurrency(brrrr.hold.totalCashIn)} stays in the deal after the refinance — that's the point of BRRRR. Judge it by the cash flow and cash left, too.`
                : undefined
            }
          />
        </Panel>
      )}

      <Disclaimer />
    </div>
  );
}
