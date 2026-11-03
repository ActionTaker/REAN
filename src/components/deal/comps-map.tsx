"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { formatCurrency } from "@/lib/finance";
import type { CompRow } from "@/lib/property-data/comps-arv";
import type { PropertyLookup } from "@/lib/property-data/types";

/**
 * Interactive map of the subject and its comps (Leaflet + OpenStreetMap tiles, no key needed).
 * Tile source is configurable for production via NEXT_PUBLIC_MAP_TILE_URL / NEXT_PUBLIC_MAP_ATTRIBUTION.
 */
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);


interface DrawArgs {
  lookup: PropertyLookup;
  placed: CompRow[];
  letters: Map<string, string>;
  priceSuffix: string;
}

/** (Re)draws every marker into `g`. Module-level and pure, so both effects can call it. */
function drawMarkers(L: typeof import("leaflet"), g: LayerGroup, { lookup, placed, letters, priceSuffix }: DrawArgs) {
  const lat0 = lookup.facts.latitude, lng0 = lookup.facts.longitude;
  if (lat0 == null || lng0 == null) return;
  g.clearLayers();
  for (const r of placed) {
    const reno = r.condition === "renovated";
    const html = `<div class="comp-pin${r.included ? "" : " comp-pin--off"}${reno ? " comp-pin--reno" : ""}">${esc(letters.get(r.id) ?? "·")}</div>`;
    L.marker([r.comp.latitude!, r.comp.longitude!], {
      icon: L.divIcon({ html, className: "", iconSize: [26, 26], iconAnchor: [13, 13] }),
      zIndexOffset: r.included ? 100 : 0,
    })
      .bindPopup(
        `<strong>${esc(letters.get(r.id) ?? "")} · ${esc(r.comp.address)}</strong><br/>` +
          `${esc(formatCurrency(r.adjustedPrice))}${priceSuffix} adjusted (${esc(formatCurrency(Number(r.comp.price)))} listed)<br/>` +
          `${r.comp.distanceMiles != null ? `${r.comp.distanceMiles.toFixed(2)} mi · ` : ""}${r.included ? "in use" : "not in use"}${reno ? " · renovated" : ""}`,
      )
      .addTo(g);
  }
  L.marker([lat0, lng0], {
    icon: L.divIcon({ html: '<div class="subject-pin" aria-label="Subject property">&#8962;</div>', className: "", iconSize: [30, 30], iconAnchor: [15, 15] }),
    zIndexOffset: 1000,
  })
    .bindPopup(`<strong>${esc(lookup.address.formatted)}</strong><br/>Your property`)
    .addTo(g);
}

export function CompsMap({
  lookup,
  rows,
  letters,
  priceSuffix = "",
}: {
  lookup: PropertyLookup;
  rows: CompRow[];
  letters: Map<string, string>;
  priceSuffix?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const lat0 = lookup.facts.latitude, lng0 = lookup.facts.longitude;
  const placed = rows.filter((r) => r.comp.latitude != null && r.comp.longitude != null);

  // Create the map once.
  useEffect(() => {
    if (!el.current || lat0 == null || lng0 == null) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      const pts: [number, number][] = [[lat0, lng0], ...placed.map((r) => [r.comp.latitude!, r.comp.longitude!] as [number, number])];
      m.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 15 });
      drawMarkers(L, layer.current, { lookup, placed, letters, priceSuffix });
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markers are redrawn by the effect below
  }, [lat0, lng0]);

  // Redraw markers whenever selections or tags change.
  useEffect(() => {
    if (!map.current) return;
    import("leaflet").then((L) => layer.current && drawMarkers(L, layer.current, { lookup, placed, letters, priceSuffix }));
  });



  if (lat0 == null || lng0 == null) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
        <p>Couldn&apos;t locate this address on the map.</p>
      </div>
    );
  }
  return (
    <figure className="overflow-hidden rounded-xl border">
      <div ref={el} className="h-80 w-full" role="region" aria-label="Map of comparable properties" />
      <figcaption className="flex flex-wrap gap-x-3 gap-y-1 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span><span className="subject-pin subject-pin--legend">&#8962;</span> your property</span>
        <span><span className="comp-pin comp-pin--legend">A</span> in use</span>
        <span><span className="comp-pin comp-pin--off comp-pin--legend">B</span> not in use</span>
        <span><span className="comp-pin comp-pin--reno comp-pin--legend">C</span> marked renovated</span>
        {placed.length < rows.length && <span>{rows.length - placed.length} comp(s) couldn&apos;t be located</span>}
      </figcaption>
    </figure>
  );
}
