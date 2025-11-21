import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced from 10 to prevent overwhelming Neon's free tier during scraping
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // Increased from 30s to 60s for slow Neon queries during scraping
});

pool.on('error', (err) => {
  console.error('[DB POOL] Unexpected database connection error:', err);
});

pool.on('connect', () => {
  console.log('[DB POOL] New database connection established');
});

pool.on('remove', () => {
  console.log('[DB POOL] Database connection removed from pool');
});

export const db = drizzle({ client: pool, schema });
