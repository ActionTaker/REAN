"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, CheckCircle2, ChevronRight, Circle, Info, ListChecks, Loader2, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SampleBadge } from "@/components/common/sample-badge";
import { Disclaimer } from "@/components/common/disclaimer";
import { cn } from "@/lib/utils";
import { DEAL_STATUSES, PROPERTY_TYPES, US_STATES } from "@/lib/constants";
import { analyzeBrrrr, analyzeDeal, analyzeFlip, chartNumber, dec, formatCurrency, formatPercent, type InvestmentCriteria } from "@/lib/finance";
import { formValuesToInputs } from "@/lib/property-mapping";
import { dealSchema, type DealFormOutput, type DealFormValues } from "@/lib/validation/deal";
import { saveDeal } from "@/app/actions/properties";
import { RehabEstimator } from "./rehab-estimator";
import { DealTools } from "./deal-tools";
import {
  BrrrrMetrics,
  BrrrrSteps,
  FlipMetrics,
  FlipStatement,
  StrategyInputCards,
  StrategyOfferTools,
  StrategyPicker,
  rateStrategy,
  strategyChecks,
} from "./strategy-panels";
import { resolveStrategyInputs, toEngineInputs, type SavedStrategyInputs, type StrategyValue } from "@/lib/strategy";
import { CompsArvSheet } from "./comps-arv-sheet";
import { emptyArvAnalysis, type ArvAnalysis } from "@/lib/property-data/arv-analysis";
import { perUnitSubject } from "@/lib/property-data/comps-arv";
import { cashFlowRequired, rateAgainstGoals, resolveOfferGoals, type OfferGoals } from "@/lib/offer-goals";
import { buildRehabPlan, regionalFactor, rehabTotals, type RehabPlan } from "@/lib/estimates/rehab";
import { suggestAduRent } from "@/lib/finance/adu";
import { defaultAduInputs, runAdu, type SavedAduInputs } from "@/lib/adu";
import { AduMetrics, AduSection } from "./adu-panels";
import { estimateClosingCosts, estimateInsurance, estimatePropertyTax, type CostEstimate } from "@/lib/estimates/costs";
import { ArvBreakdown, CashFlowStatement, CriteriaPanel, KeyMetrics, SaleSummary } from "./analysis-panels";
import { NumberInput } from "./number-input";
import { AfterTaxSummary } from "./tax-panel";
import { RentRollEditor } from "./rent-roll";
import { OtherEstimatesSection } from "./other-estimates";
import type { OtherEstimate } from "@/lib/other-estimates";
import { rentRollTotal, rollForUnits, seedRentRoll, type RentRollRow } from "@/lib/rent-roll";
import { DEFAULT_TAX_ASSUMPTIONS, type TaxAssumptions } from "@/lib/finance/tax";
import { AddressLookup } from "./address-lookup";
import type { PropertyLookup } from "@/lib/property-data/types";
import { formatAddress } from "@/lib/property-mapping";
import { ProjectionChart } from "@/components/charts/projection-chart";

type Name = FieldPath<DealFormValues>;

interface Props {
  propertyId: string | null;
  defaultValues: DealFormValues;
  criteria: InvestmentCriteria;
  isSample?: boolean;
  /** Market data saved with this deal (edit page), so the Comps & ARV panel opens without a new lookup. */
  initialMarketData?: PropertyLookup | null;
  /** After-tax estimate assumptions (Settings). */
  tax?: TaxAssumptions;
}

