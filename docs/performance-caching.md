# Performance Optimization: Server-Side Caching

## Problem
The homepage and article pages were experiencing slow load times (several seconds) due to:
1. No server-side caching - every request hit the database
2. Article detail pages fetched ALL articles just for sidebar content
3. No HTTP cache headers - browsers couldn't cache responses
4. No CDN caching enabled

## Solution Implemented

### 1. In-Memory Server Cache (`server/lib/cache.ts`)
A simple yet effective in-memory cache system with:
- Configurable TTLs per resource type
- Automatic cleanup of expired entries
- Pattern-based cache invalidation

**Cache TTLs:**
- Article lists: 1 minute
- Article detail: 5 minutes  
- Trending articles: 2 minutes
- Journalists: 10 minutes

### 2. HTTP Cache Headers (Cloudflare-Compatible)
All public endpoints now include proper cache headers:
```
Cache-Control: public, max-age=30, stale-while-revalidate=60
```

With Cloudflare, this means:
- Content cached at edge POPs globally
- Sub-100ms response times for cached content
- `stale-while-revalidate` enables fast responses while refreshing in background

### 3. New Lightweight Sidebar Endpoint
Created `/api/articles/:id/sidebar` that returns ONLY:
- Latest 5 articles
- Related 3 articles (same category)

Instead of fetching 500+ articles just for sidebar display.

### 4. Cache Invalidation
Caches are automatically invalidated when:
- Article is created
- Article is updated
- Article is published
- Article is deleted

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| First Load (cold cache) | 2-3 seconds | 500-800ms |
| Subsequent Loads (warm cache) | 2-3 seconds | 50-100ms (via Cloudflare) |
| Article Detail Load | 2 seconds | 200-400ms |
| Database Queries/Page | 3-5 | 0-1 (cached) |

## Cloudflare Configuration (Recommended)

In your Cloudflare dashboard, consider these settings:

### Page Rules (Optional)
```
Pattern: phuketradar.com/api/articles*
Cache Level: Cache Everything
Edge Cache TTL: 1 minute
```

### Caching Configuration
- Browser Cache TTL: Respect Existing Headers ✓
- Edge Cache TTL: Use Custom (or respect headers)
- Always Online: Enabled ✓

### Performance Settings
- Auto Minify: HTML, CSS, JS ✓
- Brotli: On ✓
- Early Hints: On ✓
- Rocket Loader: Test before enabling

## Files Modified

1. `server/lib/cache.ts` - New cache system
2. `server/routes.ts` - Cache integration + HTTP headers
3. `client/src/pages/ArticleDetailNew.tsx` - Lightweight sidebar query

## Testing

To verify caching is working:
1. Check server logs for `[CACHE] HIT` vs `[CACHE] MISS` messages
2. Use browser dev tools Network tab to see `Cache-Control` headers
3. Use Cloudflare Analytics to monitor cache hit ratio
