"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AddressSuggestion {
  label: string;
  line1: string;
  city: string | null;
  state: string | null;
  zip: string | null;
}

/** Address input with a debounced suggestion dropdown (combobox pattern). Free typing always works. */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onEnter,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  onEnter?: () => void;
  placeholder?: string;
}) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false); // only fetch for keystrokes, not for programmatic updates
  const listId = useId();

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 4) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/address-suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
        setItems(data.suggestions ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        /* aborted or offline — leave the list as is */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  const choose = (s: AddressSuggestion) => {
    typed.current = false;
    setOpen(false);
    setItems([]);
    onSelect(s);
  };

  const showList = open && value.trim().length >= 4;

  return (
    <div className="relative flex-1">
      <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Property address"
        autoComplete="off"
        className="pl-8"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
          if (e.target.value.trim().length < 4) setOpen(false);
        }}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (showList && active >= 0 && items[active]) choose(items[active]);
            else {
              setOpen(false);
              onEnter?.();
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-lg"
        >
          {items.length === 0 && !loading && (
            <li className="px-2.5 py-2 text-xs text-muted-foreground">No matching street addresses — you can still type the full address.</li>
          )}
          {items.map((s, i) => (
            <li
              key={s.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2", i === active && "bg-accent")}
            >
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">{s.line1}</span>
                <span className="block text-xs text-muted-foreground">{[s.city, [s.state, s.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
