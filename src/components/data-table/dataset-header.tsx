import { Button } from "@/components/ui/button";

interface DatasetHeaderProps {
  title: string;
  schema: {
    columns: Array<{
      column_name: string;
      column_type: string;
      null: string;
      key: string;
      default: string;
      extra: string;
    }> | null;
    totalRows?: number;
    filteredRows?: number;
  } | null;
  currentFilters: any[];
  path?: string;
  onDownload?: () => Promise<void>;
}

export function DatasetHeader({
  title,
  schema,
  currentFilters,
  path,
  onDownload,
}: DatasetHeaderProps) {
  const displayRows =
    schema?.filteredRows !== undefined
      ? schema.filteredRows
      : schema?.totalRows || 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {schema && (
            <p className="text-sm text-muted-foreground">
              {displayRows.toLocaleString()}{" "}
              {currentFilters.length > 0 ? "filtered" : "total"} rows •{" "}
              {schema.columns?.length || 0} columns
              {currentFilters.length > 0 && (
                <span className="ml-2 text-blue-600">
                  ({currentFilters.length} filter
                  {currentFilters.length !== 1 ? "s" : ""} active)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button onClick={onDownload} variant="outline">
              Download {currentFilters.length > 0 ? "Filtered" : "Full"} Dataset
            </Button>
          )}
        </div>
      </div>

      {path && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>File:</strong> {path}
        </div>
      )}
    </div>
  );
}
