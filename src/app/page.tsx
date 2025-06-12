"use client";
import type { SearchParams } from "@/types";
import React, { Suspense } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { FeatureFlagsProvider } from "../hooks/feature-flags-provider";
import { DuckDBDataTable } from "@/components/data-table/duckdb-data-table";

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
        <DuckDBDataTable
          parquetPath="http://localhost:3000/data/Utah_arrowGeoms.parquet"
          title="Utah Arrow Geometries"
          defaultLimit={10}
          onRowsDelete={async (rows) => {
            console.log("Rows to delete:", rows);
            return Promise.resolve();
          }}
          enableFiltering
          enableSelection
        />
      </Suspense>
    </FeatureFlagsProvider>
  );
}
