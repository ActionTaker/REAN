"use client";

import { useTransition } from "react";
import { FlaskConical, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { removeSampleData, restoreSampleData } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

export function SampleDataCard({ count }: { count: number }) {
  const [pending, start] = useTransition();
  return (
    <Card id="sample-data">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><FlaskConical className="size-4" /> Sample data</CardTitle>
        <CardDescription className="text-xs">
          Demonstration properties are labelled “Sample” everywhere and can be excluded from dashboard totals.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm">{count > 0 ? `${count} sample properties in your account` : "No sample properties"}</p>
        {count > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => start(async () => { await removeSampleData(); toast.success("Sample data removed"); })}
          >
            {pending && <Loader2 className="animate-spin" />} Remove sample data
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => start(async () => { await restoreSampleData(); toast.success("Sample properties added"); })}
          >
            {pending && <Loader2 className="animate-spin" />} Load sample data
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Appearance</CardTitle>
        <CardDescription className="text-xs">Choose how DEALAN looks on this device.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors hover:bg-muted",
              theme === value && "border-foreground/40 bg-muted",
            )}
            aria-pressed={theme === value}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
