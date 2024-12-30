import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@db/schema";
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Initialize database connection
let sql;
try {
  sql = neon(process.env.DATABASE_URL);
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  process.exit(1);
}

// Create db instance with schema
export const db = drizzle(sql, { schema });

// Test the connection
(async () => {
  try {
    // Simple query to test connection
    await sql`SELECT 1`;
    console.log("Database connection initialized successfully");
  } catch (error) {
    console.error("Failed to test database connection:", error);
    process.exit(1);
  }
})();

// Handle cleanup on application shutdown
process.on('SIGINT', () => {
  console.log('Cleaning up database connection...');
  process.exit(0);
});