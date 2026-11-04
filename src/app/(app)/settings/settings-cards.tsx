"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { FlaskConical, Loader2, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAccount, removeSampleData, restoreSampleData } from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
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

const noop = () => () => {};

export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; render "nothing selected" on the server to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
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
              mounted && theme === value && "border-foreground/40 bg-muted",
            )}
            aria-pressed={mounted && theme === value}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

/** Self-serve account deletion (Privacy Policy: "Delete your account at any time from Settings"). */
export function DeleteAccountCard({ isGuest }: { isGuest: boolean }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><Trash2 className="size-4" /> {isGuest ? "Delete this demo" : "Delete account"}</CardTitle>
        <CardDescription className="text-xs">
          Permanently deletes your {isGuest ? "demo" : "account"}, every deal, report and setting in it. This can&apos;t be undone
          {isGuest ? "." : " — export your deals from My Properties first if you want a copy."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-1">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <Button
          variant="destructive"
          disabled={pending || text.trim() !== "DELETE"}
          onClick={() =>
            start(async () => {
              const res = await deleteAccount(text);
              if (res && !res.ok) setError(res.error);
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Delete permanently
        </Button>
      </CardContent>
    </Card>
  );
}
