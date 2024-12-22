import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure neon to use HTTP
neonConfig.httpAgent = true;
neonConfig.useSecureWebSocket = false;
neonConfig.fetchConnectionCache = true;

// Create the SQL connection using HTTP client
const sql = neon(process.env.DATABASE_URL);

// Create and export the database instance with schema
export const db = drizzle(sql, { schema });

// Export sql for clean shutdown if needed
export { sql };