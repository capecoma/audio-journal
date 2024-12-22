import { drizzle } from "drizzle-orm/neon-http";
import { neon } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a direct HTTP connection to Neon
const sql = neon(process.env.DATABASE_URL);

// Create and export the database instance
export const db = drizzle(sql, { schema });