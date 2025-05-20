import { defineConfig } from "drizzle-kit";

// Add Node.js process type declaration
declare const process: { env: { [key: string]: string | undefined } };

// For Render deployment: Use a dummy URL if DATABASE_URL is not available
// This allows the build process to complete without errors
const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy_db';

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
