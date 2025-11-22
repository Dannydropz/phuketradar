# Database Connection Improvements for Neon Serverless

## Problem
The application was experiencing frequent database connection timeouts during scraping operations, causing:
- Site unresponsiveness during scrapes
- "timeout exceeded when trying to connect" errors
- Failed article insertions
- Poor user experience

## Root Causes

### 1. **Neon Serverless Architecture**
- Neon databases can "cold start" when idle
- WebSocket connections can timeout during heavy operations
- Connection pool exhaustion under load

### 2. **Insufficient Timeout Configuration**
- Previous 60-second connection timeout was too short for:
  - Cold start recovery
  - Heavy scraping operations with many sequential DB calls
  - Semantic similarity checks requiring large data loads

### 3. **No Health Checking**
- Scrapes would start even if database was unhealthy
- No circuit breaker to prevent cascade failures

### 4. **Basic Retry Logic**
- Linear backoff instead of exponential
- Limited error type detection
- No jitter to prevent thundering herd

## Solutions Implemented

### 1. **Enhanced Database Configuration** (`server/db.ts`)

```typescript
// Increased connection timeout from 60s to 120s
connectionTimeoutMillis: 120000

// Increased pool size from 5 to 10 for better concurrency
max: 10

// Keep 2 connections warm to avoid cold starts
min: 2

// Increased idle timeout to keep connections alive longer
idleTimeoutMillis: 60000

// Enable Neon-specific optimizations
neonConfig.fetchConnectionCache = true
neonConfig.pipelineConnect = false

// Set statement timeout on each connection
client.query('SET statement_timeout = 60000')
```

**Benefits:**
- Handles Neon cold starts gracefully
- Better connection reuse
- Prevents indefinite query hangs
- More connections available during scraping peaks

### 2. **Improved Retry Logic** (`server/lib/db-retry.ts`)

**Enhancements:**
- **Exponential backoff with jitter**: Prevents thundering herd problem
- **Enhanced error detection**: Catches Neon-specific timeout messages
- **PostgreSQL error codes**: Handles connection-specific errors (08006, 08003, etc.)
- **Better logging**: Includes error codes and calculated delays

**Example:**
```typescript
// Attempt 1: Wait ~1s
// Attempt 2: Wait ~2s + jitter
// Attempt 3: Wait ~4s + jitter
// Attempt 4: Wait ~8s + jitter
// Attempt 5: Wait ~16s + jitter (capped at 30s)
```

### 3. **Database Health Checking** (`server/lib/db-health.ts`)

**Features:**
- Periodic health checks (every 30 seconds)
- Circuit breaker pattern (fails after 3 consecutive failures)
- Pre-scrape health validation
- Automatic recovery detection

**Usage:**
```typescript
// Before starting scrape
const isHealthy = await waitForDatabaseHealth(60000);
if (!isHealthy) {
  throw new Error("Database unhealthy - aborting scrape");
}
```

**Benefits:**
- Prevents scrapes from starting when DB is down
- Detects issues early before timeouts
- Reduces wasted API calls on doomed operations

### 4. **Database Throttling** (`server/lib/db-throttle.ts`)

**Features:**
- Minimum 100ms between operations
- Automatic 2-second pause every 5 operations
- Prevents connection pool exhaustion

**Usage:**
```typescript
// In scraping loop
await batchOperationDelay(articleNumber);
```

**Benefits:**
- Gives database breathing room
- Prevents overwhelming Neon's serverless infrastructure
- Reduces connection timeout likelihood

## Configuration Comparison

| Setting | Before | After | Reason |
|---------|--------|-------|--------|
| Connection Timeout | 60s | 120s | Handle cold starts |
| Pool Size | 5 | 10 | Better concurrency |
| Min Connections | 0 | 2 | Avoid cold starts |
| Idle Timeout | 30s | 60s | Keep connections warm |
| Retry Backoff | Linear | Exponential | Better retry behavior |
| Health Checks | None | Every 30s | Early issue detection |
| Operation Throttling | None | 100ms min | Prevent overload |

## Expected Improvements

### 1. **Reduced Timeout Errors**
- Longer timeouts handle Neon cold starts
- Exponential backoff gives more recovery time
- Health checks prevent starting when DB is down

### 2. **Better Site Responsiveness**
- Throttling prevents pool exhaustion
- More connections available for user requests
- Failed operations abort faster with circuit breaker

### 3. **Improved Scrape Reliability**
- Pre-scrape health check ensures DB is ready
- Better retry logic handles transient failures
- Throttling prevents overwhelming the database

### 4. **Better Observability**
- Enhanced logging shows error codes and retry delays
- Health check status visible in logs
- Connection pool events logged

## Monitoring

### Key Log Messages to Watch

**Healthy Operation:**
```
[DB-HEALTH] ✅ Database connection healthy
[DB POOL] New database connection established
✅ Database is healthy - proceeding with scrape
```

**Warning Signs:**
```
[DB-HEALTH] ❌ Database health check failed (1/3)
[DB-RETRY] Create article: ... failed (attempt 1/5)
[DB-THROTTLE] Pausing for 2s after 10 operations...
```

**Critical Issues:**
```
[DB-HEALTH] 🚨 Database appears to be down - circuit breaker triggered
❌ Database is unhealthy - aborting scrape to prevent timeouts
[DB-RETRY] ... failed after 5 attempt(s)
```

## Troubleshooting

### If timeouts still occur:

1. **Check Neon Dashboard**
   - Is the database in cold start?
   - Are there connection limits being hit?
   - Check for slow queries

2. **Increase Timeouts Further**
   ```typescript
   connectionTimeoutMillis: 180000 // 3 minutes
   ```

3. **Reduce Scrape Concurrency**
   - Process fewer sources at once
   - Add more throttling delays

4. **Check Railway Logs**
   - Look for memory issues
   - Check for CPU throttling
   - Verify network connectivity

### If site becomes unresponsive:

1. **Check Connection Pool**
   - Look for "Connection acquired" without "Connection removed"
   - May indicate connection leaks

2. **Increase Pool Size**
   ```typescript
   max: 15 // or higher
   ```

3. **Add Request Queuing**
   - Implement request queue for scraping
   - Process articles sequentially instead of in parallel

## Next Steps (If Issues Persist)

1. **Consider Neon Paid Tier**
   - Higher connection limits
   - Better performance
   - No cold starts

2. **Implement Connection Pooling Service**
   - PgBouncer or similar
   - Separate pool for scraping vs user requests

3. **Move to Dedicated Database**
   - Railway PostgreSQL
   - Supabase
   - Traditional hosted PostgreSQL

4. **Implement Job Queue**
   - Use BullMQ or similar
   - Process scraping asynchronously
   - Better failure handling

## Testing

To test these improvements:

1. **Trigger a manual scrape** via admin dashboard
2. **Monitor logs** for health checks and retry attempts
3. **Check site responsiveness** during scrape
4. **Verify articles are created** without timeout errors

## Rollback Plan

If these changes cause issues, revert by:

1. Restore `server/db.ts` to previous version
2. Restore `server/lib/db-retry.ts` to previous version
3. Remove health check from `server/scheduler.ts`
4. Delete `server/lib/db-health.ts` and `server/lib/db-throttle.ts`
