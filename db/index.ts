import { drizzle } from "drizzle-orm/neon-http";
import { neon } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the Neon connection with HTTP protocol
const sql = neon(process.env.DATABASE_URL);

// Initialize drizzle with the connection
export const db = drizzle(sql, { schema });

// Add a health check function that uses the raw SQL connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as check`;
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}