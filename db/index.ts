import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as schema from "@db/schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure Neon to use WebSocket for serverless environment
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
// Use password mode for pipelineTLS as true is not a valid value
neonConfig.pipelineTLS = "password";
neonConfig.pipelineConnect = true;

// Initialize the database connection
export const db = drizzle(process.env.DATABASE_URL, { schema });

// Add a health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await db.execute(sql`SELECT 1 as check`);
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}