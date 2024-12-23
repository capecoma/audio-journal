import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

// Load environment variables
config();

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  verbose: true,
  dialect: "postgresql",
  driver: "postgres",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL
  },
  strict: true
});