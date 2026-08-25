"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ColumnFormat = "number" | "percent" | "duration";

// format is a serializable type tag, not a function -- Server Components
// can't pass functions as props to this Client Component.
const FORMATTERS: Record<ColumnFormat, (value: unknown) => string> = {
  number: (v) => formatNumber(v as number),
  percent: (v) => formatPercent(v as number),
  duration: (v) => formatDuration(v as number),
};

export interface Column<T> {
  key: keyof T;
  label: string;
  align?: "left" | "right";
  format?: ColumnFormat;
}

interface SortableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  defaultSortKey: keyof T;
}

export function SortableTable<T extends object>({ columns, rows, defaultSortKey }: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: keyof T) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={String(col.key)}
              className={cn("cursor-pointer select-none", col.align === "right" && "text-right")}
              onClick={() => toggleSort(col.key)}
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
        {sorted.map((row, i) => (
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
  );
}
