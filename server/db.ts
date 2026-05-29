import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse connection string to extract host for IPv4 forcing
const dbUrl = new URL(process.env.DATABASE_URL);
const dbHost = dbUrl.hostname;

// Use standard PostgreSQL driver instead of Neon serverless
// This provides stable TCP connections and avoids WebSocket timeout issues
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000, // Standard 10s is enough with TCP
  query_timeout: 60000,
  allowExitOnIdle: false,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }, // Neon/Supabase requires SSL
  // Explicitly set host to force DNS resolution (helps with IPv6 issues on Railway)
  host: dbHost,
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

// Auto-run migrations for skipped_low_value and status column
(async () => {
  console.log('[DB STARTUP] Ensuring schema migrations are applied...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skipped_low_value (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        source_url TEXT,
        caption TEXT NOT NULL,
        detected_markers TEXT[] DEFAULT ARRAY[]::TEXT[],
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('[DB STARTUP] Table skipped_low_value verified/created');

    await pool.query(`
      ALTER TABLE articles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    `);
    console.log('[DB STARTUP] Column articles.status verified/created');
  } catch (err) {
    console.error('[DB STARTUP] ❌ Failed to run startup migrations:', err);
  }
})();

export const db = drizzle(pool, { schema });
