/**
 * Simple in-memory cache for frequently accessed data
 * This provides server-side caching to reduce database load
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class MemoryCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Run cleanup every 60 seconds to remove expired entries
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Get a cached value
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set a cached value with TTL in milliseconds
     */
    set<T>(key: string, data: T, ttlMs: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttlMs,
        });
    }

    /**
     * Delete a specific cache entry
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalidate all entries matching a pattern
     */
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        const keys = Array.from(this.cache.keys());
        for (const key of keys) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache stats
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());
        for (const [key, entry] of entries) {
            if (now > entry.timestamp + entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Stop the cleanup interval (for graceful shutdown)
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
    PUBLISHED_ARTICLES: 'articles:published',
    CATEGORY_ARTICLES: (category: string) => `articles:category:${category}`,
    TRENDING_ARTICLES: 'articles:trending',
    JOURNALISTS: 'journalists:all',
    ARTICLE_BY_SLUG: (slug: string) => `article:slug:${slug}`,
    ARTICLE_BY_ID: (id: string) => `article:id:${id}`,
};

// Cache TTLs in milliseconds
export const CACHE_TTL = {
    ARTICLES_LIST: 60 * 1000,      // 1 minute for article lists
    ARTICLE_DETAIL: 5 * 60 * 1000, // 5 minutes for article detail
    TRENDING: 2 * 60 * 1000,       // 2 minutes for trending
    JOURNALISTS: 10 * 60 * 1000,   // 10 minutes for journalists
};

/**
 * Helper function to wrap async functions with caching
 */
export async function withCache<T>(
    key: string,
    ttlMs: number,
    fetchFn: () => Promise<T>
): Promise<T> {
    // Check cache first
    const cached = cache.get<T>(key);
    if (cached !== null) {
        console.log(`[CACHE] HIT: ${key}`);
        return cached;
    }

    // Fetch fresh data
    console.log(`[CACHE] MISS: ${key}`);
    const data = await fetchFn();

    // Store in cache
    cache.set(key, data, ttlMs);

    return data;
}

/**
 * Invalidate article caches when articles are modified
 */
export function invalidateArticleCaches(): void {
    cache.invalidatePattern('^articles:');
    cache.invalidatePattern('^article:');
    console.log('[CACHE] Invalidated all article caches');
}
