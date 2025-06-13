import * as duckdb from "@duckdb/duckdb-wasm";
import { initDuckDB } from "./connect";

export interface DuckDBConfig {
  path?: string;
  accessMode?: duckdb.DuckDBAccessMode;
}

export interface DuckDBQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  filters?: Record<string, string | number>;
  spatialQuery?: {
    bbox?: [number, number, number, number];
    radius?: number;
    center?: [number, number];
    spatialFunction?: string;
  };
}

export async function loadAndInspectParquetSchema(): Promise<void> {
  try {
    const duckDB = await initDuckDB();
    const conn = await duckDB.connect();

    // describe the file structure
    const describeResult = await conn.query(`
      DESCRIBE SELECT * FROM read_parquet('http://localhost:3000/data/Utah_arrowGeoms.parquet') LIMIT 1;
    `);

    console.log("📋 Schema Information:");
    console.table(describeResult.toArray());

    // get basic file info
    const fileInfoResult = await conn.query(`
      SELECT COUNT(*) as total_rows FROM read_parquet('http://localhost:3000/data/Utah_arrowGeoms.parquet');
    `);

    const fileInfo = fileInfoResult.toArray()[0];
    console.log(`📊 File contains ${fileInfo.total_rows} rows`);

    // sample a few rows to see the data structure
    const sampleResult = await conn.query(`
      SELECT * FROM read_parquet('http://localhost:3000/data/Utah_arrowGeoms.parquet') LIMIT 5;
    `);

    console.log("📄 Sample Data (first 5 rows, excluding geometry):");
    console.table(sampleResult.toArray());

    // inspect the geometry column separately
    try {
      const geometryInspectResult = await conn.query(`
        SELECT 
          typeof(geometry) as geometry_type,
          length(geometry) as geometry_size,
          geometry
        FROM read_parquet('http://localhost:3000/data/Utah_arrowGeoms.parquet') 
        LIMIT 3;
      `);

      console.log("🗺️ Geometry Column Inspection:");
      console.table(geometryInspectResult.toArray());
    } catch (geomError) {
      if (
        geomError &&
        typeof geomError === "object" &&
        "message" in geomError
      ) {
        console.log(
          "⚠️ Could not inspect geometry column:",
          (geomError as { message: string }).message
        );
      } else {
        console.log("⚠️ Could not inspect geometry column:", geomError);
      }

      // get just the type and size without the actual geometry data
      const geometryTypeResult = await conn.query(`
        SELECT 
          typeof(geometry) as geometry_type,
          length(geometry) as geometry_size
        FROM read_parquet('http://localhost:3000/data/Utah_arrowGeoms.parquet') 
        LIMIT 1;
      `);

      console.log("🗺️ Geometry Column Type Info:");
      console.table(geometryTypeResult.toArray());
    }

    // get column names for easy reference
    const columnNames = describeResult
      .toArray()
      .map((row: any) => row.column_name);
    console.log("🏷️ Column Names:", columnNames);

    await conn.close();
  } catch (error) {
    console.error("❌ Failed to load and inspect parquet schema:", error);
  }
}

export async function queryParquetData(
  db: duckdb.AsyncDuckDB,
  s3Path: string,
  options: DuckDBQueryOptions = {}
) {
  const { limit, offset, orderBy, orderDirection, filters, spatialQuery } =
    options;

  // Configure S3 credentials
  const conn = await db.connect();

  // Build the query
  let query = `SELECT 
    id,
    names.primary as name,
    categories.main as category,
    ST_Y(ST_PointN(geometry, 1)) as latitude,
    ST_X(ST_PointN(geometry, 1)) as longitude,
    addresses.freeform as address,
    ST_AsGeoJSON(geometry) as geometry
  FROM parquet_scan('${s3Path}')`;

  // Add spatial filters if any
  if (spatialQuery) {
    const spatialFunction = spatialQuery.spatialFunction || "ST_DWithin";

    if (spatialQuery.bbox) {
      const [minLon, minLat, maxLon, maxLat] = spatialQuery.bbox;
      query += ` WHERE ST_Within(geometry, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}))`;
    } else if (spatialQuery.radius && spatialQuery.center) {
      const [centerLon, centerLat] = spatialQuery.center;
      query += ` WHERE ${spatialFunction}(geometry, ST_Point(${centerLon}, ${centerLat}), ${spatialQuery.radius})`;
    }
  }

  // Add regular filters if any
  if (filters && Object.keys(filters).length > 0) {
    const filterConditions = Object.entries(filters)
      .map(([key, value]) => `${key} = '${value}'`)
      .join(" AND ");
    query += spatialQuery
      ? ` AND ${filterConditions}`
      : ` WHERE ${filterConditions}`;
  }

  // Add ordering
  if (orderBy) {
    query += ` ORDER BY ${orderBy} ${orderDirection || "asc"}`;
  }

  // Add pagination
  if (limit) {
    query += ` LIMIT ${limit}`;
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
  }

  // Execute query
  const result = await conn.query(query);
  await conn.close();
  return result;
}

export async function downloadQueryResults(
  db: duckdb.AsyncDuckDB,
  query: string,
  fileName: string = "query_results.parquet"
): Promise<void> {
  const conn = await db.connect();
  try {
    // create a temporary table with the query results
    await conn.query(`
      CREATE TEMPORARY TABLE temp_results AS ${query};
    `);

    // export to Parquet
    await conn.query(`
      COPY (SELECT * FROM temp_results) TO '${fileName}' (FORMAT 'parquet', COMPRESSION 'zstd');
    `);

    // get the file buffer
    const parquetBuffer = await db.copyFileToBuffer(fileName);

    // create and trigger download
    const blob = new Blob([parquetBuffer], {
      type: "application/octet-stream",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);

    // clean up
    await conn.query(`DROP TABLE temp_results;`);
    await db.dropFile(fileName);
  } finally {
    await conn.close();
  }
}

export interface ParquetFileInfo {
  url: string;
  name: string;
  type: string;
  row_count: number;
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

export async function getParquetFileInfo(
  db: duckdb.AsyncDuckDB,
  s3Path: string,
  config: DuckDBConfig
): Promise<ParquetFileInfo> {
  const conn = await db.connect();
  try {
    // await conn.query(`
    //   SET s3_region='${config.s3Region}';
    //   SET s3_access_key_id='${config.s3AccessKeyId}';
    //   SET s3_secret_access_key='${config.s3SecretAccessKey}';
    // `);

    const result = await conn.query(`
      SELECT 
        COUNT(*) as row_count,
        MIN(ST_Y(ST_PointN(geometry, 1))) as min_lat,
        MAX(ST_Y(ST_PointN(geometry, 1))) as max_lat,
        MIN(ST_X(ST_PointN(geometry, 1))) as min_lon,
        MAX(ST_X(ST_PointN(geometry, 1))) as max_lon
      FROM parquet_scan('${s3Path}');
    `);

    const info = result.toArray()[0];
    return {
      url: s3Path,
      name: s3Path.split("/").pop() || "unknown",
      type: "geoparquet",
      ...info,
    };
  } finally {
    await conn.close();
  }
}
