import { pool } from '../db';

/**
 * Database connection health checker
 * Helps detect and recover from connection issues before they cause timeouts
 */

let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

export async function checkDatabaseHealth(): Promise<boolean> {
    const now = Date.now();

    // Don't check too frequently
    if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
        return consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
    }

    try {
        // Simple ping query with timeout
        const result = await Promise.race([
            pool.query('SELECT 1 as health'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Health check timeout')), 5000)
            )
        ]);

        lastHealthCheck = now;
        consecutiveFailures = 0;
        console.log('[DB-HEALTH] ✅ Database connection healthy');
        return true;
    } catch (error: any) {
        consecutiveFailures++;
        lastHealthCheck = now;

        console.error(`[DB-HEALTH] ❌ Database health check failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
        console.error(`[DB-HEALTH] Error: ${error.message}`);

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error('[DB-HEALTH] 🚨 Database appears to be down - circuit breaker triggered');
            return false;
        }

        return true;
    }
}

/**
 * Wait for database to become healthy
 * Useful before starting heavy operations like scraping
 */
export async function waitForDatabaseHealth(maxWaitMs = 60000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        const isHealthy = await checkDatabaseHealth();

        if (isHealthy) {
            return true;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.error('[DB-HEALTH] ❌ Database did not become healthy within timeout');
    return false;
}

/**
 * Reset health check state (useful after recovering from errors)
 */
export function resetHealthCheck() {
    consecutiveFailures = 0;
    lastHealthCheck = 0;
    console.log('[DB-HEALTH] Health check state reset');
}
