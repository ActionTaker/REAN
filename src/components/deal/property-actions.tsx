"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileText, GitCompareArrows, MoreHorizontal, Pencil, Repeat, Trash2 } from "lucide-react";
import { STRATEGIES, type StrategyValue } from "@/lib/strategy";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteProperty, duplicateProperty } from "@/app/actions/properties";

export function PropertyActions({ id, name, strategy, redirectAfterDelete }: { id: string; name: string; strategy?: string; redirectAfterDelete?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const duplicate = (as?: StrategyValue) =>
    start(async () => {
      const newId = await duplicateProperty(id, as);
      if (newId) {
        toast.success(as ? `Copy created as ${STRATEGIES.find((s) => s.value === as)?.label}` : "Copy created");
        router.push(`/properties/${newId}/edit`);
      }
    });

  const remove = () =>
    start(async () => {
      await deleteProperty(id);
      toast.success(`Deleted “${name}”`);
      if (redirectAfterDelete) router.push(redirectAfterDelete);
      router.refresh();
    });

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/properties/${id}/edit`}><Pencil /> Edit analysis</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicate()}><Copy /> Duplicate</DropdownMenuItem>
          {strategy &&
            STRATEGIES.filter((s) => s.value !== strategy).map((s) => (
              <DropdownMenuItem key={s.value} onSelect={() => duplicate(s.value as StrategyValue)}>
                <Repeat /> Analyze as {s.label}
              </DropdownMenuItem>
            ))}
          <DropdownMenuItem asChild>
            <Link href={`/compare?ids=${id}`}><GitCompareArrows /> Compare</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/reports/${id}`}><FileText /> Report</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem variant="destructive"><Trash2 /> Delete</DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>This permanently removes the property and its analysis. This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
