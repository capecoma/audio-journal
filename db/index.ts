import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure PostgreSQL client with connection pooling
const sql = postgres(process.env.DATABASE_URL, {
  max: 1, // Single connection for simplicity
  idle_timeout: 20,
  connect_timeout: 10
});

// Initialize Drizzle with the configured client
const db = drizzle(sql, { schema });

export { db, sql };