import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use standard PostgreSQL driver (pg) instead of Neon serverless driver
// This avoids WebSocket issues on Railway and provides a stable TCP connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000, // Standard 10s timeout is enough with TCP
  query_timeout: 60000,
  allowExitOnIdle: false,
  ssl: true // Neon requires SSL
});

pool.on('error', (err) => {
  console.error('[DB POOL] Unexpected database connection error:', err);
  console.error('[DB POOL] Error details:', {
    message: err.message,
    code: (err as any).code,
    stack: err.stack?.split('\n').slice(0, 3).join('\n')
  });
});

pool.on('connect', (client) => {
  console.log('[DB POOL] New database connection established');
});

pool.on('remove', () => {
  console.log('[DB POOL] Database connection removed from pool');
});

export const db = drizzle(pool, { schema });
