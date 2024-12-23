import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

// Create postgres connection
const sql = postgres({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 1
});

// Create drizzle database instance
export const db = drizzle(sql, { schema });

// Test connection function
export async function testConnection() {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}

export { sql };