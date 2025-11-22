/**
 * Rate limiter for database operations
 * Prevents overwhelming Neon's serverless database during heavy scraping
 */

let lastOperationTime = 0;
const MIN_OPERATION_INTERVAL = 100; // Minimum 100ms between operations

/**
 * Throttle database operations to prevent overwhelming the connection pool
 */
export async function throttleDatabaseOperation(): Promise<void> {
    const now = Date.now();
    const timeSinceLastOp = now - lastOperationTime;

    if (timeSinceLastOp < MIN_OPERATION_INTERVAL) {
        const delay = MIN_OPERATION_INTERVAL - timeSinceLastOp;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    lastOperationTime = Date.now();
}

/**
 * Add a small delay between batch operations
 * Useful when processing multiple articles in a loop
 */
export async function batchOperationDelay(operationNumber: number): Promise<void> {
    // Add a small delay every 5 operations to give the database breathing room
    if (operationNumber % 5 === 0) {
        console.log(`[DB-THROTTLE] Pausing for 2s after ${operationNumber} operations...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
