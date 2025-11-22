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

      const isRetryable =
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Connection closed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT';

      if (!isRetryable || attempt === maxRetries) {
        console.error(`[DB-RETRY] ${operationName} failed after ${attempt} attempt(s)`);
        throw error;
      }

      const delay = retryDelayMs * attempt;
      console.warn(`[DB-RETRY] ${operationName} failed (attempt ${attempt}/${maxRetries})`);
      console.warn(`[DB-RETRY] Error: ${error.message}`);
      console.warn(`[DB-RETRY] Retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
