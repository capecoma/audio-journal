import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize Drizzle with the configured pool
export const db = drizzle(pool, { schema });

// Export pool for direct queries when needed
export const sql = pool;

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export a function to test the connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    console.log('Database connection successful');
    client.release();
    return true;
  } catch (err) {
    console.error('Error connecting to the database:', err);
    return false;
  }
}