export function DealForm({ propertyId, defaultValues, criteria, isSample, initialMarketData = null, tax = DEFAULT_TAX_ASSUMPTIONS }: Props) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const form = useForm<DealFormValues, unknown, DealFormOutput>({
    resolver: zodResolver(dealSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setValue, setError, getValues, formState } = form;
  const errors = formState.errors;

  // Live analysis — recomputed from whatever is typed, invalid fields count as 0.
  const values = useWatch({ control }) as DealFormValues;
  const deferred = useDeferredValue(values);
  const liveInputs = useMemo(() => formValuesToInputs(deferred), [deferred]);
  const analysis = useMemo(() => analyzeDeal(liveInputs), [liveInputs]);
  // Rated against this deal's own goals (set in Max offer price below).
  const offerGoals = useMemo(() => resolveOfferGoals(values.offerGoals as OfferGoals | null, criteria), [values.offerGoals, criteria]);
  const { checks: holdChecks, rating: holdRating } = useMemo(() => rateAgainstGoals(analysis, offerGoals), [analysis, offerGoals]);

  // ── Strategy (Buy & Hold / BRRRR / Flip) ──
  const strategy = ((values.strategy as StrategyValue | undefined) ?? "BUY_HOLD") as StrategyValue;
  const sSaved = useMemo(
    () => resolveStrategyInputs(values.strategyInputs as SavedStrategyInputs | null, String(criteria.minDscr)),
    [values.strategyInputs, criteria.minDscr],
  );
  const sEngine = useMemo(() => toEngineInputs(sSaved), [sSaved]);
  const brrrr = useMemo(() => (strategy === "BRRRR" ? analyzeBrrrr(liveInputs, sEngine) : undefined), [strategy, liveInputs, sEngine]);
  const flip = useMemo(() => (strategy === "FLIP" ? analyzeFlip(liveInputs, sEngine) : undefined), [strategy, liveInputs, sEngine]);
  // Show results only once the numbers that drive them exist (otherwise a blank form reads as "negative cash flow").
  const hasBasics =
    dec(liveInputs.purchasePrice as string).gt(0) &&
    (strategy === "FLIP" ? dec(liveInputs.afterRepairValue as string).gt(0) || !!sSaved.flip.salePrice : dec(liveInputs.monthlyRent as string).gt(0));
  const setStrategyInputs = (next: SavedStrategyInputs) => setValue("strategyInputs", next as never, { shouldDirty: true });
  const { checks, rating } = useMemo(() => {
    if (strategy === "BUY_HOLD") return { checks: holdChecks, rating: holdRating };
    const c = strategyChecks(strategy, sSaved.goals, { brrrr, flip }, liveInputs);
    return { checks: c, rating: rateStrategy(strategy, c, { brrrr, flip }) };
  }, [strategy, holdChecks, holdRating, sSaved.goals, brrrr, flip, liveInputs]);
  const isCash = !!values.isCashPurchase;

  // ── Rent roll (2+ units): the per-unit rents' total is the deal's monthly rent ──
  const rentRoll = (values.rentRoll ?? null) as RentRollRow[] | null;
  const rollUnits = parseInt(String(values.units ?? ""), 10) || 1;
  const rollTotal = rentRoll ? rentRollTotal(rollForUnits(rentRoll, rollUnits)).toString() : null;
  useEffect(() => {
    // Keep monthlyRent in step when the unit count changes the roll's size.
    if (rollTotal !== null && rollTotal !== String(getValues("monthlyRent") ?? "")) {
      setValue("monthlyRent", rollTotal as never, { shouldDirty: true, shouldValidate: true });
    }
  }, [rollTotal, getValues, setValue]);
  const setRentRoll = (rows: RentRollRow[] | null) => setValue("rentRoll", rows as never, { shouldDirty: true });

  // ── ADU scenario (rentals only) ──
  const aduSaved = strategy === "FLIP" ? null : ((values.aduInputs ?? null) as SavedAduInputs | null);
  const aduCostIndex = regionalFactor(values.state).factor.toString();
  const aduRentSuggestion = useMemo(() => {
    const units = Math.max(1, parseInt(String(values.units ?? ""), 10) || 1);
    const sqft = parseInt(String(values.squareFeet ?? ""), 10) || null;
    const rent = dec(liveInputs.monthlyRent as string).div(units);
    return aduSaved ? suggestAduRent(rent, sqft ? sqft / units : null, aduSaved.squareFeet.replace(/[,\s]/g, "") || "0") : null;
  }, [values.units, values.squareFeet, liveInputs.monthlyRent, aduSaved]);
  const rentalView = brrrr?.rental ?? analysis;
  const adu = useMemo(
    () => (aduSaved && dec(aduSaved.squareFeet.replace(/[,\s]/g, "") || "0").gt(0) ? runAdu(aduSaved, liveInputs, rentalView, values.state) : null),
    [aduSaved, liveInputs, rentalView, values.state],
  );
  const setAdu = (next: SavedAduInputs | null) => setValue("aduInputs", next as never, { shouldDirty: true });
  const [lookupAddress, setLookupAddress] = useState<string | null>(null);
  const [showLongTerm, setShowLongTerm] = useState(false);

  // ── Comps & ARV panel ──
  const [marketData, setMarketData] = useState<PropertyLookup | null>(initialMarketData);
  const [compsOpen, setCompsOpen] = useState<null | "sale" | "rent">(null);
  const arvAnalysis = (values.arvAnalysis as ArvAnalysis | null) ?? emptyArvAnalysis("sale");
  const rentAnalysis = (values.rentAnalysis as ArvAnalysis | null) ?? emptyArvAnalysis("rent");
  const subjectNum = (v: unknown) => {
    const n = Number(String(v ?? "").replace(/[,\s]/g, ""));
    return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : null;
  };
  const compSubject = useMemo(
    () => ({
      squareFeet: subjectNum(values.squareFeet) ?? marketData?.facts.squareFeet ?? null,
      bedrooms: subjectNum(values.bedrooms) ?? marketData?.facts.bedrooms ?? null,
      bathrooms: String(values.bathrooms ?? "").trim() || (marketData?.facts.bathrooms != null ? String(marketData.facts.bathrooms) : null),
      yearBuilt: subjectNum(values.yearBuilt) ?? marketData?.facts.yearBuilt ?? null,
    }),
    [values.squareFeet, values.bedrooms, values.bathrooms, values.yearBuilt, marketData],
  );

  // ── Estimates that pre-fill fields until the user types their own number ──
  const sqftNum = parseInt(String(values.squareFeet ?? ""), 10) || null;
  const unitsNum = parseInt(String(values.units ?? ""), 10) || 1;
  const priceStr = formValuesToInputs(values).purchasePrice as string;
  const insuranceEst = useMemo(
    () => estimateInsurance({ state: values.state, squareFeet: sqftNum, price: priceStr }),
    [values.state, sqftNum, priceStr],
  );
  const closingEst = useMemo(() => estimateClosingCosts({ state: values.state, price: priceStr }), [values.state, priceStr]);
  const insuranceAuto = useAutoEstimate("insuranceAnnual", insuranceEst, getValues, setValue);
  const closingAuto = useAutoEstimate("closingCosts", closingEst, getValues, setValue);
  const taxEst = useMemo(() => estimatePropertyTax({ state: values.state, price: priceStr }), [values.state, priceStr]);
  const taxAuto = useAutoEstimate("propertyTaxAnnual", taxEst, getValues, setValue);

  // ── Rehab plan: rebuild from property facts until customized; its total drives rehabCosts ──
  const rehabPlan = (values.rehabPlan ?? null) as RehabPlan | null;
  const rehabCtx = useMemo(
    () => ({ squareFeet: sqftNum, bathrooms: String(values.bathrooms ?? ""), units: unitsNum, state: values.state }),
    [sqftNum, values.bathrooms, unitsNum, values.state],
  );
  const setRehabPlan = (plan: RehabPlan | null) => {
    setValue("rehabPlan", plan as never, { shouldDirty: true });
    if (plan) {
      const t = rehabTotals({ items: plan.items.map((i) => ({ ...i, amount: i.amount.replace(/[,$\s]/g, "") || "0" })), contingencyPct: plan.contingencyPct || "0" });
      setValue("rehabCosts", t.total.toString(), { shouldDirty: true, shouldValidate: true });
    }
  };
  useEffect(() => {
    const current = getValues("rehabPlan") as RehabPlan | null;
    if (!current || current.customized) return;
    const { assumptions: _a, ...next } = buildRehabPlan(current.scope, rehabCtx);
    if (JSON.stringify(next.items) !== JSON.stringify(current.items)) setRehabPlan({ ...next, contingencyPct: current.contingencyPct });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehabCtx]);

  /** Copy lookup results into the form. Everything stays editable; purchase price is only filled when empty. */
  const applyLookup = (d: PropertyLookup, address: string) => {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    const filled: string[] = [];
    const set = (name: Name, v: string | number | null | undefined, label?: string) => {
      if (v === null || v === undefined || v === "") return;
      setValue(name, String(v) as never, opts);
      if (label) filled.push(label);
    };
    if (!getValues("name")) set("name", d.address.line1 ?? d.address.formatted);
    set("address", d.address.line1);
    set("city", d.address.city);
    set("state", d.address.state);
    set("zip", d.address.zip);
    set("propertyType", d.facts.propertyType, "property type");
    set("units", d.facts.units);
    set("bedrooms", d.facts.bedrooms);
    set("bathrooms", d.facts.bathrooms);
    set("squareFeet", d.facts.squareFeet);
    set("yearBuilt", d.facts.yearBuilt);
    set("propertyTaxAnnual", d.propertyTaxAnnual?.amount, "taxes");
    set("hoaMonthly", d.hoaMonthly, "HOA");
    // Comp-based market rent (adjusted comps) × units; RentCast's own estimate as a fallback.
    if (d.rent) setValue("rentRoll", null as never, { shouldDirty: true });
    set("monthlyRent", d.rent?.compsPerUnit ? dec(d.rent.compsPerUnit).times(Math.max(1, d.rent.units)).toString() : d.rent?.total, "rent");
    set("afterRepairValue", d.arv?.estimate, "ARV");
    if (!String(getValues("purchasePrice") ?? "").trim()) set("purchasePrice", d.value?.estimate, "price (as-is value)");
    setLookupAddress(address);
    toast.success(`Applied ${filled.join(", ") || "property details"}. Review every number before saving.`);
  };

  const onSubmit = (data: DealFormOutput) =>
    startSaving(async () => {
      // Send the raw strings; the server re-validates with the same schema.
      const res = await saveDeal(propertyId, getValues(), lookupAddress);
      if (!res.ok) {
        for (const [k, msgs] of Object.entries(res.fieldErrors ?? {})) {
          if (msgs?.[0]) setError(k as Name, { message: msgs[0] });
        }
        toast.error(res.error);
        return;
      }
      toast.success(propertyId ? "Analysis updated" : `“${data.name}” saved to My Properties`);
      router.push(`/properties/${res.id}`);
      router.refresh();
    });

  const err = (n: Name) => {
    const e = n.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], errors) as { message?: string } | undefined;
    return e?.message;
  };

  const num = (n: Name, label: string, opts: { prefix?: string; suffix?: string; hint?: React.ReactNode; disabled?: boolean; className?: string } = {}) => (
    <div className={cn("space-y-1.5", opts.className)}>
      <Label htmlFor={n} className={cn("text-xs", opts.disabled && "opacity-50")}>{label}</Label>
      <NumberInput id={n} prefix={opts.prefix} suffix={opts.suffix} disabled={opts.disabled} aria-invalid={!!err(n)} {...register(n)} />
      {err(n) ? <p className="text-xs text-destructive">{err(n)}</p> : opts.hint ? <div className="text-[11px] leading-snug text-muted-foreground">{opts.hint}</div> : null}
    </div>
  );

  const text = (n: Name, label: string, opts: { placeholder?: string; className?: string } = {}) => (
    <div className={cn("space-y-1.5", opts.className)}>
      <Label htmlFor={n} className="text-xs">{label}</Label>
      <Input id={n} placeholder={opts.placeholder} aria-invalid={!!err(n)} {...register(n)} />
      {err(n) && <p className="text-xs text-destructive">{err(n)}</p>}
    </div>
  );

  const select = (n: Name, label: string, options: readonly { value: string; label: string }[], onChange?: (v: string) => void, className?: string) => (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      <Controller
        control={control}
        name={n}
        render={({ field }) => (
          <Select
            value={String(field.value ?? "")}
            onValueChange={(v) => {
              field.onChange(v);
              onChange?.(v);
            }}
          >
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );

  const financingFields = (
    <div className="grid gap-4 sm:grid-cols-3">
            {num("downPaymentPercent", "Down payment", { suffix: "%", disabled: isCash, hint: isCash ? undefined : `= ${formatCurrency(analysis.downPayment)} · loan ${formatCurrency(analysis.loanAmount)}` })}
            {num("interestRate", "Interest rate", { suffix: "%", disabled: isCash, hint: isCash ? undefined : `P&I ${formatCurrency(analysis.monthlyMortgagePayment, { cents: true })}/mo` })}
            {num("loanTermYears", "Loan term", { suffix: "years", disabled: isCash })}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Own grid so the sticky Live analysis panel stops at the end of the inputs
          instead of sliding over the full-width Offer & risk card below. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      {/* ── Inputs ─────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {isSample && (
          <div className="flex items-center gap-2 rounded-lg border border-sample-foreground/20 bg-sample px-3 py-2 text-xs text-sample-foreground">
            <SampleBadge /> You&apos;re editing a sample property. Changes are saved, but it stays labelled as sample data.
          </div>
        )}

        <StrategyPicker value={strategy} onChange={(v) => setValue("strategy", v as never, { shouldDirty: true })} />

        <AddressLookup
          initialAddress={formatAddress({
            address: defaultValues.address || null,
            city: defaultValues.city || null,
            state: defaultValues.state || null,
            zip: defaultValues.zip || null,
          })}
          onApply={applyLookup}
          onLookup={(d, address) => {
            setMarketData(d);
            setLookupAddress(address); // so the snapshot is saved with the deal
          }}
          onOpenComps={(mode) => setCompsOpen(mode)}
          onAddressSelected={(sug) => {
            const opts = { shouldDirty: true } as const;
            if (!getValues("name")) setValue("name", sug.line1, opts);
            setValue("address", sug.line1, opts);
            if (sug.city) setValue("city", sug.city, opts);
            if (sug.state) setValue("state", sug.state, opts);
            if (sug.zip) setValue("zip", sug.zip, opts);
          }}
        />

        <Section title="Property" description="Basic details used for per-unit and per-square-foot metrics.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
            {text("name", "Deal name *", { placeholder: "e.g. Maple St Duplex", className: "col-span-2 sm:col-span-4" })}
            {select("status", "Status", DEAL_STATUSES, undefined, "col-span-2 sm:col-span-2")}
            {text("address", "Street address", { className: "col-span-2 sm:col-span-6" })}
            {text("city", "City", { className: "col-span-2 sm:col-span-3" })}
            {select("state", "State", US_STATES.map((s) => ({ value: s, label: s })), undefined, "sm:col-span-1")}
            {text("zip", "ZIP", { className: "sm:col-span-2" })}
            {select(
              "propertyType",
              "Property type",
              PROPERTY_TYPES,
              (v) => {
                const t = PROPERTY_TYPES.find((p) => p.value === v);
                if (t) setValue("units", String(t.units), { shouldDirty: true });
              },
              "col-span-2 sm:col-span-3",
            )}
            {num("units", "Units", { className: "sm:col-span-1" })}
            {num("squareFeet", "Sq ft", { className: "sm:col-span-2" })}
            {num("bedrooms", "Beds", { className: "sm:col-span-2" })}
            {num("bathrooms", "Baths", { className: "sm:col-span-2" })}
            {num("yearBuilt", "Year built", { className: "sm:col-span-2" })}
          </div>
        </Section>

        <Section title="Purchase" description="Your all-in acquisition cost and, optionally, the value after repairs.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {num("purchasePrice", "Purchase price *", { prefix: "$" })}
            {num("closingCosts", "Closing costs", { prefix: "$", hint: <EstimateHint est={closingEst} auto={closingAuto} fallback="Enter price & state to estimate" /> })}
            {num("rehabCosts", "Rehab / repairs", {
              prefix: "$",
              disabled: !!rehabPlan,
              hint: rehabPlan ? "From the rehab scope below" : "Pick a scope below to estimate",
            })}
            {num("afterRepairValue", "After-repair value", {
              prefix: "$",
              hint:
                (marketData?.value?.comparables.length ?? 0) > 0 ? (
                  <Button type="button" variant="outline" size="sm" className="mt-1 border-series-1/40 text-series-1 hover:text-series-1" onClick={() => setCompsOpen("sale")}>
                    <ListChecks /> Review comps & ARV
                  </Button>
                ) : strategy !== "BUY_HOLD" && !analysis.afterRepairValue ? (
                  <span className="text-caution">Needed for {strategy === "BRRRR" ? "the refinance" : "the sale"}</span>
                ) : analysis.equityCreated ? (
                  "Calculation shown below"
                ) : (
                  "Optional — look up the address for comps"
                ),
            })}
          </div>
          <RehabEstimator plan={rehabPlan} ctx={rehabCtx} onChange={setRehabPlan} />
          <ArvBreakdown a={analysis} className="mt-4" />
        </Section>

        {strategy === "BUY_HOLD" ? (
        <Section
          title="Financing"
          description="Fixed-rate mortgage assumptions."
          action={
            <Controller
              control={control}
              name="isCashPurchase"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs font-medium">
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  All-cash purchase
                </label>
              )}
            />
          }
        >
          {financingFields}
        </Section>
        ) : (
          <StrategyInputCards
            strategy={strategy}
            s={sSaved}
            onChange={setStrategyInputs}
            hold={(brrrr ?? flip)!.hold}
            conventionalFields={financingFields}
            arv={dec(liveInputs.afterRepairValue as string).gt(0) ? dec(liveInputs.afterRepairValue as string) : null}
          />
        )}

        {strategy !== "FLIP" && (
        <Section
          title="Rental income"
          description={strategy === "BRRRR" ? "Rent once the rehab is done — this pays the refinanced loan." : "Enter the total for all units."}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {num("monthlyRent", rentRoll ? "Monthly rent (rent roll total)" : "Monthly rent (all units)", {
              prefix: "$",
              disabled: !!rentRoll,
              hint: !rentRoll && rollUnits > 1 ? (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <button type="button" className="font-medium text-foreground underline underline-offset-2" onClick={() => setRentRoll(seedRentRoll(String(values.monthlyRent ?? ""), rollUnits))}>
                    Enter rent per unit
                  </button>
                  {(marketData?.rent?.comparables.length ?? 0) > 0 && (
                    <Button type="button" variant="outline" size="sm" className="mt-1 border-series-1/40 text-series-1 hover:text-series-1" onClick={() => setCompsOpen("rent")}>
                      <ListChecks /> Review rent comps
                    </Button>
                  )}
                </span>
              ) :
                (marketData?.rent?.comparables.length ?? 0) > 0 ? (
                  <Button type="button" variant="outline" size="sm" className="mt-1 border-series-1/40 text-series-1 hover:text-series-1" onClick={() => setCompsOpen("rent")}>
                    <ListChecks /> Review rent comps
                  </Button>
                ) : undefined,
            })}
            {num("otherMonthlyIncome", "Other monthly income", { prefix: "$", hint: "Laundry, parking, storage, pet fees" })}
            {num("vacancyRate", "Vacancy rate", { suffix: "%", hint: "5–8% is common for SFR" })}
          </div>
          {rentRoll && (
            <div className="mt-4">
              <RentRollEditor rows={rentRoll} units={rollUnits} onChange={setRentRoll} onRemove={() => setRentRoll(null)} />
            </div>
          )}
        </Section>
        )}

        {strategy === "FLIP" ? (
          <Section title="Carrying costs" description="Owned while you rehab and sell: taxes, insurance and HOA (utilities are under Rehab & holding).">
            <div className="grid gap-4 sm:grid-cols-3">
              {num("propertyTaxAnnual", "Property taxes", {
              prefix: "$",
              suffix: "/yr",
              hint: (
                <TaxHint
                  est={taxEst}
                  auto={taxAuto}
                  record={marketData?.propertyTaxAnnual ?? null}
                  current={String(values.propertyTaxAnnual ?? "")}
                  onUseRecord={(v) => setValue("propertyTaxAnnual", v as never, { shouldDirty: true, shouldValidate: true })}
                />
              ),
            })}
              {num("insuranceAnnual", "Insurance", { prefix: "$", suffix: "/yr", hint: <EstimateHint est={insuranceEst} auto={insuranceAuto} fallback="Enter state & sq ft to estimate" /> })}
              {num("hoaMonthly", "HOA fees", { prefix: "$", suffix: "/mo" })}
            </div>
          </Section>
        ) : (
        <Section title="Operating expenses" description="Fixed costs plus reserves estimated as a share of income.">
          <div className="grid gap-4 sm:grid-cols-3">
            {num("propertyTaxAnnual", "Property taxes", {
              prefix: "$",
              suffix: "/yr",
              hint: (
                <TaxHint
                  est={taxEst}
                  auto={taxAuto}
                  record={marketData?.propertyTaxAnnual ?? null}
                  current={String(values.propertyTaxAnnual ?? "")}
                  onUseRecord={(v) => setValue("propertyTaxAnnual", v as never, { shouldDirty: true, shouldValidate: true })}
                />
              ),
            })}
            {num("insuranceAnnual", "Insurance", { prefix: "$", suffix: "/yr", hint: <EstimateHint est={insuranceEst} auto={insuranceAuto} fallback="Enter state & sq ft to estimate" /> })}
            {num("hoaMonthly", "HOA fees", { prefix: "$", suffix: "/mo" })}
            {num("utilitiesMonthly", "Utilities (owner-paid)", { prefix: "$", suffix: "/mo" })}
            {num("otherMonthlyExpenses", "Other expenses", { prefix: "$", suffix: "/mo", hint: "Lawn, pest, snow, accounting" })}
            <div className="hidden sm:block" />
            {num("maintenancePercent", "Repairs & maintenance", { suffix: "% gross", hint: "Of gross monthly income" })}
            {num("capexPercent", "CapEx reserve", { suffix: "% gross", hint: "Roof, HVAC, water heater…" })}
            {num("managementPercent", "Property management", { suffix: "% coll.", hint: "Of collected rent (after vacancy)" })}
          </div>
        </Section>
        )}

        {strategy !== "FLIP" && (
        <Section
          title="Long-term assumptions"
          description={
            showLongTerm
              ? "Used for the multi-year projection, sale and IRR. These are assumptions, not forecasts."
              : `Appreciation ${values.appreciationRate || 0}% · rent growth ${values.rentGrowthRate || 0}% · expense growth ${values.expenseGrowthRate || 0}% · selling ${values.sellingCostPercent || 0}% · ${values.holdingPeriodYears || 0}-year hold`
          }
          action={
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowLongTerm((v) => !v)} aria-expanded={showLongTerm}>
              {showLongTerm ? "Done" : "Edit"}
            </Button>
          }
        >
          {showLongTerm && (
          <div className="grid gap-4 sm:grid-cols-5">
            {num("appreciationRate", "Appreciation", { suffix: "%/yr" })}
            {num("rentGrowthRate", "Rent growth", { suffix: "%/yr" })}
            {num("expenseGrowthRate", "Expense growth", { suffix: "%/yr" })}
            {num("sellingCostPercent", "Selling costs", { suffix: "%" })}
            {num("holdingPeriodYears", "Hold period", { suffix: "yrs" })}
          </div>
          )}
        </Section>
        )}

        {strategy !== "FLIP" && (
          <AduSection
            value={aduSaved}
            onChange={setAdu}
            onEnable={() => {
              const units = Math.max(1, parseInt(String(values.units ?? ""), 10) || 1);
              const sqft = parseInt(String(values.squareFeet ?? ""), 10) || null;
              const rent = suggestAduRent(dec(liveInputs.monthlyRent as string).div(units), sqft ? sqft / units : null, "600");
              setAdu(defaultAduInputs(aduCostIndex, rent?.toString() ?? null));
            }}
            costIndex={aduCostIndex}
            stateCode={regionalFactor(values.state).code}
            rentSuggestion={aduRentSuggestion}
            dealCapRate={rentalView.capRate}
          />
        )}

        <OtherEstimatesSection
          rows={(values.otherEstimates ?? []) as OtherEstimate[]}
          onChange={(rows) => setValue("otherEstimates", (rows.length ? rows : null) as never, { shouldDirty: true })}
          currentArv={String(values.afterRepairValue ?? "")}
          currentRent={String(values.monthlyRent ?? "")}
          onUseArv={(v) => {
            setValue("afterRepairValue", v as never, { shouldDirty: true, shouldValidate: true });
            toast.success(`ARV set to ${formatCurrency(dec(v))}`);
          }}
          onUseRent={(v) => {
            setValue("rentRoll", null as never, { shouldDirty: true });
            setValue("monthlyRent", v as never, { shouldDirty: true, shouldValidate: true });
            toast.success(`Rent set to ${formatCurrency(dec(v))}/mo`);
          }}
        />

        {marketData && (
          <CompsArvSheet
            mode="sale"
            open={compsOpen === "sale"}
            onOpenChange={(o) => setCompsOpen(o ? "sale" : null)}
            lookup={marketData}
            subject={compSubject}
            subjectInputs={{
              squareFeet: String(values.squareFeet ?? ""),
              bedrooms: String(values.bedrooms ?? ""),
              bathrooms: String(values.bathrooms ?? ""),
              yearBuilt: String(values.yearBuilt ?? ""),
            }}
            onSubjectChange={(field, v) => setValue(field, v as never, { shouldDirty: true, shouldValidate: true })}
            analysis={arvAnalysis}
            onAnalysisChange={(a) => setValue("arvAnalysis", a as never, { shouldDirty: true })}
            currentArv={String(values.afterRepairValue ?? "")}
            onUseArv={(v, method) => {
              setValue("afterRepairValue", v as never, { shouldDirty: true, shouldValidate: true });
              setValue("arvAnalysis", { ...arvAnalysis, method } as never, { shouldDirty: true });
              toast.success(`ARV set to ${formatCurrency(dec(v))}`);
            }}
          />
        )}
        {marketData?.rent && (
          <CompsArvSheet
            mode="rent"
            open={compsOpen === "rent"}
            onOpenChange={(o) => setCompsOpen(o ? "rent" : null)}
            lookup={marketData}
            subject={perUnitSubject({ ...compSubject, units: unitsNum })}
            subjectInputs={{
              squareFeet: String(values.squareFeet ?? ""),
              bedrooms: String(values.bedrooms ?? ""),
              bathrooms: String(values.bathrooms ?? ""),
              yearBuilt: String(values.yearBuilt ?? ""),
            }}
            onSubjectChange={(field, v) => setValue(field, v as never, { shouldDirty: true, shouldValidate: true })}
            analysis={rentAnalysis}
            onAnalysisChange={(a) => setValue("rentAnalysis", a as never, { shouldDirty: true })}
            currentArv={dec(formValuesToInputs(values).monthlyRent as string).div(Math.max(1, unitsNum)).toDecimalPlaces(2).toString()}
            onUseArv={(v, method) => {
              const total = dec(v).times(Math.max(1, unitsNum)).toString();
              setValue("rentRoll", null as never, { shouldDirty: true }); // one total from comps replaces per-unit rents
              setValue("monthlyRent", total as never, { shouldDirty: true, shouldValidate: true });
              setValue("rentAnalysis", { ...rentAnalysis, method } as never, { shouldDirty: true });
              toast.success(`Rent set to ${formatCurrency(dec(total))}/mo${unitsNum > 1 ? ` (${unitsNum} units × ${formatCurrency(dec(v))})` : ""}`);
            }}
          />
        )}

        <Section title="Notes">
          <Textarea rows={3} placeholder="Condition, comps, rent sources, questions for the agent…" {...register("notes")} />
        </Section>
      </div>

      {/* ── Live results ───────────────────────────────────────────────── */}
      <aside className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto xl:pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Live analysis</h2>
          <span className="text-xs text-muted-foreground">updates as you type</span>
          <div className="ml-auto flex gap-2">
            {propertyId && (
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href={`/properties/${propertyId}`}>Cancel</Link>
              </Button>
            )}
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {propertyId ? "Save changes" : "Save deal"}
            </Button>
          </div>
        </div>

        {!hasBasics ? (
          <div className="rounded-xl border border-dashed bg-card p-6 text-center shadow-xs">
            <Calculator className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Results appear as you type</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {strategy === "FLIP"
                ? "Enter a purchase price and an ARV (or sale price) to see profit and ROI."
                : "Enter a purchase price and monthly rent — or look up an address above to fill both."}
            </p>
            <ul className="mx-auto mt-3 w-fit space-y-1 text-left text-xs">
              <li className="flex items-center gap-2">
                {dec(liveInputs.purchasePrice as string).gt(0) ? <CheckCircle2 className="size-3.5 text-positive" /> : <Circle className="size-3.5 text-muted-foreground" />}
                Purchase price
              </li>
              <li className="flex items-center gap-2">
                {(strategy === "FLIP" ? dec(liveInputs.afterRepairValue as string) : dec(liveInputs.monthlyRent as string)).gt(0) ? (
                  <CheckCircle2 className="size-3.5 text-positive" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground" />
                )}
                {strategy === "FLIP" ? "After-repair value" : "Monthly rent"}
              </li>
            </ul>
          </div>
        ) : (
          <>
        <CriteriaPanel
          rating={rating}
          checks={checks}
          stacked
          cashFlowNote={strategy === "BUY_HOLD" && !cashFlowRequired(offerGoals) && analysis.monthlyCashFlow.isNegative()}
          footer="Goals come from Max offer price below — change the strategy or targets there."
        />

        {strategy === "BUY_HOLD" && (
        <Tabs defaultValue="summary">
          <TabsList className="w-full">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
            <TabsTrigger value="longterm">Long-term</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-3">
            <KeyMetrics a={analysis} columns={2} checks={holdChecks} />
          </TabsContent>
          <TabsContent value="cashflow" className="mt-3 rounded-xl border bg-card p-2 shadow-xs">
            <CashFlowStatement a={analysis} />
            <details className="group mt-2 border-t px-2 pt-2">
              <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-xs font-medium text-muted-foreground group-open:text-foreground">
                <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" /> After tax (depreciation &amp; interest)
              </summary>
              <AfterTaxSummary a={analysis} tax={tax} />
            </details>
          </TabsContent>
          <TabsContent value="longterm" className="mt-3 space-y-4">
            <SaleSummary a={analysis} />
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <ProjectionChart
                data={analysis.projections.map((p) => ({
                  year: p.year,
                  propertyValue: chartNumber(p.propertyValue, 0),
                  loanBalance: chartNumber(p.loanBalance, 0),
                  equity: chartNumber(p.equity, 0),
                }))}
              />
            </div>
          </TabsContent>
        </Tabs>
        )}
        {brrrr && (
          <Tabs defaultValue="summary" key="brrrr">
            <TabsList className="w-full">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="steps">Step by step</TabsTrigger>
              <TabsTrigger value="rental">Rental</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-3">
              <BrrrrMetrics b={brrrr} />
            </TabsContent>
            <TabsContent value="steps" className="mt-3 rounded-xl border bg-card p-4 shadow-xs">
              <BrrrrSteps b={brrrr} input={liveInputs} />
            </TabsContent>
            <TabsContent value="rental" className="mt-3 rounded-xl border bg-card p-2 shadow-xs">
              <CashFlowStatement a={brrrr.rental} />
            </TabsContent>
          </Tabs>
        )}
        {adu && (
          <div className="space-y-2">
            <h3 className="flex items-baseline gap-2 text-sm font-semibold">
              With the ADU
              <span className="text-xs font-normal text-muted-foreground">
                {formatCurrency(adu.totalCost)} build · valued at {formatPercent(adu.capRateUsed)} cap
              </span>
            </h3>
            <AduMetrics r={adu} />
          </div>
        )}
        {flip && (
          <Tabs defaultValue="summary" key="flip">
            <TabsList className="w-full">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="pl">Profit & loss</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-3">
              <FlipMetrics f={flip} />
            </TabsContent>
            <TabsContent value="pl" className="mt-3 rounded-xl border bg-card p-4 shadow-xs">
              <FlipStatement f={flip} input={liveInputs} />
            </TabsContent>
          </Tabs>
        )}
          </>
        )}
        <Disclaimer />
      </aside>

      </div>

      {strategy === "BUY_HOLD" ? (
        <DealTools
          inputs={liveInputs}
          goals={offerGoals}
          onGoalsChange={(g) => setValue("offerGoals", g as never, { shouldDirty: true })}
        />
      ) : (
        <StrategyOfferTools
          strategy={strategy}
          inputs={liveInputs}
          s={sEngine}
          goals={sSaved.goals}
          onGoalsChange={(g) => setStrategyInputs({ ...sSaved, goals: g })}
        />
      )}
    </form>
  );
}

function Section({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type AutoState = { isAuto: boolean; apply: () => void };

/**
 * Keeps a field filled with an estimate while it's empty, zero, or still equal
 * to the last value we put there. As soon as the user types something else,
 * the estimate stops overwriting it (and can be re-applied from the hint).
 */
function useAutoEstimate(
  name: "insuranceAnnual" | "closingCosts" | "propertyTaxAnnual",
  est: CostEstimate | null,
  getValues: (n: Name) => unknown,
  setValue: (n: Name, v: never, o?: object) => void,
): AutoState {
  const lastAuto = useRef<string | null>(null);
  const target = est?.amount.toString() ?? null;

  useEffect(() => {
    if (!target) return;
    const current = String(getValues(name) ?? "").trim();
    if (current === "" || current === "0" || current === lastAuto.current) {
      if (current !== target) setValue(name, target as never, { shouldDirty: true, shouldValidate: true });
      lastAuto.current = target;
    }
  }, [target, name, getValues, setValue]);

  return {
    // The field "is the estimate" whenever it holds exactly the current estimate.
    isAuto: target !== null && String(getValues(name) ?? "").trim() === target,
    apply: () => {
      if (!target) return;
      setValue(name, target as never, { shouldDirty: true, shouldValidate: true });
      lastAuto.current = target;
    },
  };
}

function Why({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex align-middle text-muted-foreground/70 hover:text-foreground" aria-label="How this estimate is calculated">
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-left leading-snug">{text}</TooltipContent>
    </Tooltip>
  );
}

function EstimateHint({ est, auto, fallback }: { est: CostEstimate | null; auto: AutoState; fallback: string }) {
  if (!est) return <>{fallback}</>;
  if (auto.isAuto) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="rounded bg-series-1/10 px-1 py-px text-[10px] font-medium text-series-1">Estimate</span>
        state average
        <Why text={est.basis} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      Estimate {formatCurrency(est.amount)}
      <Why text={est.basis} />·
      <button type="button" onClick={auto.apply} className="font-medium text-foreground underline underline-offset-2">
        Use
      </button>
    </span>
  );
}

/**
 * Property tax: state-average estimate on the purchase price (auto-filled like insurance),
 * plus the county's current bill from the address lookup when there is one.
 */
function TaxHint({
  est,
  auto,
  record,
  current,
  onUseRecord,
}: {
  est: CostEstimate | null;
  auto: AutoState;
  record: { amount: string; year: number } | null;
  current: string;
  onUseRecord: (v: string) => void;
}) {
  const usingRecord = record !== null && current.trim() === record.amount;
  const recordNote = "The current owner's bill from county records. Many states reassess when a property sells, so yours may differ.";
  return (
    <div className="space-y-0.5">
      {usingRecord ? (
        <span className="inline-flex items-center gap-1">
          <span className="rounded bg-muted px-1 py-px text-[10px] font-medium text-foreground">County {record.year}</span>
          seller&apos;s bill
          <Why text={recordNote} />
        </span>
      ) : (
        <EstimateHint est={est} auto={auto} fallback="Enter price & state to estimate" />
      )}
      {usingRecord && est && (
        <div className="inline-flex items-center gap-1">
          Estimate at your price {formatCurrency(est.amount)}
          <Why text={est.basis} />·
          <button type="button" onClick={auto.apply} className="font-medium text-foreground underline underline-offset-2">Use</button>
        </div>
      )}
      {record && !usingRecord && (
        <div className="inline-flex items-center gap-1">
          County {record.year}: {formatCurrency(dec(record.amount))}
          <Why text={recordNote} />·
          <button type="button" onClick={() => onUseRecord(record.amount)} className="font-medium text-foreground underline underline-offset-2">Use</button>
        </div>
      )}
    </div>
  );
}
