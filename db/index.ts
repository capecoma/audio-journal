import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@db/schema";
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Create a singleton instance
let _db: ReturnType<typeof drizzle> | null = null;
let _initializing = false;
let _initPromise: Promise<ReturnType<typeof drizzle>> | null = null;

// Initialize database connection with retries
async function initializeDatabase(retries = 3, delay = 1000): Promise<ReturnType<typeof drizzle>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const sql = neon(process.env.DATABASE_URL!);

      // Test the connection
      await sql`SELECT 1`;
      console.log(`Database connection successful on attempt ${attempt}`);

      // Create the Drizzle instance
      return drizzle(sql, { schema });
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);

      if (attempt === retries) {
        throw new Error(`Failed to initialize database after ${retries} attempts`);
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw new Error("Failed to initialize database");
}

// Initialize and get the database instance
export async function initDb(): Promise<ReturnType<typeof drizzle>> {
  if (_db) {
    return _db;
  }

  if (_initPromise) {
    return _initPromise;
  }

  if (_initializing) {
    throw new Error("Database initialization already in progress");
  }

  try {
    _initializing = true;
    _initPromise = initializeDatabase();
    _db = await _initPromise;
    console.log("Database initialized successfully");
    return _db;
  } catch (error) {
    console.error("Fatal database initialization error:", error);
    _initializing = false;
    _initPromise = null;
    throw error;
  } finally {
    _initializing = false;
    _initPromise = null;
  }
}

// Get the initialized database instance
export function getDb(): ReturnType<typeof drizzle> {
  if (!_db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _db;
}

// Handle cleanup on application shutdown
function cleanup() {
  console.log('Cleaning up database connections...');
  _db = null;
  _initializing = false;
  _initPromise = null;
}

// Setup process handlers
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  cleanup();
  process.exit(1);
});