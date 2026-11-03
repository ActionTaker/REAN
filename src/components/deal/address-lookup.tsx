"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, ListChecks, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lookupPropertyData } from "@/app/actions/property-data";
import type { PropertyLookup } from "@/lib/property-data/types";
import { MarketDataSummary } from "./market-data";
import { AddressAutocomplete, type AddressSuggestion } from "./address-autocomplete";

export function AddressLookup({
  initialAddress,
  onApply,
  onAddressSelected,
  onLookup,
  onOpenComps,
}: {
  initialAddress: string;
  onApply: (data: PropertyLookup, address: string) => void;
  /** Called when a suggestion is picked, so the form's address fields fill even without estimates. */
  onAddressSelected?: (s: AddressSuggestion) => void;
  /** Every successful lookup, so the form can keep the comps for the Comps & ARV panel. */
  onLookup?: (data: PropertyLookup, address: string) => void;
  onOpenComps?: (mode: "sale" | "rent") => void;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [data, setData] = useState<PropertyLookup | null>(null);
  const [lookedUp, setLookedUp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // After "Apply", the card folds to one line so the form isn't pushed down by results already used.
  const [collapsed, setCollapsed] = useState(false);

  const run = (refresh = false, target = address) =>
    start(async () => {
      setError(null);
      const res = await lookupPropertyData(target, refresh);
      if (res.ok) {
        setCollapsed(false);
        setData(res.data);
        onLookup?.(res.data, target);
        setLookedUp(target);
      } else {
        setData(null);
        setError(res.error);
      }
    });

  const apply = () => {
    if (!data) return;
    onApply(data, lookedUp);
    setCollapsed(true);
  };

  if (data && collapsed) {
    return (
      <Card className="gap-0 border-series-1/30 py-3">
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CheckCircle2 className="size-4 shrink-0 text-positive" />
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-medium">Filled from {data.address.formatted}</span>
            <span className="text-muted-foreground"> · review every number before saving</span>
          </div>
          {onOpenComps && (data.value?.comparables.length ?? 0) > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenComps("sale")}>
              <ListChecks /> Comps & ARV
            </Button>
          )}
          {onOpenComps && (data.rent?.comparables.length ?? 0) > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenComps("rent")}>
              <ListChecks /> Rent comps
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => setCollapsed(false)}>
            <ChevronDown /> Show details
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-4 overflow-visible border-series-1/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-series-1" /> Auto-fill from address
        </CardTitle>
        <CardDescription className="text-xs">
          Enter an address to pull property details, taxes, a value and ARV estimate, and market rent from comparable properties.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onEnter={() => run()}
            onSelect={(sug) => {
              setAddress(sug.label);
              onAddressSelected?.(sug);
              run(false, sug.label); // picking a suggestion fetches estimates right away
            }}
            placeholder="Start typing an address…"
          />
          <Button type="button" onClick={() => run()} disabled={pending || address.trim().length < 8} className="shrink-0">
            {pending ? <Loader2 className="animate-spin" /> : <Wand2 />} Get estimates
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-series-1/5 px-3 py-2">
              <p className="flex-1 text-xs text-muted-foreground">
                Fills property details, taxes, HOA, rent and ARV (and the price, if empty). You can change anything afterwards.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => run(true)} disabled={pending}>
                <RefreshCw /> Refresh
              </Button>
              <Button type="button" onClick={apply}>
                <CheckCircle2 /> Apply to this deal
              </Button>
            </div>
            <MarketDataSummary data={data} onOpenComps={onOpenComps} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
