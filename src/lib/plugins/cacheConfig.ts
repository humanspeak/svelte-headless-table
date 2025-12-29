import type { CacheOptions } from '@humanspeak/memory-cache'

/**
 * Default configuration for row state LRU caches used by plugins.
 * Provides automatic eviction to prevent unbounded memory growth
 * when row identities change.
 */
export const DEFAULT_ROW_STATE_CACHE_CONFIG: CacheOptions = {
    /** Maximum number of row state entries before LRU eviction */
    maxSize: 1000,
    /** Time-to-live in milliseconds (5 minutes) */
    ttl: 5 * 60 * 1000
}
