"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEAL_STATUSES, type DealStatusValue } from "@/lib/constants";
import { updateStatus } from "@/app/actions/properties";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          await updateStatus(id, v as DealStatusValue);
          toast.success("Status updated");
        })
      }
    >
      <SelectTrigger size="sm" className="w-40" aria-label="Deal status"><SelectValue /></SelectTrigger>
      <SelectContent>
        {DEAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
