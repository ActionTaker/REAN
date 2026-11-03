"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
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

  const run = (refresh = false, target = address) =>
    start(async () => {
      setError(null);
      const res = await lookupPropertyData(target, refresh);
      if (res.ok) {
        setData(res.data);
        onLookup?.(res.data, target);
        setLookedUp(target);
      } else {
        setData(null);
        setError(res.error);
      }
    });

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
            placeholder="Start typing an address — e.g. 4218 N Graceland Ave"
          />
          <Button type="button" onClick={() => run()} disabled={pending || address.trim().length < 8} className="shrink-0">
            {pending ? <Loader2 className="animate-spin" /> : <Wand2 />} Get estimates
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <>
            <MarketDataSummary data={data} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onApply(data, lookedUp)}>
                Apply to this deal
              </Button>
              {onOpenComps && (data.value?.comparables.length ?? 0) > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={() => onOpenComps("sale")}>
                  Review comps & ARV
                </Button>
              )}
              {onOpenComps && (data.rent?.comparables.length ?? 0) > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={() => onOpenComps("rent")}>
                  Review rent comps
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => run(true)} disabled={pending}>
                <RefreshCw /> Refresh data
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
