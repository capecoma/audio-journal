import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create the PostgreSQL connection
const client = postgres(process.env.DATABASE_URL, {
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10
});

// Create and export the database instance with schema
export const db = drizzle(client, { schema });

// Export client for clean shutdown if needed
export { client };