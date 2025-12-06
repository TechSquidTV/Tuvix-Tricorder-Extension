import type { DiscoveredFeed } from '@tuvixrss/tricorder';

export interface FeedGroup {
  atom?: DiscoveredFeed;
  rss?: DiscoveredFeed;
  normalizedUrl: string;
}

/**
 * Normalize a feed URL by removing format-specific parts to enable grouping
 * RSS and Atom feeds together
 */
export function normalizeFeedUrl(url: string): string {
  let normalized = url.toLowerCase().replace(/\/+$/, ''); // Remove trailing slashes

  // Split URL into base and query parts
  const [base, query] = normalized.split('?');

  // Normalize the base URL
  let normalizedBase = base
    .replace(/\/(atom|rss)\/?$/i, '') // Remove /atom/ or /rss/ at end
    .replace(/\.(rss|atom|xml)$/i, '') // Remove file extensions
    .replace(/\/(feed)\/?$/i, '/feed'); // Normalize to /feed

  // If there are query params, filter out format-specific ones
  if (query) {
    const params = query
      .split('&')
      .filter((param) => !/(format|type)=(rss|atom)/i.test(param))
      .join('&');

    if (params) {
      normalizedBase += '?' + params;
    }
  }

  return normalizedBase;
}

/**
 * Group feeds by normalized URL, combining RSS and Atom variants
 * @param feeds Array of discovered feeds
 * @returns Array of feed groups with normalized URLs
 */
export function groupFeedsByUrl(feeds: DiscoveredFeed[]): FeedGroup[] {
  const feedMap = new Map<string, FeedGroup>();

  feeds.forEach((feed) => {
    const normalizedUrl = normalizeFeedUrl(feed.url);

    let group = feedMap.get(normalizedUrl);
    if (!group) {
      group = { normalizedUrl };
      feedMap.set(normalizedUrl, group);
    }

    const feedType = feed.type.toLowerCase();
    if (feedType === 'atom') {
      group.atom = feed;
    } else if (feedType === 'rss') {
      group.rss = feed;
    }
  });

  return Array.from(feedMap.values());
}
