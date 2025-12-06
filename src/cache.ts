import browser from 'webextension-polyfill';
import type { DiscoveredFeed } from '@tuvixrss/tricorder';
import { getCacheTtl } from './config';

export interface CacheEntry {
  url: string;
  feeds: DiscoveredFeed[];
  timestamp: number;
  ttl: number;
}

export interface CacheStorage {
  [normalizedUrl: string]: CacheEntry;
}

const CACHE_KEY = 'feedDiscoveryCache';

/**
 * Normalize URL for cache key by removing query params and fragments
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Get cached feed discovery results
 */
export async function getCachedFeeds(url: string): Promise<DiscoveredFeed[] | null> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const result = await browser.storage.local.get(CACHE_KEY);
    const cache: CacheStorage = (result[CACHE_KEY] ?? {}) as CacheStorage;

    const entry = cache[normalizedUrl];

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache entry has expired
    if (age > entry.ttl) {
      // Clean up expired entry
      delete cache[normalizedUrl];
      await browser.storage.local.set({ [CACHE_KEY]: cache });
      return null;
    }

    return entry.feeds;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Store feed discovery results in cache
 */
export async function setCachedFeeds(
  url: string,
  feeds: DiscoveredFeed[],
  ttl?: number
): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const result = await browser.storage.local.get(CACHE_KEY);
    const cache: CacheStorage = (result[CACHE_KEY] ?? {}) as CacheStorage;

    cache[normalizedUrl] = {
      url: normalizedUrl,
      feeds,
      timestamp: Date.now(),
      ttl: ttl ?? (await getCacheTtl()),
    };

    await browser.storage.local.set({ [CACHE_KEY]: cache });
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Clear all cached feed discoveries
 */
export async function clearCache(): Promise<void> {
  try {
    await browser.storage.local.remove(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear cache entry for specific URL
 */
export async function clearCacheEntry(url: string): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const result = await browser.storage.local.get(CACHE_KEY);
    const cache: CacheStorage = (result[CACHE_KEY] ?? {}) as CacheStorage;

    delete cache[normalizedUrl];
    await browser.storage.local.set({ [CACHE_KEY]: cache });
  } catch (error) {
    console.error('Error clearing cache entry:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}> {
  try {
    const result = await browser.storage.local.get(CACHE_KEY);
    const cache: CacheStorage = (result[CACHE_KEY] ?? {}) as CacheStorage;

    const entries = Object.values(cache);
    const timestamps = entries.map((e) => e.timestamp);

    return {
      totalEntries: entries.length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalEntries: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const result = await browser.storage.local.get(CACHE_KEY);
    const cache: CacheStorage = (result[CACHE_KEY] ?? {}) as CacheStorage;

    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of Object.entries(cache)) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        delete cache[key];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await browser.storage.local.set({ [CACHE_KEY]: cache });
    }

    return removedCount;
  } catch (error) {
    console.error('Error cleaning expired cache:', error);
    return 0;
  }
}
