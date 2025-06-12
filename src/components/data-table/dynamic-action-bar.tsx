"use client";

import type { Table } from "@tanstack/react-table";
import { Download, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import { Separator } from "@/components/ui/separator";
import { exportTableToCSV } from "@/utils/data-table/export";

interface DynamicRowData {
  [key: string]: any;
}

interface DynamicTableActionBarProps {
  table: Table<DynamicRowData>;
  onDelete?: (rows: DynamicRowData[]) => Promise<void>;
  onBulkUpdate?: (
    rows: DynamicRowData[],
    updates: Record<string, any>
  ) => Promise<void>;
  customActions?: React.ReactNode;
}

export function DynamicTableActionBar({
  table,
  onDelete,
  onBulkUpdate,
  customActions,
}: DynamicTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;
  const [isPending, startTransition] = React.useTransition();
  const [currentAction, setCurrentAction] = React.useState<string | null>(null);

  const onExport = React.useCallback(() => {
    setCurrentAction("export");
    startTransition(() => {
      exportTableToCSV(table, {
        excludeColumns: ["select", "actions"],
        onlySelected: true,
      });
      toast.success("Data exported successfully");
    });
  }, [table]);

  const onDeleteRows = React.useCallback(async () => {
    if (!onDelete) return;

    setCurrentAction("delete");
    startTransition(async () => {
      try {
        const rowData = rows.map((row) => row.original);
        await onDelete(rowData);
        table.toggleAllRowsSelected(false);
        toast.success("Selected rows deleted");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete rows"
        );
      }
    });
  }, [rows, table, onDelete]);

  const getIsActionPending = React.useCallback(
    (action: string) => isPending && currentAction === action,
    [isPending, currentAction]
  );

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        {customActions}
        <DataTableActionBarAction
          size="icon"
          tooltip="Export selected"
          isPending={getIsActionPending("export")}
          onClick={onExport}
        >
          <Download />
        </DataTableActionBarAction>
        {onDelete && (
          <DataTableActionBarAction
            size="icon"
            tooltip="Delete selected"
            isPending={getIsActionPending("delete")}
            onClick={onDeleteRows}
          >
            <Trash2 />
          </DataTableActionBarAction>
        )}
      </div>
    </DataTableActionBar>
  );
}
