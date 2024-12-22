import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure neon to use WebSocket
neonConfig.webSocket = ws;

// Create the SQL connection
const sql = neon(process.env.DATABASE_URL!);

// Create and export the database instance
export const db = drizzle(sql);

// Export sql for clean shutdown if needed
export { sql };