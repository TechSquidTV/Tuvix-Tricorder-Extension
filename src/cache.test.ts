import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeUrl,
  getCachedFeeds,
  setCachedFeeds,
  clearCache,
  clearCacheEntry,
  getCacheStats,
  cleanExpiredCache,
  type CacheEntry,
  type CacheStorage,
} from './cache';
import type { DiscoveredFeed } from '@tuvixrss/tricorder';

// Mock getCacheTtl from config
vi.mock('./config', () => ({
  getCacheTtl: vi.fn(() => Promise.resolve(90 * 24 * 60 * 60 * 1000)), // 90 days in ms
}));

describe('cache', () => {
  describe('normalizeUrl', () => {
    it('should normalize URL by removing query params', () => {
      const url = 'https://example.com/page?foo=bar&baz=qux';
      expect(normalizeUrl(url)).toBe('https://example.com/page');
    });

    it('should normalize URL by removing fragments', () => {
      const url = 'https://example.com/page#section';
      expect(normalizeUrl(url)).toBe('https://example.com/page');
    });

    it('should normalize URL by removing both query params and fragments', () => {
      const url = 'https://example.com/page?foo=bar#section';
      expect(normalizeUrl(url)).toBe('https://example.com/page');
    });

    it('should preserve protocol and host', () => {
      const url = 'https://example.com:8080/path';
      expect(normalizeUrl(url)).toBe('https://example.com:8080/path');
    });

    it('should handle trailing slashes', () => {
      const url = 'https://example.com/page/';
      expect(normalizeUrl(url)).toBe('https://example.com/page/');
    });

    it('should return original URL if parsing fails', () => {
      const invalidUrl = 'not-a-valid-url';
      expect(normalizeUrl(invalidUrl)).toBe(invalidUrl);
    });

    it('should normalize different URLs to the same key', () => {
      const url1 = 'https://example.com/feed?format=rss';
      const url2 = 'https://example.com/feed?format=atom';
      expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
    });
  });

  describe('setCachedFeeds and getCachedFeeds', () => {
    const testUrl = 'https://example.com/feed';
    const mockFeeds: DiscoveredFeed[] = [
      {
        title: 'Test Feed',
        url: 'https://example.com/rss',
        type: 'rss',
      },
    ];

    it('should store and retrieve feeds from cache', async () => {
      await setCachedFeeds(testUrl, mockFeeds);
      const cachedFeeds = await getCachedFeeds(testUrl);

      expect(cachedFeeds).toEqual(mockFeeds);
    });

    it('should normalize URLs when caching', async () => {
      const urlWithParams = 'https://example.com/feed?foo=bar';
      await setCachedFeeds(urlWithParams, mockFeeds);

      // Should retrieve with different query params
      const urlWithDifferentParams = 'https://example.com/feed?baz=qux';
      const cachedFeeds = await getCachedFeeds(urlWithDifferentParams);

      expect(cachedFeeds).toEqual(mockFeeds);
    });

    it('should return null for non-existent cache entry', async () => {
      const cachedFeeds = await getCachedFeeds('https://nonexistent.com/feed');
      expect(cachedFeeds).toBeNull();
    });

    it('should return null for expired cache entry', async () => {
      const expiredTtl = 1; // 1ms
      await setCachedFeeds(testUrl, mockFeeds, expiredTtl);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cachedFeeds = await getCachedFeeds(testUrl);
      expect(cachedFeeds).toBeNull();
    });

    it('should clean up expired entries when accessed', async () => {
      const expiredTtl = 1; // 1ms
      await setCachedFeeds(testUrl, mockFeeds, expiredTtl);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      await getCachedFeeds(testUrl);

      // Verify entry was removed from storage
      const stats = await getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should handle custom TTL', async () => {
      const customTtl = 1000; // 1 second
      await setCachedFeeds(testUrl, mockFeeds, customTtl);

      const cachedFeeds = await getCachedFeeds(testUrl);
      expect(cachedFeeds).toEqual(mockFeeds);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed 1',
          url: 'https://example1.com/rss',
          type: 'rss',
        },
      ];

      await setCachedFeeds('https://example1.com/feed', mockFeeds);
      await setCachedFeeds('https://example2.com/feed', mockFeeds);

      await clearCache();

      const cachedFeeds1 = await getCachedFeeds('https://example1.com/feed');
      const cachedFeeds2 = await getCachedFeeds('https://example2.com/feed');

      expect(cachedFeeds1).toBeNull();
      expect(cachedFeeds2).toBeNull();
    });

    it('should handle clearing empty cache', async () => {
      await expect(clearCache()).resolves.not.toThrow();
    });
  });

  describe('clearCacheEntry', () => {
    it('should clear specific cache entry', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed 1',
          url: 'https://example1.com/rss',
          type: 'rss',
        },
      ];

      await setCachedFeeds('https://example1.com/feed', mockFeeds);
      await setCachedFeeds('https://example2.com/feed', mockFeeds);

      await clearCacheEntry('https://example1.com/feed');

      const cachedFeeds1 = await getCachedFeeds('https://example1.com/feed');
      const cachedFeeds2 = await getCachedFeeds('https://example2.com/feed');

      expect(cachedFeeds1).toBeNull();
      expect(cachedFeeds2).toEqual(mockFeeds);
    });

    it('should normalize URL when clearing', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed',
          url: 'https://example.com/rss',
          type: 'rss',
        },
      ];

      await setCachedFeeds('https://example.com/feed?foo=bar', mockFeeds);
      await clearCacheEntry('https://example.com/feed?baz=qux');

      const cachedFeeds = await getCachedFeeds('https://example.com/feed');
      expect(cachedFeeds).toBeNull();
    });

    it('should handle clearing non-existent entry', async () => {
      await expect(clearCacheEntry('https://nonexistent.com/feed')).resolves.not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('should return stats for empty cache', async () => {
      const stats = await getCacheStats();

      expect(stats).toEqual({
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
      });
    });

    it('should return correct stats for cache with entries', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed',
          url: 'https://example.com/rss',
          type: 'rss',
        },
      ];

      const now = Date.now();

      // Add first entry
      await setCachedFeeds('https://example1.com/feed', mockFeeds);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Add second entry
      await setCachedFeeds('https://example2.com/feed', mockFeeds);

      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(stats.oldestEntry).toBeLessThanOrEqual(stats.newestEntry!);
      expect(stats.oldestEntry).toBeGreaterThanOrEqual(now);
    });

    it('should return same timestamp for single entry', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed',
          url: 'https://example.com/rss',
          type: 'rss',
        },
      ];

      await setCachedFeeds('https://example.com/feed', mockFeeds);

      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.oldestEntry).toBe(stats.newestEntry);
    });
  });

  describe('cleanExpiredCache', () => {
    it('should remove expired entries', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed',
          url: 'https://example.com/rss',
          type: 'rss',
        },
      ];

      // Add expired entry
      const expiredTtl = 1; // 1ms
      await setCachedFeeds('https://expired.com/feed', mockFeeds, expiredTtl);

      // Add valid entry
      const validTtl = 1000000; // 1000 seconds
      await setCachedFeeds('https://valid.com/feed', mockFeeds, validTtl);

      // Wait for first entry to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const removedCount = await cleanExpiredCache();

      expect(removedCount).toBe(1);

      // Verify expired entry is gone
      const expiredFeeds = await getCachedFeeds('https://expired.com/feed');
      expect(expiredFeeds).toBeNull();

      // Verify valid entry still exists
      const validFeeds = await getCachedFeeds('https://valid.com/feed');
      expect(validFeeds).toEqual(mockFeeds);
    });

    it('should return 0 when no entries are expired', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed',
          url: 'https://example.com/rss',
          type: 'rss',
        },
      ];

      const validTtl = 1000000;
      await setCachedFeeds('https://example.com/feed', mockFeeds, validTtl);

      const removedCount = await cleanExpiredCache();
      expect(removedCount).toBe(0);
    });

    it('should handle empty cache', async () => {
      const removedCount = await cleanExpiredCache();
      expect(removedCount).toBe(0);
    });

    it('should clean multiple expired entries', async () => {
      const mockFeeds: DiscoveredFeed[] = [
        {
          title: 'Feed',
          url: 'https://example.com/rss',
          type: 'rss',
        },
      ];

      const expiredTtl = 1; // 1ms

      await setCachedFeeds('https://expired1.com/feed', mockFeeds, expiredTtl);
      await setCachedFeeds('https://expired2.com/feed', mockFeeds, expiredTtl);
      await setCachedFeeds('https://expired3.com/feed', mockFeeds, expiredTtl);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const removedCount = await cleanExpiredCache();
      expect(removedCount).toBe(3);

      const stats = await getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });
});
