import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Calendar, Hash, Type, ToggleLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";

interface DynamicRowData {
  [key: string]: any;
}

interface ColumnSchema {
  column_name: string;
  column_type: string;
  null: string;
  key: string;
  default: string;
  extra: string;
}

interface ColumnMetadata {
  uniqueValues?: string[];
  minValue?: number;
  maxValue?: number;
  isNullable?: boolean;
}

function getColumnIcon(columnType: string) {
  const type = columnType.toLowerCase();
  if (
    type.includes("int") ||
    type.includes("float") ||
    type.includes("double") ||
    type.includes("decimal")
  ) {
    return Hash;
  }
  if (type.includes("date") || type.includes("time")) {
    return Calendar;
  }
  if (type.includes("bool")) {
    return ToggleLeft;
  }
  return Type;
}

function getColumnVariant(columnType: string, metadata?: ColumnMetadata) {
  const type = columnType.toLowerCase();

  if (type.includes("bool")) return "boolean";
  if (type.includes("date") || type.includes("time")) return "dateRange";
  if (
    type.includes("int") ||
    type.includes("float") ||
    type.includes("double") ||
    type.includes("decimal")
  ) {
    return metadata?.minValue !== undefined && metadata?.maxValue !== undefined
      ? "range"
      : "number";
  }
  if (metadata?.uniqueValues && metadata.uniqueValues.length <= 20) {
    return "multiSelect";
  }
  return "text";
}

export function generateDynamicColumns(
  schema: ColumnSchema[],
  metadata: Record<string, ColumnMetadata> = {},
  enableSelection = true
): ColumnDef<DynamicRowData>[] {
  const columns: ColumnDef<DynamicRowData>[] = [];

  // add selection checkbox column if enabled
  if (enableSelection) {
    columns.push({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    });
  }

  // generate columns from schema
  schema.forEach((col) => {
    const columnMetadata = metadata[col.column_name];
    const variant = getColumnVariant(col.column_type, columnMetadata);
    const Icon = getColumnIcon(col.column_type);

    columns.push({
      id: col.column_name,
      accessorKey: col.column_name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={col.column_name} />
      ),
      cell: ({ getValue }) => {
        const value = getValue();

        // Handle different data types
        if (col.column_type.toLowerCase().includes("geometry")) {
          return <Badge variant="outline">[Geometry]</Badge>;
        }

        if (col.column_type.toLowerCase().includes("bool")) {
          return (
            <Badge variant={value ? "default" : "secondary"}>
              {String(value)}
            </Badge>
          );
        }

        if (
          col.column_type.toLowerCase().includes("date") ||
          col.column_type.toLowerCase().includes("time")
        ) {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            value instanceof Date
          ) {
            return value ? new Date(value).toLocaleDateString() : "";
          }
          return "";
        }

        if (typeof value === "object" && value !== null) {
          return JSON.stringify(value).substring(0, 50) + "...";
        }

        if (typeof value === "bigint") {
          return value.toString();
        }

        return String(value || "");
      },
      meta: {
        label: col.column_name,
        variant,
        icon: Icon,
        ...(variant === "multiSelect" &&
          columnMetadata?.uniqueValues && {
            options: columnMetadata.uniqueValues.map((val) => ({
              label: String(val),
              value: val,
              count: 0,
            })),
          }),
        ...(variant === "range" &&
          columnMetadata && {
            range: [
              columnMetadata.minValue || 0,
              columnMetadata.maxValue || 100,
            ],
          }),
        placeholder: `Search ${col.column_name}...`,
      },
      enableColumnFilter: true,
    });
  });

  return columns;
}
