import type { DiscoveredFeed } from '@tuvixrss/tricorder';
import { describe, it, expect } from 'vitest';
import { normalizeFeedUrl, groupFeedsByUrl } from './feedGrouping';

describe('feedGrouping', () => {
  describe('normalizeFeedUrl', () => {
    it('should remove trailing slashes', () => {
      expect(normalizeFeedUrl('https://example.com/feed/')).toBe('https://example.com/feed');
      expect(normalizeFeedUrl('https://example.com/feed///')).toBe('https://example.com/feed');
    });

    it('should remove /atom/ suffix', () => {
      expect(normalizeFeedUrl('https://example.com/atom/')).toBe('https://example.com');
      expect(normalizeFeedUrl('https://example.com/feed/atom')).toBe('https://example.com/feed');
    });

    it('should remove /rss/ suffix', () => {
      expect(normalizeFeedUrl('https://example.com/rss/')).toBe('https://example.com');
      expect(normalizeFeedUrl('https://example.com/feed/rss')).toBe('https://example.com/feed');
    });

    it('should remove .rss extension', () => {
      expect(normalizeFeedUrl('https://example.com/feed.rss')).toBe('https://example.com/feed');
    });

    it('should remove .atom extension', () => {
      expect(normalizeFeedUrl('https://example.com/feed.atom')).toBe('https://example.com/feed');
    });

    it('should remove .xml extension', () => {
      expect(normalizeFeedUrl('https://example.com/feed.xml')).toBe('https://example.com/feed');
    });

    it('should normalize /feed/ variations', () => {
      expect(normalizeFeedUrl('https://example.com/feed/')).toBe('https://example.com/feed');
      expect(normalizeFeedUrl('https://example.com/FEED')).toBe('https://example.com/feed');
    });

    it('should remove format query parameters', () => {
      expect(normalizeFeedUrl('https://example.com/feed?format=rss')).toBe(
        'https://example.com/feed'
      );
      expect(normalizeFeedUrl('https://example.com/feed?format=atom')).toBe(
        'https://example.com/feed'
      );
      expect(normalizeFeedUrl('https://example.com/feed?type=rss')).toBe(
        'https://example.com/feed'
      );
      expect(normalizeFeedUrl('https://example.com/feed?type=atom')).toBe(
        'https://example.com/feed'
      );
    });

    it('should remove format parameters with other query params', () => {
      expect(normalizeFeedUrl('https://example.com/feed?foo=bar&format=rss&baz=qux')).toBe(
        'https://example.com/feed?foo=bar&baz=qux'
      );
    });

    it('should convert to lowercase', () => {
      expect(normalizeFeedUrl('HTTPS://EXAMPLE.COM/FEED')).toBe('https://example.com/feed');
    });

    it('should handle complex URLs', () => {
      const url = 'https://example.com/blog/feed.rss?format=rss&extra=param';
      const normalized = normalizeFeedUrl(url);
      expect(normalized).toBe('https://example.com/blog/feed?extra=param');
    });

    it('should normalize different feed URL variants to same value', () => {
      const urls = [
        'https://example.com/feed',
        'https://example.com/feed/',
        'https://example.com/feed.rss',
        'https://example.com/feed.atom',
        'https://example.com/feed.xml',
        'https://example.com/feed?format=rss',
        'https://example.com/feed?format=atom',
        'HTTPS://EXAMPLE.COM/FEED',
      ];

      const normalized = urls.map(normalizeFeedUrl);
      const first = normalized[0];

      normalized.forEach((url) => {
        expect(url).toBe(first);
      });
    });
  });

  describe('groupFeedsByUrl', () => {
    it('should group RSS and Atom feeds together', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog RSS',
          url: 'https://example.com/feed.rss',
          type: 'rss',
        },
        {
          title: 'Blog Atom',
          url: 'https://example.com/feed.atom',
          type: 'atom',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual({
        normalizedUrl: 'https://example.com/feed',
        rss: feeds[0],
        atom: feeds[1],
      });
    });

    it('should keep separate feeds in different groups', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog RSS',
          url: 'https://example.com/blog/feed.rss',
          type: 'rss',
        },
        {
          title: 'News RSS',
          url: 'https://example.com/news/feed.rss',
          type: 'rss',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(2);
    });

    it('should handle feeds with only RSS', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog RSS',
          url: 'https://example.com/feed.rss',
          type: 'rss',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual({
        normalizedUrl: 'https://example.com/feed',
        rss: feeds[0],
      });
      expect(groups[0].atom).toBeUndefined();
    });

    it('should handle feeds with only Atom', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog Atom',
          url: 'https://example.com/feed.atom',
          type: 'atom',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual({
        normalizedUrl: 'https://example.com/feed',
        atom: feeds[0],
      });
      expect(groups[0].rss).toBeUndefined();
    });

    it('should handle empty feed array', () => {
      const groups = groupFeedsByUrl([]);
      expect(groups).toHaveLength(0);
    });

    it('should handle case-insensitive feed types', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog RSS',
          url: 'https://example.com/feed.rss',
          type: 'RSS' as unknown as 'rss', // Type might come as uppercase
        },
        {
          title: 'Blog Atom',
          url: 'https://example.com/feed.atom',
          type: 'ATOM' as unknown as 'atom',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(1);
      expect(groups[0].rss).toBeDefined();
      expect(groups[0].atom).toBeDefined();
    });

    it('should group feeds with different query parameters', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog RSS',
          url: 'https://example.com/feed?format=rss',
          type: 'rss',
        },
        {
          title: 'Blog Atom',
          url: 'https://example.com/feed?format=atom',
          type: 'atom',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(1);
      expect(groups[0].rss).toBeDefined();
      expect(groups[0].atom).toBeDefined();
    });

    it('should handle multiple feed groups', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog RSS',
          url: 'https://example.com/blog/feed.rss',
          type: 'rss',
        },
        {
          title: 'Blog Atom',
          url: 'https://example.com/blog/feed.atom',
          type: 'atom',
        },
        {
          title: 'News RSS',
          url: 'https://example.com/news/feed.rss',
          type: 'rss',
        },
        {
          title: 'News Atom',
          url: 'https://example.com/news/feed.atom',
          type: 'atom',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(2);

      // Check that each group has both RSS and Atom
      groups.forEach((group) => {
        expect(group.rss).toBeDefined();
        expect(group.atom).toBeDefined();
      });
    });

    it('should preserve feed metadata when grouping', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'My Blog - RSS',
          url: 'https://example.com/feed.rss',
          type: 'rss',
        },
        {
          title: 'My Blog - Atom',
          url: 'https://example.com/feed.atom',
          type: 'atom',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups[0].rss?.title).toBe('My Blog - RSS');
      expect(groups[0].atom?.title).toBe('My Blog - Atom');
    });

    it('should handle duplicate feeds of same type', () => {
      // If somehow we get duplicate RSS feeds with same normalized URL,
      // last one should win
      const feeds: DiscoveredFeed[] = [
        {
          title: 'First RSS',
          url: 'https://example.com/feed.rss',
          type: 'rss',
        },
        {
          title: 'Second RSS',
          url: 'https://example.com/feed.xml',
          type: 'rss',
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(1);
      expect(groups[0].rss?.title).toBe('Second RSS');
    });

    it('should ignore feeds with unknown types', () => {
      const feeds: DiscoveredFeed[] = [
        {
          title: 'Blog RSS',
          url: 'https://example.com/feed.rss',
          type: 'rss',
        },
        {
          title: 'Unknown Feed',
          url: 'https://example.com/feed.json',
          type: 'json' as unknown as 'rss', // Unknown type
        },
      ];

      const groups = groupFeedsByUrl(feeds);

      expect(groups).toHaveLength(2);
      // JSON feed should have its own group but without rss/atom properties
      const jsonGroup = groups.find((g) => g.normalizedUrl.includes('json'));
      expect(jsonGroup?.rss).toBeUndefined();
      expect(jsonGroup?.atom).toBeUndefined();
    });
  });
});
