"use client";

import type { Table } from "@tanstack/react-table";
import type * as React from "react";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";

import { cn } from "@/utils/utils";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  shallow?: boolean;
  debounceMs?: number;
  throttleMs?: number;
}

export function DataTableToolbar<TData>({
  table,
  shallow,
  debounceMs,
  throttleMs,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  console.log(table);
  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full items-start justify-between gap-2 p-1",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <div className="flex items-center gap-2">
        <DataTableSortList table={table} align="end" />
        <DataTableFilterList
          table={table}
          shallow={shallow}
          debounceMs={debounceMs}
          throttleMs={throttleMs}
        />
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
