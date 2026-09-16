import { db } from './db';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours default

/**
 * Normalize url key for cache storage (strip origin, sort query params)
 */
export function normalizeCacheKey(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url, 'http://dummy.base');
        const searchParams = new URLSearchParams(parsed.search);
        searchParams.sort();
        const queryString = searchParams.toString();
        return `${parsed.pathname}${queryString ? `?${queryString}` : ''}`;
    } catch (parseErr) {
        console.warn('[OfflineCache] Failed to normalize cache URL:', url, parseErr);
        return url;
    }
}

/**
 * Save HTTP response data to IndexedDB cache
 */
export async function setCacheEntry(url, data, ttlMs = DEFAULT_TTL_MS) {
    if (!url || data === undefined) return;
    const key = normalizeCacheKey(url);
    try {
        await db.cache_entries.put({
            url: key,
            data,
            ttl: ttlMs,
            updatedAt: Date.now()
        });
    } catch (err) {
        console.warn('[OfflineCache] Failed to write cache for', key, err);
    }
}

/**
 * Retrieve cached HTTP response data from IndexedDB
 */
export async function getCacheEntry(url, maxAgeMs = null) {
    if (!url) return null;
    const key = normalizeCacheKey(url);
    try {
        const entry = await db.cache_entries.get(key);
        if (!entry) return null;

        const age = Date.now() - entry.updatedAt;
        const maxAge = maxAgeMs !== null ? maxAgeMs : (entry.ttl || DEFAULT_TTL_MS);

        if (age > maxAge) {
            // Expired, but for offline fallback we can still return it if needed
            return {
                data: entry.data,
                isStale: true,
                updatedAt: entry.updatedAt
            };
        }

        return {
            data: entry.data,
            isStale: false,
            updatedAt: entry.updatedAt
        };
    } catch (err) {
        console.warn('[OfflineCache] Failed to read cache for', key, err);
        return null;
    }
}

/**
 * Remove specific cache entry
 */
export async function removeCacheEntry(url) {
    if (!url) return;
    const key = normalizeCacheKey(url);
    try {
        await db.cache_entries.delete(key);
    } catch (err) {
        console.warn('[OfflineCache] Failed to delete cache for', key, err);
    }
}

/**
 * Prune all expired cache entries
 */
export async function pruneExpiredCache() {
    try {
        const now = Date.now();
        await db.cache_entries
            .filter(entry => entry.ttl && (now - entry.updatedAt > entry.ttl * 2))
            .delete();
    } catch (err) {
        console.warn('[OfflineCache] Failed to prune cache', err);
    }
}
