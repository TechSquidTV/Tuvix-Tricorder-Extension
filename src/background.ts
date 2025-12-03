import { discoverFeeds, NoFeedsFoundError, type DiscoveredFeed } from '@tuvixrss/tricorder';
import browser from 'webextension-polyfill';
import { getCachedFeeds, setCachedFeeds, cleanExpiredCache } from './cache';

type IconState = 'disabled' | 'enabled' | 'discovered';

const ICONS: Record<IconState, Record<number, string>> = {
  disabled: {
    16: 'icons/tuvix-disabled-16.png',
    48: 'icons/tuvix-disabled-48.png',
    128: 'icons/tuvix-disabled-128.png'
  },
  enabled: {
    16: 'icons/tuvix-enabled-16.png',
    48: 'icons/tuvix-enabled-48.png',
    128: 'icons/tuvix-enabled-128.png'
  },
  discovered: {
    16: 'icons/tuvix-discovered-16.png',
    48: 'icons/tuvix-discovered-48.png',
    128: 'icons/tuvix-discovered-128.png'
  }
};

async function setIcon(tabId: number, state: IconState): Promise<void> {
  try {
    await browser.action.setIcon({
      tabId,
      path: ICONS[state]
    });
  } catch (error) {
    console.error('Failed to set icon:', error);
  }
}

async function discoverFeedsForTab(
  tabId: number,
  url: string,
  forceRefresh: boolean = false
): Promise<{ feeds: DiscoveredFeed[]; fromCache: boolean }> {
  try {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedFeeds = await getCachedFeeds(url);
      if (cachedFeeds !== null) {
        const icon = cachedFeeds.length > 0 ? 'discovered' : 'disabled';
        await setIcon(tabId, icon);
        return { feeds: cachedFeeds, fromCache: true };
      }
    }

    // Not in cache or force refresh - discover feeds
    await setIcon(tabId, 'enabled');
    const feeds = await discoverFeeds(url);

    // Cache the results
    await setCachedFeeds(url, feeds);

    const icon = feeds.length > 0 ? 'discovered' : 'disabled';
    await setIcon(tabId, icon);

    return { feeds, fromCache: false };
  } catch (error) {
    await setIcon(tabId, 'disabled');
    if (error instanceof NoFeedsFoundError) {
      // Cache empty results to avoid repeated failed lookups
      await setCachedFeeds(url, []);
      return { feeds: [], fromCache: false };
    }
    throw error;
  }
}

browser.runtime.onMessage.addListener((request: any, sender: browser.Runtime.MessageSender) => {
  if (request.action === 'discoverFeeds' && request.url) {
    const tabId = sender.tab?.id;
    if (!tabId) {
      return Promise.resolve({ success: false, error: 'No tab ID' });
    }

    const forceRefresh = request.forceRefresh || false;

    return discoverFeedsForTab(tabId, request.url, forceRefresh)
      .then(({ feeds, fromCache }) => ({ success: true, feeds, fromCache }))
      .catch((error: unknown) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
  }

  if (request.action === 'checkCache' && request.url) {
    return getCachedFeeds(request.url)
      .then((feeds) => ({ success: true, cached: feeds !== null, feeds }));
  }
});

async function handleTabNavigation(tabId: number, url: string): Promise<void> {
  try {
    // Step 1: Always start with disabled icon
    await setIcon(tabId, 'disabled');

    // Step 2: Check cache
    const cachedFeeds = await getCachedFeeds(url);

    if (cachedFeeds !== null) {
      // Cache hit - switch to discovered if feeds exist
      if (cachedFeeds.length > 0) {
        await setIcon(tabId, 'discovered');
      }
      // If cachedFeeds is empty array, stay disabled
    } else {
      // Cache miss - switch to enabled and start discovery
      await setIcon(tabId, 'enabled');

      try {
        const feeds = await discoverFeeds(url);

        // Cache the results
        await setCachedFeeds(url, feeds);

        // Switch to discovered if feeds found
        if (feeds.length > 0) {
          await setIcon(tabId, 'discovered');
        } else {
          await setIcon(tabId, 'disabled');
        }
      } catch (error) {
        // Discovery failed - cache empty result and switch to disabled
        if (error instanceof NoFeedsFoundError) {
          await setCachedFeeds(url, []);
        }
        await setIcon(tabId, 'disabled');
      }
    }
  } catch (error) {
    console.error('Error handling tab navigation:', error);
    await setIcon(tabId, 'disabled');
  }
}

browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      await handleTabNavigation(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.error('Error in onActivated listener:', error);
  }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      await handleTabNavigation(tabId, tab.url);
    }
  } catch (error) {
    console.error('Error in onUpdated listener:', error);
  }
});

// Clean up expired cache entries on startup
cleanExpiredCache().then((removed) => {
  if (removed > 0) {
    console.log(`Cleaned up ${removed} expired cache entries`);
  }
});
