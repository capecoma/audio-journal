import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure neon to use fetch API with connection pooling
neonConfig.fetchConnectionCache = true;

// Create SQL client with retries and error handling
const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store',
    keepalive: false
  }
});

// Initialize Drizzle with the neon HTTP connection
export const db = drizzle(sql, { schema });

// Add a health check function with retries
export async function checkDatabaseConnection(retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database health check attempt ${attempt}/${retries}...`);
      const result = await sql`SELECT 1 as check`;
      console.log('Database health check successful');
      return result.length > 0;
    } catch (error) {
      console.error(`Database health check failed (attempt ${attempt}):`, error);
      if (attempt === retries) {
        return false;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  return false;
}

// Handle cleanup on application shutdown
process.on('SIGINT', async () => {
  try {
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error during database shutdown:', err);
  }
  process.exit(0);
});