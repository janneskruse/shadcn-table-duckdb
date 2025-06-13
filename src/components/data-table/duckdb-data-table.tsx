import React, { useEffect, useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableRowSkeleton } from "./data-table-row-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataTable } from "@/hooks/use-data-table";
import { useDuckDB } from "@/hooks/duckdb-context";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DynamicTableActionBar } from "./dynamic-action-bar";
import { DatasetHeader } from "./dataset-header";

import { getCommonPinningStyles } from "@/utils/data-table/data-table";
import { downloadQueryResults } from "@/utils/duckdb/query";
import { generateDynamicColumns } from "@/utils/data-table/dynamic-columns";
import {
  buildDuckDBWhereClause,
  convertTableFiltersToSQL,
} from "@/utils/duckdb/filter";
import { cn } from "@/utils/utils";

import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import { type ColumnDef } from "@tanstack/react-table";

function convertBigIntToNumber(value: any): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
}

function processRowData(data: any[]): DynamicRowData[] {
  return data.map((row) => {
    const processedRow: DynamicRowData = {};
    for (const [key, value] of Object.entries(row)) {
      processedRow[key] = convertBigIntToNumber(value);
    }
    return processedRow;
  });
}

interface DynamicRowData {
  [key: string]: any;
}
interface FileSchema {
  columns: Array<{
    column_name: string;
    column_type: string;
    null: string;
    key: string;
    default: string;
    extra: string;
  }>;
  totalRows: number;
  filteredRows?: number;
}

interface ColumnMetadata {
  uniqueValues?: string[];
  minValue?: number;
  maxValue?: number;
  isNullable?: boolean;
}

interface DuckDBDataTableProps<TData> extends React.ComponentProps<"div"> {
  parquetPath: string;
  title?: string;
  defaultLimit?: number;
  enableSelection?: boolean;
  enableFiltering?: boolean;
  customActions?: React.ReactNode;
  onRowsDelete?: (rows: DynamicRowData[]) => Promise<void>;
  onBulkUpdate?: (
    rows: DynamicRowData[],
    updates: Record<string, any>
  ) => Promise<void>;
}

