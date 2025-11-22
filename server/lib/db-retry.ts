export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  retryDelayMs = 1000,
  operationName = 'Database operation'
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Enhanced retryable error detection for Neon serverless
      const isRetryable =
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Connection closed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('timeout') ||
        error.message?.includes('timeout exceeded') || // Neon-specific timeout message
        error.message?.includes('connect ETIMEDOUT') ||
        error.message?.includes('socket hang up') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('Connection error') ||
        error.message?.includes('unable to get a connection') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        error.code === '57P01' || // PostgreSQL: terminating connection
        error.code === '08006' || // PostgreSQL: connection failure
        error.code === '08003' || // PostgreSQL: connection does not exist
        error.code === '08000';   // PostgreSQL: connection exception

      if (!isRetryable || attempt === maxRetries) {
        console.error(`[DB-RETRY] ${operationName} failed after ${attempt} attempt(s)`);
        throw error;
      }

      // Exponential backoff with jitter for better retry behavior
      const exponentialDelay = retryDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 500; // Add up to 500ms random jitter
      const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds

      console.warn(`[DB-RETRY] ${operationName} failed (attempt ${attempt}/${maxRetries})`);
      console.warn(`[DB-RETRY] Error: ${error.message}`);
      console.warn(`[DB-RETRY] Error code: ${error.code || 'N/A'}`);
      console.warn(`[DB-RETRY] Retrying in ${Math.round(delay)}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
