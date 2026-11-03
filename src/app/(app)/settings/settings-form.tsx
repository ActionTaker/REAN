"use client";

import { useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/deal/number-input";
import { settingsSchema, type SettingsFormValues } from "@/lib/validation/deal";
import { saveSettings } from "@/app/actions/settings";
import { z } from "zod";

type Name = FieldPath<SettingsFormValues>;

export function SettingsForm({ email, defaultValues }: { email: string; defaultValues: SettingsFormValues }) {
  const [pending, start] = useTransition();
  const form = useForm<SettingsFormValues, unknown, z.output<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });
  const { register, handleSubmit, setError, getValues, formState: { errors, isDirty } } = form;

  const onSubmit = () =>
    start(async () => {
      const values = getValues();
      const res = await saveSettings(values);
      if (!res.ok) {
        for (const [k, msgs] of Object.entries(res.fieldErrors ?? {})) if (msgs?.[0]) setError(k as Name, { message: msgs[0] });
        toast.error(res.error);
        return;
      }
      form.reset(values);
      toast.success("Settings saved");
    });

  const num = (n: Name, label: string, suffix?: string, prefix?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={n} className="text-xs">{label}</Label>
      <NumberInput id={n} suffix={suffix} prefix={prefix} aria-invalid={!!errors[n]} {...register(n)} />
      {errors[n]?.message && <p className="text-xs text-destructive">{errors[n]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Name</Label>
            <Input id="name" {...register("name")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" value={email} disabled readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Investment criteria</CardTitle>
          <CardDescription className="text-xs">
            Your personal thresholds. Each deal is checked against them — they flag deals for review, they don&apos;t predict outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {num("targetCapRate", "Min cap rate", "%")}
          {num("targetCashOnCash", "Min cash-on-cash", "%")}
          {num("minMonthlyCashFlowPerUnit", "Min cash flow / unit", "/mo", "$")}
          {num("minDscr", "Min DSCR", "×")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Default assumptions for new deals</CardTitle>
          <CardDescription className="text-xs">Pre-filled into the Deal Analyzer. You can change them on any individual deal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {num("defaultDownPaymentPercent", "Down payment", "%")}
            {num("defaultInterestRate", "Interest rate", "%")}
            {num("defaultLoanTermYears", "Loan term", "years")}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {num("defaultVacancyRate", "Vacancy", "%")}
            {num("defaultMaintenancePercent", "Maintenance", "%")}
            {num("defaultCapexPercent", "CapEx", "%")}
            {num("defaultManagementPercent", "Management", "%")}
          </div>
          <div className="grid gap-4 sm:grid-cols-5">
            {num("defaultAppreciationRate", "Appreciation", "%/yr")}
            {num("defaultRentGrowthRate", "Rent growth", "%/yr")}
            {num("defaultExpenseGrowthRate", "Expense growth", "%/yr")}
            {num("defaultSellingCostPercent", "Selling costs", "%")}
            {num("defaultHoldingPeriodYears", "Hold period", "yrs")}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending && <Loader2 className="animate-spin" />} Save settings
        </Button>
      </div>
    </form>
  );
}
