"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUICK_DEFAULTS, formatCurrency, formatPercent, formatRatio, quickRentalAnalysis, type QuickRentalInputs } from "@/lib/finance";
import { cn } from "@/lib/utils";

type Field = keyof QuickRentalInputs;

const FIELDS: { key: Field; label: string; prefix?: string; suffix?: string }[] = [
  { key: "price", label: "Purchase price", prefix: "$" },
  { key: "monthlyRent", label: "Monthly rent", prefix: "$" },
  { key: "downPaymentPercent", label: "Down payment", suffix: "%" },
  { key: "interestRate", label: "Interest rate", suffix: "%" },
  { key: "propertyTaxAnnual", label: "Property tax / yr", prefix: "$" },
  { key: "insuranceAnnual", label: "Insurance / yr", prefix: "$" },
];

const START: Record<Field, string> = {
  price: "250000",
  monthlyRent: "2300",
  downPaymentPercent: "25",
  interestRate: "7",
  propertyTaxAnnual: "3000",
  insuranceAnnual: "1500",
};

/** Accepts what people type ("$250,000", "7.5%") and keeps only a plain non-negative number. */
const clean = (raw: string) => raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
/** A lone "." is mid-typing, not a number; the engine treats it as zero. */
const forMath = (v: Record<Field, string>) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === "." ? "" : x])) as Record<Field, string>;

/**
 * Free rental calculator on the landing page: no account, no lookups, runs in the browser on the same
 * finance engine as the app. Visitors searching "rental property calculator" get a number before being
 * asked to sign up.
 */
export function QuickRentalCalc() {
  const [values, setValues] = useState(START);
  const used = useRef(false);
  const a = quickRentalAnalysis(forMath(values));
  const cashFlow = a.monthlyCashFlow;
  const tiles: [string, string][] = [
    ["Cap rate", formatPercent(a.capRate)],
    ["Cash-on-cash", formatPercent(a.cashOnCash)],
    ["DSCR", formatRatio(a.dscr)],
  ];

  const onChange = (key: Field, raw: string) => {
    setValues((v) => ({ ...v, [key]: clean(raw) }));
    if (!used.current) {
      used.current = true;
      window.gtag?.("event", "quick_calc_used", { calculator: "rental" });
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">Free rental calculator · no sign-up</div>
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="text-xs text-muted-foreground">
              {f.label}
              <div className="relative mt-1">
                {f.prefix && (
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">{f.prefix}</span>
                )}
                <Input
                  inputMode="decimal"
                  value={values[f.key]}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className={cn("num h-9 text-foreground", f.prefix && "pl-6", f.suffix && "pr-7")}
                  aria-label={f.label}
                />
                {f.suffix && (
                  <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">{f.suffix}</span>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-baseline justify-between rounded-lg border px-3 py-2.5" aria-live="polite">
          <span className="text-sm font-medium">Monthly cash flow</span>
          <span className={cn("num text-2xl font-semibold", cashFlow.gte(0) ? "text-positive" : "text-negative")}>{formatCurrency(cashFlow)}</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {tiles.map(([k, v]) => (
            <div key={k} className="rounded-lg border p-2.5">
              <div className="text-[11px] text-muted-foreground">{k}</div>
              <div className="num text-lg font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Assumes {QUICK_DEFAULTS.closingCostPercent}% closing costs, {QUICK_DEFAULTS.vacancyRate}% vacancy, {QUICK_DEFAULTS.maintenancePercent}%
          repairs, {QUICK_DEFAULTS.capexPercent}% capex, {QUICK_DEFAULTS.managementPercent}% management and a {QUICK_DEFAULTS.loanTermYears}-year
          loan. Estimates only.
        </p>

        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-sm">
            Want rent and taxes filled in from the address, comps on a map, and the{" "}
            <span className="font-medium">max price that meets your goals</span>?
          </p>
          <Button className="mt-2 w-full" asChild>
            <Link href="/register">
              Analyze a real property free <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
