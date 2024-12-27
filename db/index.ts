import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure the pool with WebSocket support
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 8000, // Increased timeout
  max: 20,
  idleTimeoutMillis: 30000,
  maxUses: 7500, // Recommended for serverless
  webSocketConstructor: ws // Using ws for WebSocket support
});

let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Enhanced error handling for the pool
pool.on('error', async (err) => {
  console.error('Database pool error:', err);

  if (retryCount < MAX_RETRIES) {
    retryCount++;
    console.log(`Attempting to reconnect (attempt ${retryCount}/${MAX_RETRIES})...`);

    try {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      await pool.connect();
      console.log('Reconnection successful');
      retryCount = 0;
    } catch (connectErr) {
      console.error('Reconnection failed:', connectErr);
      if (retryCount === MAX_RETRIES) {
        console.error('Max retries reached, giving up');
      }
    }
  }
});

// Handle connection events
pool.on('connect', () => {
  console.log('Successfully connected to database');
  retryCount = 0; // Reset retry count on successful connection
});

// Export the database instance
export const db = drizzle(pool, { schema });

// Add a health check function
export async function checkDatabaseConnection() {
  try {
    await pool.connect();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}