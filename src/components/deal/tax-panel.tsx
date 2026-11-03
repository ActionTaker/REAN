"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { analyzeAfterTax, formatCurrency, formatPercent, type D, type DealAnalysis, type TaxAssumptions } from "@/lib/finance";
import { trimZeros } from "@/lib/property-mapping";

function Row({ label, value, strong, muted }: { label: React.ReactNode; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", strong && "border-t pt-2 font-semibold")}>
      <span className={cn(!strong && "text-muted-foreground")}>{label}</span>
      <span className={cn("num whitespace-nowrap", muted && "text-muted-foreground")}>{value}</span>
    </div>
  );
}

const signed = (v: D) => (v.isNegative() ? `−${formatCurrency(v.abs())}` : formatCurrency(v));

/** Year-1 after-tax cash flow: depreciation and mortgage interest against NOI. */
export function AfterTaxSummary({ a, tax }: { a: DealAnalysis; tax: TaxAssumptions }) {
  const t = useMemo(() => analyzeAfterTax(a, tax), [a, tax]);
  const y = t.yearOne;
  const loss = y.taxableIncome.isNegative();
  return (
    <div>
      <Row label="Net operating income" value={formatCurrency(y.noi)} />
      <Row label="Mortgage interest" value={`−${formatCurrency(y.interest)}`} />
      <Row label={<>Depreciation <span className="text-xs">({formatCurrency(t.depreciableBasis)} ÷ 27.5 yrs)</span></>} value={`−${formatCurrency(y.depreciation)}`} />
      <Row label={loss ? "Taxable income (paper loss)" : "Taxable income"} value={signed(y.taxableIncome)} strong />
      <Row
        label={loss ? `Tax saved at ${trimZeros(String(tax.taxRatePct))}%*` : `Tax at ${trimZeros(String(tax.taxRatePct))}%`}
        value={loss ? `+${formatCurrency(y.tax.abs())}` : `−${formatCurrency(y.tax)}`}
      />
      <Row label="Cash flow before tax" value={signed(y.cashFlow)} muted />
      <Row label="After-tax cash flow (year 1)" value={`${signed(y.afterTaxCashFlow)} · ${signed(y.afterTaxCashFlow.div(12))}/mo`} strong />
      <Row label="After-tax cash-on-cash" value={formatPercent(t.afterTaxCashOnCash)} />
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Federal estimate: building = {trimZeros(String(tax.buildingValuePct))}% of price + closing, plus rehab; rate and split are set in Settings.
        {loss && " *A rental loss offsets other income only if you qualify (up to $25k for active participants, phasing out at $100k–$150k AGI); otherwise it carries forward."}{" "}
        Ignores state tax and depreciation recapture at sale. Not tax advice.
      </p>
    </div>
  );
}
