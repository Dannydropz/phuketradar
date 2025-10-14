/**
 * Scheduler Lock Using Row-Based Database Locking
 * 
 * This module provides a distributed lock mechanism using a database table.
 * Unlike advisory locks which require persistent sessions, this approach works
 * perfectly with stateless Neon serverless connections.
 * 
 * How it works:
 * - INSERT a lock row with ON CONFLICT DO NOTHING
 * - If INSERT succeeds, we have the lock
 * - If INSERT fails (conflict), another process holds the lock
 * - DELETE the row to release the lock
 * - Stale locks (older than 1 hour) are auto-cleaned on acquisition attempts
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const LOCK_NAME = "scheduler_scrape";
const STALE_LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/**
 * Ensures the scheduler_locks table exists.
 */
async function ensureLocksTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS scheduler_locks (
        lock_name VARCHAR(255) PRIMARY KEY,
        acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
        instance_id VARCHAR(255)
      )
    `;
  } catch (error) {
    console.error("Error creating scheduler_locks table:", error);
  }
}

/**
 * Cleans up stale locks (older than 1 hour).
 */
async function cleanStaleLocks(): Promise<void> {
  try {
    const staleThreshold = new Date(Date.now() - STALE_LOCK_TIMEOUT_MS);
    await sql`
      DELETE FROM scheduler_locks
      WHERE acquired_at < ${staleThreshold.toISOString()}
    `;
  } catch (error) {
    console.error("Error cleaning stale locks:", error);
  }
}

/**
 * Attempts to acquire the scheduler lock.
 * Returns true if lock was acquired, false if another process holds it.
 */
export async function acquireSchedulerLock(): Promise<boolean> {
  try {
    await ensureLocksTable();
    await cleanStaleLocks();

    const instanceId = `${process.pid}-${Date.now()}`;
    
    const result = await sql`
      INSERT INTO scheduler_locks (lock_name, instance_id, acquired_at)
      VALUES (${LOCK_NAME}, ${instanceId}, NOW())
      ON CONFLICT (lock_name) DO NOTHING
      RETURNING lock_name
    `;

    return result.length > 0;
  } catch (error) {
    console.error("Error acquiring scheduler lock:", error);
    return false;
  }
}

/**
 * Releases the scheduler lock.
 * Should be called when the scheduled task completes.
 */
export async function releaseSchedulerLock(): Promise<void> {
  try {
    await sql`
      DELETE FROM scheduler_locks
      WHERE lock_name = ${LOCK_NAME}
    `;
  } catch (error) {
    console.error("Error releasing scheduler lock:", error);
  }
}

/**
 * Executes a function with the scheduler lock.
 * Automatically acquires lock before execution and releases after.
 * Skips execution if lock cannot be acquired.
 */
export async function withSchedulerLock<T>(
  fn: () => Promise<T>,
  onSkip?: () => void
): Promise<T | null> {
  const lockAcquired = await acquireSchedulerLock();
  
  if (!lockAcquired) {
    if (onSkip) {
      onSkip();
    }
    return null;
  }

  try {
    const result = await fn();
    return result;
  } finally {
    await releaseSchedulerLock();
  }
}
