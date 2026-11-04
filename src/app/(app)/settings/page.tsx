import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { requireUser } from "@/lib/auth-helpers";
import { getSettings } from "@/lib/data/settings";
import { countSampleProperties } from "@/lib/data/properties";
import { SettingsForm } from "./settings-form";
import { DeleteAccountCard, SampleDataCard, ThemeCard } from "./settings-cards";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, sampleCount] = await Promise.all([getSettings(), countSampleProperties(user.id)]);
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Settings" description="Your profile, investment criteria and default underwriting assumptions." />
      <SettingsForm email={user.email} defaultValues={{ name: user.name ?? "", ...settings }} />
      <div className="grid gap-5 md:grid-cols-2">
        <SampleDataCard count={sampleCount} />
        <ThemeCard />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="size-4" /> Plan & billing</CardTitle>
          <CardDescription className="text-xs">Paid plans aren’t available yet.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-medium">Free <Badge variant="secondary">Current plan</Badge></div>
            <p className="text-xs text-muted-foreground">Unlimited Buy & Hold, BRRRR and Flip analyses, comparisons and reports.</p>
          </div>
          <Button variant="outline" disabled>Upgrade — coming soon</Button>
        </CardContent>
      </Card>
      <DeleteAccountCard isGuest={user.isGuest} />
    </div>
  );
}
