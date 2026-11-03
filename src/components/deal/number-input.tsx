"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"input"> & { prefix?: string; suffix?: string };

/** Text input tuned for numbers, with optional $ / % adornments. Value stays a string. */
export const NumberInput = forwardRef<HTMLInputElement, Props>(function NumberInput(
  { prefix, suffix, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">{prefix}</span>
      )}
      <Input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        className={cn("num", prefix && "pl-6", suffix && "pr-12", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">{suffix}</span>
      )}
    </div>
  );
});
