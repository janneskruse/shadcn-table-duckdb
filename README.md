# [Shadcn Table](https://tablecn.com)

This is a shadcn table component with sorting, filtering, and pagination using duckdb in WASM to query parquet files..

[![Shadcn Table](./public/images/screenshot.png)](https://tablecn.com)

## Documentation

See the [documentation](https://diceui.com/docs/components/data-table) to get started.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com)
- **Database:** [DuckDB](https://duckdb.org) for querying parquet files
- **Validation:** [Zod](https://zod.dev)

## Features

- [x] DuckDB in WASM for querying parquet files
- [x] Customizable columns
- [x] Auto generated filters from column definitions
- [x] Dynamic `Data-Table-Toolbar` with search, filters, and actions
- [x] `Notion/Airtable` like advanced filtering
- [x] `Linear` like filter menu for command palette filtering
- [x] Action bar on row selection

## Running Locally

1. Clone the repository

   ```bash
   git clone https://github.com/sadmann7/shadcn-table
   ```

2. Install dependencies using pnpm

   ```bash
   pnpm install
   ```

3. Copy the `.env.example` to `.env` and update the variables.

   ```bash
   cp .env.example .env
   ```

4. (Optional) Run database using docker-compose.yml file

   ```bash
   docker compose up
   ```

5. Push the database schema

   ```bash
   pnpm run db:push
   ```

6. Seed the database

   ```bash
   pnpm run db:seed
   ```

7. Start the development server

   ```bash
   pnpm run dev
   ```

## How do I deploy this?

Follow the deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

## Update DuckDB WASM
To update the DuckDB WASM bundles:
```bash
# download the main WASM files
curl -L https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm -o duckdb-mvp.wasm
curl -L https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm -o duckdb-eh.wasm
curl -L https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/duckdb-coi.wasm -o duckdb-coi.wasm

# download worker files
curl -L https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js -o duckdb-browser-mvp.worker.js
curl -L https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js -o duckdb-browser-eh.worker.js
curl -L https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/duckdb-browser-coi.worker.js -o duckdb-browser-coi.worker.js
curl -L https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/duckdb-browser-coi.pthread.worker.js -o duckdb-browser-coi.pthread.worker.js
```

## Credits

- [shadcn/ui](https://github.com/shadcn-ui/ui/tree/main/apps/www/app/(app)/examples/tasks) - For the initial implementation of the data table.
