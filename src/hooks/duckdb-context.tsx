"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import { initDuckDB } from "@/utils/duckdb/connect";

interface DuckDBContextValue {
  db: AsyncDuckDB | null;
  isLoading: boolean;
  error: Error | null;
}

const DuckDBContext = createContext<DuckDBContextValue>({
  db: null,
  isLoading: true,
  error: null,
});

export function useDuckDB() {
  return useContext(DuckDBContext);
}

interface DuckDBProviderProps {
  children: ReactNode;
}

export function DuckDBProvider({ children }: DuckDBProviderProps) {
  const [db, setDb] = useState<AsyncDuckDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    // simulate progress while loading WASM files
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 5 : prev));
    }, 200);

    async function loadDuckDB() {
      try {
        const dbInstance = await initDuckDB();
        if (mounted) {
          setDb(dbInstance);
          setProgress(100);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      } finally {
        clearInterval(progressInterval);
      }
    }

    loadDuckDB();

    return () => {
      mounted = false;
      clearInterval(progressInterval);
    };
  }, []);

  const loadingBar = (
    <div className="w-full max-w-md mx-auto p-4 space-y-3">
      <Progress value={progress} className="w-full" />
      <p className="text-sm text-muted-foreground text-center">
        Loading DuckDB ({progress}%)
      </p>
    </div>
  );

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md">
        <h3 className="text-lg font-medium">Failed to initialize DuckDB</h3>
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  return (
    <DuckDBContext.Provider value={{ db, isLoading, error }}>
      <Dialog open={isLoading} modal>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="hidden">Loading DuckDB</DialogTitle>
          </DialogHeader>
          {loadingBar}
        </DialogContent>
      </Dialog>
      {children}
    </DuckDBContext.Provider>
  );
}
