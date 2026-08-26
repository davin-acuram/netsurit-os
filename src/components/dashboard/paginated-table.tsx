"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PaginatedColumnFormat = "number" | "percent" | "decimal";

// format is a serializable type tag, not a function -- Server Components
// can't pass functions as props to this Client Component.
const FORMATTERS: Record<PaginatedColumnFormat, (value: unknown) => string> = {
  number: (v) => formatNumber(v as number),
  percent: (v) => formatPercent(v as number),
  decimal: (v) => formatDecimal(v as number),
};

export interface PaginatedColumn<T> {
  key: keyof T;
  label: string;
  align?: "left" | "right";
  format?: PaginatedColumnFormat;
}

interface PaginatedTableProps<T> {
  columns: PaginatedColumn<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  // Distinguishes this table's URL params (e.g. "qSort"/"qPage") from a
  // second paginated table on the same page (e.g. "pSort"/"pPage").
  paramPrefix: string;
}

// Sorting and pagination are driven by SQL, not client state -- rows is
// only ever the current page. Toggling a header or a page button pushes
// new URL params and lets the Server Component re-query.
export function PaginatedTable<T extends object>({
  columns,
  rows,
  total,
  page,
  pageSize,
  sortKey,
  sortDir,
  paramPrefix,
}: PaginatedTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const sortParam = `${paramPrefix}Sort`;
  const dirParam = `${paramPrefix}Dir`;
  const pageParam = `${paramPrefix}Page`;

  function pushParams(next: { sortKey?: string; sortDir?: "asc" | "desc"; page: number }) {
    const params = new URLSearchParams(searchParams);
    if (next.sortKey !== undefined) params.set(sortParam, next.sortKey);
    if (next.sortDir !== undefined) params.set(dirParam, next.sortDir);
    params.set(pageParam, String(next.page));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleSort(key: string) {
    if (key === sortKey) {
      pushParams({ sortKey: key, sortDir: sortDir === "asc" ? "desc" : "asc", page: 1 });
    } else {
      pushParams({ sortKey: key, sortDir: "desc", page: 1 });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3" data-pending={isPending || undefined}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={String(col.key)}
                className={cn("cursor-pointer select-none", col.align === "right" && "text-right")}
                onClick={() => toggleSort(String(col.key))}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30" />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={String(col.key)} className={cn(col.align === "right" && "text-right")}>
                  {col.format ? FORMATTERS[col.format](row[col.key]) : String(row[col.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "No rows"
            : `${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} of ${formatNumber(total)}`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => pushParams({ page: page - 1 })}>
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => pushParams({ page: page + 1 })}
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
