"use client";

import { useQueryState } from "nuqs";
import * as React from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type FlagConfig, flagConfig } from "@/config/flag";

type FilterFlag = FlagConfig["featureFlags"][number]["value"];

interface FeatureFlagsContextValue {
  filterFlag: FilterFlag;
  enableAdvancedFilter: boolean;
}

const FeatureFlagsContext =
  React.createContext<FeatureFlagsContextValue | null>(null);

export function useFeatureFlags() {
  const context = React.useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error(
      "useFeatureFlags must be used within a FeatureFlagsProvider"
    );
  }
  return context;
}

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  enableAdvancedFilter?: boolean;
}

export function FeatureFlagsProvider({
  children,
  enableAdvancedFilter = true,
}: FeatureFlagsProviderProps) {
  const [filterFlag, setFilterFlag] = useQueryState<FilterFlag | null>(
    "filterFlag",
    {
      parse: (value) => {
        if (!value) return null;
        const validValues = flagConfig.featureFlags.map((flag) => flag.value);
        return validValues.includes(value as FilterFlag)
          ? (value as FilterFlag)
          : null;
      },
      serialize: (value) => value ?? "",
      defaultValue: null,
      clearOnDefault: true,
      shallow: false,
      eq: (a, b) => (!a && !b) || a === b,
    }
  );

  const contextValue = React.useMemo<FeatureFlagsContextValue>(
    () => ({
      filterFlag,
      enableAdvancedFilter: enableAdvancedFilter,
    }),
    [filterFlag]
  );

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}
