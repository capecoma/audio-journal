import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the neon connection
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Export a function to test the connection with retries
export async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sql`SELECT 1`;
      console.log('Database connection successful');
      return true;
    } catch (err) {
      console.error(`Error connecting to the database (attempt ${i + 1}/${retries}):`, err);
      if (i === retries - 1) {
        return false;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
}

// Export sql for direct queries when needed
export { sql };