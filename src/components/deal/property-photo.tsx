"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MESSAGES: Record<string, string> = {
  not_configured: "Add GOOGLE_MAPS_API_KEY to show street photos",
  key_rejected: "Google rejected the Maps API key",
  no_imagery: "No street view at this address",
  unavailable: "Photo unavailable right now",
  invalid: "Address too short for a photo",
};

/** Street-level photo of a property from just its address (Google Street View, via our server). */
export function PropertyPhoto({
  location,
  className,
  width = 640,
  height = 360,
}: {
  /** Full street address, or "lat,lng" when coordinates are known (more precise). */
  location: string | null;
  className?: string;
  width?: number;
  height?: number;
}) {
  const [state, setState] = useState<{ src?: string; reason?: string; loading: boolean }>({ loading: true });

  useEffect(() => {
    if (!location) return;
    let url: string | null = null;
    const ctrl = new AbortController();
    fetch(`/api/street-view?${new URLSearchParams({ location, w: String(width), h: String(height) })}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (res.ok) {
          url = URL.createObjectURL(await res.blob());
          setState({ src: url, loading: false });
        } else {
          const body = (await res.json().catch(() => ({}))) as { reason?: string };
          setState({ reason: body.reason ?? "unavailable", loading: false });
        }
      })
      .catch(() => !ctrl.signal.aborted && setState({ reason: "unavailable", loading: false }));
    return () => {
      ctrl.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [location, width, height]);

  const box = cn("relative overflow-hidden rounded-lg border bg-muted", className);
  if (!location) return null;
  if (state.loading) {
    return (
      <div className={cn(box, "flex items-center justify-center")} style={{ aspectRatio: `${width} / ${height}` }}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!state.src) {
    return (
      <div className={cn(box, "flex flex-col items-center justify-center gap-1 p-3 text-center")} style={{ aspectRatio: `${width} / ${height}` }}>
        <ImageOff className="size-4 text-muted-foreground" />
        <span className="text-[11px] leading-snug text-muted-foreground">{MESSAGES[state.reason ?? "unavailable"] ?? MESSAGES.unavailable}</span>
      </div>
    );
  }
  return (
    <div className={box} style={{ aspectRatio: `${width} / ${height}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from our proxy; next/image can't optimize it */}
      <img src={state.src} alt="Street view of the property" className="size-full object-cover" />
      <span className="absolute right-1.5 bottom-1 rounded bg-black/50 px-1 text-[9px] text-white">Street View</span>
    </div>
  );
}
