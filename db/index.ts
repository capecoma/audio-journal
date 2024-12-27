import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure neon to use WebSocket protocol
neonConfig.webSocketConstructor = ws;
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Handle cleanup on application shutdown
process.on('SIGINT', () => {
  console.log('Database connection closed');
  process.exit(0);
});