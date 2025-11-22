import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for optimal serverless performance
neonConfig.webSocketConstructor = ws;

// CRITICAL: Increase fetch connection timeout for Neon's serverless architecture
// Neon can have cold starts and network latency, especially during heavy operations
neonConfig.fetchConnectionCache = true; // Enable connection caching
neonConfig.pipelineConnect = false; // Disable pipelining to avoid timeout issues

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Increased back to 10 for better concurrency during scraping
  min: 2, // Keep 2 connections warm to avoid cold starts
  idleTimeoutMillis: 60000, // Increased to 60s to keep connections alive longer
  connectionTimeoutMillis: 120000, // Increased to 120s for slow Neon queries during scraping

  // Add query timeout to prevent indefinite hangs
  query_timeout: 60000, // 60 second query timeout

  // Allow connections to be reused more aggressively
  allowExitOnIdle: false,
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

  // Set statement timeout on each new connection to prevent indefinite queries
  client.query('SET statement_timeout = 60000').catch((err) => {
    console.error('[DB POOL] Failed to set statement_timeout:', err);
  });
});

pool.on('remove', () => {
  console.log('[DB POOL] Database connection removed from pool');
});

pool.on('acquire', () => {
  console.log('[DB POOL] Connection acquired from pool');
});

export const db = drizzle({ client: pool, schema });
