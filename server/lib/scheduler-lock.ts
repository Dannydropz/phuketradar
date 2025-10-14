/**
 * Scheduler Lock Using PostgreSQL Advisory Locks
 * 
 * This module provides a distributed lock mechanism using PostgreSQL's advisory locks.
 * Advisory locks are session-based and automatically released when the connection closes,
 * making them perfect for preventing duplicate scheduled task executions across multiple
 * server instances.
 * 
 * How it works:
 * - pg_try_advisory_lock(key) attempts to acquire a lock with the given numeric key
 * - Returns true if lock acquired, false if already held by another session
 * - Lock is automatically released when connection closes or explicitly unlocked
 * - Works across ALL database connections, making it cluster-safe
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Lock key for scheduler (arbitrary number, just needs to be consistent)
const SCHEDULER_LOCK_KEY = 123456789;

/**
 * Attempts to acquire the scheduler lock.
 * Returns true if lock was acquired, false if another process holds it.
 */
export async function acquireSchedulerLock(): Promise<boolean> {
  try {
    const result = await sql`SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_KEY}) as acquired`;
    return result[0]?.acquired === true;
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
    await sql`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_KEY})`;
  } catch (error) {
    console.error("Error releasing scheduler lock:", error);
    // Lock will be automatically released when connection closes
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
