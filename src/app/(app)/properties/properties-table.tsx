"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, GitCompareArrows, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SampleBadge } from "@/components/common/sample-badge";
import { STRATEGIES } from "@/lib/strategy";
import { StrategyBadge } from "@/components/common/strategy-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { RatingBadge } from "@/components/common/rating-badge";
import { PropertyActions } from "@/components/deal/property-actions";
import { DEAL_STATUSES, MAX_COMPARE } from "@/lib/constants";
import type { DealRating } from "@/lib/finance";
import { cn } from "@/lib/utils";

export interface PropertyRow {
  id: string;
  strategy: string;
  hasAdu: boolean;
  name: string;
  isSample: boolean;
  status: string;
  location: string;
  type: string;
  units: number;
  updatedAt: string;
  rating: DealRating;
  sort: Record<"price" | "cashFlow" | "capRate" | "coc" | "updated", number>;
  display: Record<"price" | "cashInvested" | "cashFlow" | "capRate" | "coc" | "dscr", string>;
  negative: boolean;
}

type SortKey = keyof PropertyRow["sort"];
type SortState = { key: SortKey; dir: 1 | -1 };

function SortHead({ k, sort, onSort, children, className }: {
  k: SortKey; sort: SortState; onSort: (k: SortKey) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <TableHead className={className} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </TableHead>
  );
}

export function PropertiesTable({ rows }: { rows: PropertyRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [strategy, setStrategy] = useState("ALL");
  const [sort, setSort] = useState<SortState>({ key: "updated", dir: -1 });
  const onSort = (k: SortKey) => setSort((s) => ({ key: k, dir: s.key === k ? ((s.dir * -1) as 1 | -1) : -1 }));
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (status === "ALL" ? true : r.status === status))
      .filter((r) => (strategy === "ALL" ? true : r.strategy === strategy))
      .filter((r) => (source === "ALL" ? true : source === "SAMPLE" ? r.isSample : !r.isSample))
      .filter((r) => !q || `${r.name} ${r.location} ${r.type}`.toLowerCase().includes(q))
      .sort((a, b) => (a.sort[sort.key] - b.sort[sort.key]) * sort.dir);
  }, [rows, query, status, strategy, source, sort]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_COMPARE ? s : [...s, id]));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, city, type…" className="pl-8" />
        </div>
        <Select value={strategy} onValueChange={setStrategy}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by strategy"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All strategies</SelectItem>
            {STRATEGIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {DEAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by data source"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All data</SelectItem>
            <SelectItem value="MINE">My properties only</SelectItem>
            <SelectItem value="SAMPLE">Sample data only</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 sm:ml-auto">
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
          )}
          {selected.length >= 2 ? (
            <Button size="sm" asChild>
              <Link href={`/compare?ids=${selected.join(",")}`}><GitCompareArrows /> Compare {selected.length}</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              <GitCompareArrows /> {selected.length === 1 ? `Select ${MAX_COMPARE > 2 ? "1–3 more" : "1 more"}` : `Select 2–${MAX_COMPARE} to compare`}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4"><span className="sr-only">Select</span></TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <SortHead sort={sort} onSort={onSort} k="price" className="text-right">Price</SortHead>
              <TableHead className="text-right">Cash invested</TableHead>
              <SortHead sort={sort} onSort={onSort} k="cashFlow" className="text-right">Cash flow / mo</SortHead>
              <SortHead sort={sort} onSort={onSort} k="capRate" className="text-right">Cap rate</SortHead>
              <SortHead sort={sort} onSort={onSort} k="coc" className="text-right">CoC</SortHead>
              <TableHead className="text-right">DSCR</TableHead>
              <TableHead>Criteria</TableHead>
              <TableHead className="w-10 pr-4"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => {
              const checked = selected.includes(r.id);
              return (
                <TableRow key={r.id} data-state={checked ? "selected" : undefined}>
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={checked}
                      disabled={!checked && selected.length >= MAX_COMPARE}
                      onCheckedChange={() => toggle(r.id)}
                      aria-label={`Select ${r.name} for comparison`}
                    />
                  </TableCell>
                  <TableCell className="min-w-56">
                    <div className="flex items-center gap-2">
                      <Link href={`/properties/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                      <StrategyBadge strategy={r.strategy} />
                      {r.hasAdu && <span className="rounded-md border px-1.5 py-px text-[10px] font-medium text-muted-foreground" title="Has an ADU scenario">+ADU</span>}
                      {r.isSample && <SampleBadge />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[r.location, `${r.type}${r.units > 1 ? ` · ${r.units} units` : ""}`].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="num text-right">{r.display.price}</TableCell>
                  <TableCell className="num text-right text-muted-foreground">{r.display.cashInvested}</TableCell>
                  <TableCell className={cn("num text-right font-medium", r.negative ? "text-negative" : "text-positive")}>{r.display.cashFlow}</TableCell>
                  <TableCell className="num text-right">{r.display.capRate}</TableCell>
                  <TableCell className="num text-right">{r.display.coc}</TableCell>
                  <TableCell className="num text-right">{r.display.dscr}</TableCell>
                  <TableCell><RatingBadge rating={r.rating} /></TableCell>
                  <TableCell className="pr-4"><PropertyActions id={r.id} name={r.name} strategy={r.strategy} /></TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">No properties match these filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{visible.length} of {rows.length} properties</p>
    </div>
  );
}