export function DuckDBDataTable<TData>({
  parquetPath,
  title = "DuckDB Data Table",
  defaultLimit = 10,
  enableSelection = true,
  enableFiltering = true,
  customActions,
  onRowsDelete,
  onBulkUpdate,
  className,
  ...props
}: DuckDBDataTableProps<TData>) {
  const { db, isLoading: dbLoading, error: dbError } = useDuckDB();

  const [data, setData] = useState<DynamicRowData[]>([]);
  const [schema, setSchema] = useState<FileSchema | null>(null);
  const [metadata, setMetadata] = useState<Record<string, ColumnMetadata>>({});
  const [columns, setColumns] = useState<ColumnDef<DynamicRowData>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pagination and filtering state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultLimit);
  const [totalPages, setTotalPages] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<any[]>([]);
  const [currentSorting, setCurrentSorting] = useState<any[]>([]);

  // load schema and initial data
  useEffect(() => {
    if (!db) return;
    loadSchemaAndMetadata();
  }, [db, parquetPath]);

  // reload data when pagination, filters, or sorting changes
  useEffect(() => {
    if (!db || !schema) return;
    loadData();
  }, [currentPage, pageSize, currentFilters, currentSorting, db, schema]);

  async function loadSchemaAndMetadata() {
    if (!db) return;

    try {
      setLoading(true);
      setError(null);

      const conn = await db.connect();

      try {
        // Get schema information
        const schemaResult = await conn.query(`
            DESCRIBE SELECT * FROM read_parquet('${parquetPath}') LIMIT 1;
          `);

        const schemaData = schemaResult.toArray();

        // Get total row count
        const countResult = await conn.query(`
            SELECT COUNT(*) as total_rows FROM read_parquet('${parquetPath}');
          `);

        const countData = countResult.toArray()[0];
        const totalRows = convertBigIntToNumber(countData.total_rows);

        const fileSchema: FileSchema = {
          columns: schemaData,
          totalRows,
        };

        setSchema(fileSchema);
        setTotalPages(Math.ceil(totalRows / pageSize));

        // Load column metadata for better filtering
        const columnMetadata: Record<string, ColumnMetadata> = {};

        for (const col of schemaData) {
          const colName = col.column_name;
          const colType = col.column_type.toLowerCase();

          try {
            // Get unique values for categorical columns (limit to 50 for performance)
            if (
              colType.includes("varchar") ||
              colType.includes("text") ||
              colType.includes("enum")
            ) {
              const uniqueResult = await conn.query(`
                  SELECT DISTINCT "${colName}" as value 
                  FROM read_parquet('${parquetPath}') 
                  WHERE "${colName}" IS NOT NULL 
                  LIMIT 50
                `);
              const uniqueValues = uniqueResult
                .toArray()
                .map((row) => row.value);
              columnMetadata[colName] = {
                uniqueValues:
                  uniqueValues.length <= 20 ? uniqueValues : undefined,
              };
            }

            // Get min/max for numeric columns
            if (
              colType.includes("int") ||
              colType.includes("float") ||
              colType.includes("double") ||
              colType.includes("decimal")
            ) {
              const rangeResult = await conn.query(`
                  SELECT 
                    MIN("${colName}") as min_val,
                    MAX("${colName}") as max_val
                  FROM read_parquet('${parquetPath}')
                  WHERE "${colName}" IS NOT NULL
                `);
              const rangeData = rangeResult.toArray()[0];
              if (rangeData) {
                columnMetadata[colName] = {
                  minValue: convertBigIntToNumber(rangeData.min_val),
                  maxValue: convertBigIntToNumber(rangeData.max_val),
                };
              }
            }
          } catch (err) {
            console.log("Error loading metadata for column:", {
              colName,
              error: err,
            });
          }
        }

        setMetadata(columnMetadata);

        // Generate dynamic columns
        const dynamicColumns = generateDynamicColumns(
          schemaData,
          columnMetadata,
          enableSelection
        );
        setColumns(dynamicColumns);
      } finally {
        await conn.close();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema");
    }
  }

  async function loadData() {
    if (!db || !schema) return;

    try {
      setLoading(true);

      const conn = await db.connect();

      try {
        const offset = currentPage * pageSize;

        // build base query
        let query = `SELECT * FROM read_parquet('${parquetPath}')`;

        // add WHERE clause for filters
        if (enableFiltering && currentFilters.length > 0) {
          const duckdbFilters = convertTableFiltersToSQL(currentFilters);
          const whereClause = buildDuckDBWhereClause(duckdbFilters);
          if (whereClause) {
            query += ` WHERE ${whereClause}`;
          }
        }

        // add ORDER BY clause for sorting
        if (currentSorting.length > 0) {
          const sortClauses = currentSorting.map(
            (sort) => `"${sort.id}" ${sort.desc ? "DESC" : "ASC"}`
          );
          query += ` ORDER BY ${sortClauses.join(", ")}`;
        }

        // get filtered count if filters are applied
        let filteredRows = schema.totalRows;
        if (enableFiltering && currentFilters.length > 0) {
          const countQuery = `SELECT COUNT(*) as filtered_rows FROM read_parquet('${parquetPath}')`;
          const duckdbFilters = convertTableFiltersToSQL(currentFilters);
          const whereClause = buildDuckDBWhereClause(duckdbFilters);

          if (whereClause) {
            const countResult = await conn.query(
              countQuery + ` WHERE ${whereClause}`
            );
            const countData = countResult.toArray()[0];
            filteredRows = convertBigIntToNumber(countData.filtered_rows);
            setTotalPages(Math.ceil(filteredRows / pageSize));

            // update schema with filtered count
            setSchema((prev) => (prev ? { ...prev, filteredRows } : null));
          }
        }

        // add pagination
        query += ` LIMIT ${pageSize} OFFSET ${offset}`;

        console.log("DuckDB Query:", { query });

        const result = await conn.query(query);
        const rawData = result.toArray();

        const processedData = processRowData(rawData);
        setData(processedData);
      } finally {
        await conn.close();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!db) return;

    try {
      let query = `SELECT * FROM read_parquet('${parquetPath}')`;

      // add filters to download query
      if (enableFiltering && currentFilters.length > 0) {
        const duckdbFilters = convertTableFiltersToSQL(currentFilters);
        const whereClause = buildDuckDBWhereClause(duckdbFilters);
        if (whereClause) {
          query += ` WHERE ${whereClause}`;
        }
      }

      const fileName = `${title
        .replace(/\s+/g, "_")
        .toLowerCase()}_export.parquet`;
      await downloadQueryResults(db, query, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download data");
    }
  }

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount: totalPages,
    initialState: {
      pagination: {
        pageIndex: currentPage,
        pageSize: pageSize,
      },
    },
    getRowId: (originalRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  // Update state when table filters/sorting changes
  useEffect(() => {
    const pagination = table.getState().pagination;
    const columnFilters = table.getState().columnFilters;
    const sorting = table.getState().sorting;

    // Update pagination
    if (pagination.pageIndex !== currentPage) {
      setCurrentPage(pagination.pageIndex);
    }
    if (pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize);
      setCurrentPage(0);
    }

    // Update filters
    if (JSON.stringify(columnFilters) !== JSON.stringify(currentFilters)) {
      setCurrentFilters(columnFilters);
      setCurrentPage(0); // Reset to first page when filters change
    }

    // Update sorting
    if (JSON.stringify(sorting) !== JSON.stringify(currentSorting)) {
      setCurrentSorting(sorting);
    }
  }, [
    table.getState().pagination,
    table.getState().columnFilters,
    table.getState().sorting,
  ]);

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <DatasetHeader
        title={title}
        schema={schema}
        currentFilters={currentFilters}
        path={parquetPath}
        onDownload={handleDownload}
      />
      <div
        className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
        {...props}
      >
        {enableFiltering && (
          <DataTableToolbar
            table={table}
            shallow={shallow}
            debounceMs={debounceMs}
            throttleMs={throttleMs}
          />
        )}
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        ...getCommonPinningStyles({ column: header.column }),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            {table.getRowModel().rows?.length ? (
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          ...getCommonPinningStyles({ column: cell.column }),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <DataTableRowSkeleton
                columnCount={columns.length}
                rowCount={pageSize}
              />
            )}
          </Table>
        </div>
        <div className="flex flex-col gap-2.5">
          <DataTablePagination table={table} />
          {enableSelection &&
            table.getFilteredSelectedRowModel().rows.length > 0 && (
              <DynamicTableActionBar
                table={table}
                onDelete={onRowsDelete}
                onBulkUpdate={onBulkUpdate}
                customActions={customActions}
              />
            )}
        </div>
      </div>
    </div>
  );
}
