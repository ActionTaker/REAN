"use client";

import { useState } from "react";
import { ChevronDown, Hammer, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/finance";
import {
  REHAB_SCOPES,
  buildRehabPlan,
  regionalFactor,
  rehabTotals,
  type RehabContext,
  type RehabPlan,
  type RehabScope,
} from "@/lib/estimates/rehab";
import { NumberInput } from "./number-input";

const clean = (s: string) => {
  const t = s.replace(/[,$\s]/g, "");
  return /^\d*\.?\d*$/.test(t) && t !== "" && t !== "." ? t : "0";
};

/**
 * Rehab budget: pick a scope for an instant $/sq ft-based estimate, or open the
 * line items to adjust each trade. The parent writes the total into rehabCosts.
 */
export function RehabEstimator({
  plan,
  ctx,
  onChange,
}: {
  plan: RehabPlan | null;
  ctx: RehabContext;
  onChange: (plan: RehabPlan | null) => void;
}) {
  const [open, setOpen] = useState(!!plan?.customized);
  const totals = plan ? rehabTotals({ items: plan.items.map((i) => ({ ...i, amount: clean(i.amount) })), contingencyPct: clean(plan.contingencyPct) }) : null;
  const sqft = ctx.squareFeet && ctx.squareFeet > 0 ? ctx.squareFeet : null;
  const { code, factor } = regionalFactor(ctx.state);
  const fresh = plan ? buildRehabPlan(plan.scope, ctx) : null;

  const pickScope = (scope: RehabScope | null) => {
    if (!scope) return onChange(null);
    const { assumptions: _a, ...next } = buildRehabPlan(scope, ctx);
    onChange(next);
  };

  const updateItem = (index: number, patch: Partial<RehabPlan["items"][number]>) => {
    if (!plan) return;
    const items = plan.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange({ ...plan, items, customized: true });
  };

  return (
    <div className="mt-4 rounded-lg border">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Hammer className="size-3.5 text-muted-foreground" /> Rehab scope
        </div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Rehab scope">
          {[{ value: null, label: "Manual" }, ...REHAB_SCOPES].map((s) => {
            const active = (plan?.scope ?? null) === s.value;
            return (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={active}
                title={"description" in s ? s.description : "Type the rehab total yourself"}
                onClick={() => pickScope(s.value as RehabScope | null)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  active ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {plan && totals && (
          <div className="text-xs sm:ml-auto sm:text-right">
            <span className="num font-semibold">{formatCurrency(totals.total)}</span>
            {sqft && <span className="text-muted-foreground"> · {formatCurrency(totals.total.div(sqft))}/sq ft</span>}
          </div>
        )}
      </div>

      {plan && totals && (
        <div className="space-y-2 border-t px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {REHAB_SCOPES.find((s) => s.value === plan.scope)?.description}. {code ? `${code}` : "U.S."} cost factor {factor.toString()}× ·{" "}
            {plan.contingencyPct}% contingency
            {fresh && fresh.assumptions.length > 0 && <> · {fresh.assumptions.join(" · ")}</>}
            {plan.customized && (
              <> · <span className="font-medium text-foreground">custom line items</span> (no longer update when size or state changes — reset to re-estimate)</>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
              {open ? "Hide line items" : "Customize line items"}
            </Button>
            {plan.customized && (
              <Button type="button" variant="ghost" size="sm" onClick={() => pickScope(plan.scope)}>
                <RotateCcw /> Reset to {plan.scope.toLowerCase()} estimate
              </Button>
            )}
          </div>

          {open && (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Item</th>
                    <th className="hidden px-2 py-1.5 text-left font-medium sm:table-cell">Basis</th>
                    <th className="w-36 px-2 py-1.5 text-right font-medium">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {plan.items.map((it, i) => (
                    <tr key={`${it.key}-${i}`}>
                      <td className="px-2 py-1">
                        <Input
                          value={it.label}
                          onChange={(e) => updateItem(i, { label: e.target.value })}
                          className="h-7 border-transparent px-1.5 text-xs shadow-none hover:border-input focus-visible:border-input"
                          aria-label="Item name"
                        />
                      </td>
                      <td className="hidden px-2 py-1 text-muted-foreground sm:table-cell">{it.basis ?? "Custom"}</td>
                      <td className="px-2 py-1">
                        <NumberInput
                          prefix="$"
                          value={it.amount}
                          onChange={(e) => updateItem(i, { amount: e.target.value, basis: it.basis && !it.basis.startsWith("Edited") ? `Edited · was ${it.basis}` : it.basis })}
                          className="h-7 text-right text-xs"
                          aria-label={`${it.label} amount`}
                        />
                      </td>
                      <td className="pr-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${it.label}`}
                          onClick={() => onChange({ ...plan, items: plan.items.filter((_, j) => j !== i), customized: true })}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30">
                  <tr>
                    <td className="px-2 py-1.5" colSpan={2}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          onChange({
                            ...plan,
                            items: [...plan.items, { key: `custom-${Date.now()}`, label: "New item", amount: "0" }],
                            customized: true,
                          })
                        }
                      >
                        <Plus /> Add item
                      </Button>
                    </td>
                    <td className="num px-2 py-1.5 text-right">{formatCurrency(totals.subtotal)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5" colSpan={2}>
                      <label className="flex items-center gap-2">
                        Contingency
                        <NumberInput
                          suffix="%"
                          value={plan.contingencyPct}
                          onChange={(e) => onChange({ ...plan, contingencyPct: e.target.value, customized: true })}
                          className="h-7 w-20 text-xs"
                          aria-label="Contingency percent"
                        />
                        <span className="text-muted-foreground">for surprises behind walls</span>
                      </label>
                    </td>
                    <td className="num px-2 py-1.5 text-right">{formatCurrency(totals.contingency)}</td>
                    <td />
                  </tr>
                  <tr className="font-semibold">
                    <td className="px-2 py-1.5" colSpan={2}>Rehab total <span className="font-normal text-muted-foreground">(rounded to $50)</span></td>
                    <td className="num px-2 py-1.5 text-right">{formatCurrency(totals.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

