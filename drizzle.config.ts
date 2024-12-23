import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  verbose: true,
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL
  }
});