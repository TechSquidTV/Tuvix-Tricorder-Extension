import { describe, it, expect } from 'vitest';
import { getConfig, setConfig, getBaseUrl, getCacheTtl, type SubscribeAction } from './config';

describe('config', () => {
  describe('getConfig', () => {
    it('should return default config when no config is stored', async () => {
      const config = await getConfig();

      expect(config).toEqual({
        baseUrl: 'https://feed.tuvix.app',
        cacheTtlDays: 90,
        subscribeAction: 'tuvix',
      });
    });

    it('should merge stored config with defaults', async () => {
      await setConfig({ baseUrl: 'https://custom.example.com' });

      const config = await getConfig();

      expect(config).toEqual({
        baseUrl: 'https://custom.example.com',
        cacheTtlDays: 90, // Should still have default
        subscribeAction: 'tuvix', // Should still have default
      });
    });

    it('should retrieve all stored config values', async () => {
      await setConfig({
        baseUrl: 'https://custom.example.com',
        cacheTtlDays: 30,
        subscribeAction: 'feed-reader',
      });

      const config = await getConfig();

      expect(config).toEqual({
        baseUrl: 'https://custom.example.com',
        cacheTtlDays: 30,
        subscribeAction: 'feed-reader',
      });
    });
  });

  describe('setConfig', () => {
    it('should store config values', async () => {
      await setConfig({ baseUrl: 'https://test.example.com' });

      const config = await getConfig();
      expect(config.baseUrl).toBe('https://test.example.com');
    });

    it('should update existing config partially', async () => {
      await setConfig({
        baseUrl: 'https://first.example.com',
        cacheTtlDays: 60,
      });

      // Update only baseUrl
      await setConfig({ baseUrl: 'https://second.example.com' });

      const config = await getConfig();
      expect(config.baseUrl).toBe('https://second.example.com');
      expect(config.cacheTtlDays).toBe(60); // Should remain unchanged
    });

    it('should handle all subscribe action types', async () => {
      const actions: SubscribeAction[] = ['tuvix', 'feed-reader', 'raw-url'];

      for (const action of actions) {
        await setConfig({ subscribeAction: action });
        const config = await getConfig();
        expect(config.subscribeAction).toBe(action);
      }
    });

    it('should handle cache TTL updates', async () => {
      const ttls = [1, 7, 30, 90, 180, 365];

      for (const ttl of ttls) {
        await setConfig({ cacheTtlDays: ttl });
        const config = await getConfig();
        expect(config.cacheTtlDays).toBe(ttl);
      }
    });

    it('should store multiple config values at once', async () => {
      await setConfig({
        baseUrl: 'https://multi.example.com',
        cacheTtlDays: 45,
        subscribeAction: 'raw-url',
      });

      const config = await getConfig();
      expect(config).toEqual({
        baseUrl: 'https://multi.example.com',
        cacheTtlDays: 45,
        subscribeAction: 'raw-url',
      });
    });
  });

  describe('getBaseUrl', () => {
    it('should return default base URL when not configured', async () => {
      const baseUrl = await getBaseUrl();
      expect(baseUrl).toBe('https://feed.tuvix.app');
    });

    it('should return configured base URL', async () => {
      await setConfig({ baseUrl: 'https://custom.example.com' });

      const baseUrl = await getBaseUrl();
      expect(baseUrl).toBe('https://custom.example.com');
    });
  });

  describe('getCacheTtl', () => {
    it('should return default TTL in milliseconds when not configured', async () => {
      const ttl = await getCacheTtl();

      const expectedMs = 90 * 24 * 60 * 60 * 1000; // 90 days
      expect(ttl).toBe(expectedMs);
    });

    it('should convert configured days to milliseconds', async () => {
      await setConfig({ cacheTtlDays: 7 });

      const ttl = await getCacheTtl();

      const expectedMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      expect(ttl).toBe(expectedMs);
    });

    it('should handle 1 day TTL', async () => {
      await setConfig({ cacheTtlDays: 1 });

      const ttl = await getCacheTtl();

      const expectedMs = 1 * 24 * 60 * 60 * 1000; // 1 day
      expect(ttl).toBe(expectedMs);
    });

    it('should handle 1 year TTL', async () => {
      await setConfig({ cacheTtlDays: 365 });

      const ttl = await getCacheTtl();

      const expectedMs = 365 * 24 * 60 * 60 * 1000; // 365 days
      expect(ttl).toBe(expectedMs);
    });
  });

  describe('config persistence', () => {
    it('should persist config across multiple getConfig calls', async () => {
      await setConfig({
        baseUrl: 'https://persist.example.com',
        cacheTtlDays: 42,
        subscribeAction: 'feed-reader',
      });

      const config1 = await getConfig();
      const config2 = await getConfig();

      expect(config1).toEqual(config2);
    });

    it('should allow resetting to default values', async () => {
      // Set custom values
      await setConfig({
        baseUrl: 'https://custom.example.com',
        cacheTtlDays: 30,
        subscribeAction: 'raw-url',
      });

      // Reset to defaults
      await setConfig({
        baseUrl: 'https://feed.tuvix.app',
        cacheTtlDays: 90,
        subscribeAction: 'tuvix',
      });

      const config = await getConfig();
      expect(config).toEqual({
        baseUrl: 'https://feed.tuvix.app',
        cacheTtlDays: 90,
        subscribeAction: 'tuvix',
      });
    });
  });
});
