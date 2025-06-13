import * as duckdb from "@duckdb/duckdb-wasm";

export interface DuckDBConfig {
  path?: string;
  accessMode?: duckdb.DuckDBAccessMode;
}

let db: duckdb.AsyncDuckDB | null = null;
let worker: Worker | null = null;

const LOCAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: "/duckdb-wasm/duckdb-mvp.wasm",
    mainWorker: "/duckdb-wasm/duckdb-browser-mvp.worker.js",
  },
  eh: {
    mainModule: "/duckdb-wasm/duckdb-eh.wasm",
    mainWorker: "/duckdb-wasm/duckdb-browser-eh.worker.js",
  },
  coi: {
    mainModule: "/duckdb-wasm/duckdb-coi.wasm",
    mainWorker: "/duckdb-wasm/duckdb-browser-coi.worker.js",
    pthreadWorker: "/duckdb-wasm/duckdb-browser-coi.pthread.worker.js",
  },
};

export async function initDuckDB(
  config: DuckDBConfig = {},
  useLocalBundles = true
): Promise<duckdb.AsyncDuckDB> {
  if (db) {
    return db;
  }

  try {
    if (useLocalBundles) {
      const bundle = await duckdb.selectBundle(LOCAL_BUNDLES);

      console.log("DuckDB bundle selected:", {
        bundleType:
          bundle === LOCAL_BUNDLES.mvp
            ? "mvp"
            : bundle === LOCAL_BUNDLES.eh
            ? "eh"
            : "coi",
      });

      // create worker
      worker = new Worker(bundle.mainWorker!);

      const logger = new duckdb.ConsoleLogger();
      db = new duckdb.AsyncDuckDB(logger, worker);

      // instantiate DuckDB with the local WASM module
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      await db.open({
        path: config.path || ":memory:",
        accessMode: config.accessMode || duckdb.DuckDBAccessMode.READ_WRITE,
      });
    } else {
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

      // select a bundle based on browser checks
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker!}");`], {
          type: "text/javascript",
        })
      );

      // instantiate the asynchronus version of DuckDB-Wasm
      worker = new Worker(worker_url);
      const logger = new duckdb.ConsoleLogger();
      db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(worker_url);

      await db.open({
        path: config.path || ":memory:",
        accessMode: config.accessMode || duckdb.DuckDBAccessMode.READ_WRITE,
      });
    }

    const conn = await db.connect();

    // install required extensions
    await conn.query(`INSTALL parquet; LOAD parquet;`);
    await conn.query(`INSTALL spatial; LOAD spatial;`);

    await conn.close();
    console.log("✅ DuckDB initialized successfully");
    return db;
  } catch (error) {
    console.error("❌ Failed to initialize DuckDB:", error);
    throw error;
  }
}

export async function terminateDuckDB(): Promise<void> {
  if (db) {
    await db.terminate();
    db = null;
  }
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
