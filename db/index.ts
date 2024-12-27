import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create postgres connection
const sql = postgres(process.env.DATABASE_URL);

// Create drizzle database instance with minimal configuration
export const db = drizzle(sql);

// Basic test connection function
export async function testConnection() {
  try {
    const result = await sql`SELECT 1`;
    console.log('Database connection successful:', result);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}

export { sql };