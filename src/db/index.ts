import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// prepare: false -- required for Supabase's pooled connection string
// (pgbouncer=true, transaction-mode pooling): a prepared statement created
// on one pooled backend connection doesn't exist on the next one a later
// query in the same session gets routed to, which either errors outright
// or, under concurrent load across several requests, contends badly
// enough to blow through Postgres's statement_timeout.
const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
