import type { SearchParams } from "@/types";
import React, { Suspense } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Shell } from "@/components/shell";
import { getValidFilters } from "@/lib/data-table";

import { FeatureFlagsProvider } from "../hooks/feature-flags-provider";
import { DuckDBTest } from "@/components/duckdb-test";
import { DuckDBTable } from "@/components/duckdb-table";

interface IndexPageProps {
  searchParams: Promise<SearchParams>;
}

export default function Home() {
  return (
    <FeatureFlagsProvider>
      <Suspense
        fallback={
          <DataTableSkeleton
            columnCount={7}
            filterCount={2}
            cellWidths={[
              "10rem",
              "30rem",
              "10rem",
              "10rem",
              "6rem",
              "6rem",
              "6rem",
            ]}
            shrinkZero
          />
        }
      >
        <DuckDBTable
          parquetPath="http://localhost:3000/data/Utah_arrowGeoms.parquet"
          title="Utah Arrow Geometries"
          defaultLimit={10}
        />
      </Suspense>
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">DuckDB Test</h2>
        <DuckDBTest />
      </div>
    </FeatureFlagsProvider>
  );
}
