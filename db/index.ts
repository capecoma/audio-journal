import { drizzle } from "drizzle-orm/pg-pool";
import { Pool } from "pg";
import * as schema from "@db/schema";

// Create a new connection pool using individual connection parameters
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432', 10),
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
});

// Initialize drizzle with the connection pool
export const db = drizzle(pool, { schema });

// Add a health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT 1 as check');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}