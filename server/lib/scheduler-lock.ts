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

import { pool } from "../db";

const LOCK_NAME = "scheduler_scrape";
const STALE_LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Ensures the scheduler_locks table exists.
 */
async function ensureLocksTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduler_locks (
        lock_name VARCHAR(255) PRIMARY KEY,
        acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
        instance_id VARCHAR(255)
      )
    `);
  } catch (error) {
    console.error("Error creating scheduler_locks table:", error);
  }
}

/**
 * Cleans up stale locks (older than 15 minutes).
 */
async function cleanStaleLocks(): Promise<void> {
  try {
    const staleThreshold = new Date(Date.now() - STALE_LOCK_TIMEOUT_MS);
    await pool.query(
      `DELETE FROM scheduler_locks WHERE acquired_at < $1`,
      [staleThreshold]
    );
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

    const result = await pool.query(
      `INSERT INTO scheduler_locks (lock_name, instance_id, acquired_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (lock_name) DO NOTHING
       RETURNING lock_name`,
      [LOCK_NAME, instanceId]
    );

    return result.rowCount !== null && result.rowCount > 0;
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
    await pool.query(
      `DELETE FROM scheduler_locks WHERE lock_name = $1`,
      [LOCK_NAME]
    );
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
