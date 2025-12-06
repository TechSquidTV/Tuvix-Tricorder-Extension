import browser from 'webextension-polyfill';
import type { DiscoveredFeed } from '@tuvixrss/tricorder';
import { getBaseUrl } from './config';

interface DiscoveryResponse {
  success: boolean;
  feeds?: DiscoveredFeed[];
  fromCache?: boolean;
  cached?: boolean;
  error?: string;
}

document.addEventListener('DOMContentLoaded', () => {
  const discoverBtn = document.getElementById('discoverBtn') as HTMLButtonElement;
  const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
  const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
  const statusIcon = document.getElementById('statusIcon') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;
  const feedsList = document.getElementById('feedsList') as HTMLDivElement;
  const errorEl = document.getElementById('error') as HTMLDivElement;

  if (!discoverBtn || !statusIcon || !statusText || !feedsList || !errorEl || !settingsBtn) {
    console.error('Required elements not found');
    return;
  }

  let currentUrl: string | null = null;
  let isFromCache = false;

  function setStatus(state: 'none' | 'searching' | 'found', text: string) {
    statusIcon.classList.remove('bg-muted-foreground', 'bg-yellow-500', 'bg-green-500', 'animate-pulse-subtle');

    if (state === 'searching') {
      statusIcon.classList.add('bg-yellow-500', 'animate-pulse-subtle');
    } else if (state === 'found') {
      statusIcon.classList.add('bg-green-500');
    } else {
      statusIcon.classList.add('bg-muted-foreground');
    }

    statusText.textContent = text;
  }

  function showError(message: string) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function hideError() {
    errorEl.classList.add('hidden');
  }

  async function renderFeeds(feeds: DiscoveredFeed[]) {
    feedsList.innerHTML = '';

    if (feeds.length === 0) {
      feedsList.innerHTML = `
        <div class="text-center py-6 space-y-1">
          <div class="text-xs font-medium text-card-foreground">No feeds found</div>
          <div class="text-[10px] text-muted-foreground">This page doesn't have any RSS or Atom feeds</div>
        </div>
      `;
      return;
    }

    const baseUrl = await getBaseUrl();

    // Add help text when multiple feeds are found
    if (feeds.length > 1) {
      const helpContainer = document.createElement('div');
      helpContainer.className = 'px-2 py-1 mb-1 text-[10px] text-muted-foreground bg-accent/30 rounded';
      helpContainer.innerHTML = `
        <span>Select a feed to follow.</span>
      `;
      feedsList.appendChild(helpContainer);
    }

    feeds.forEach(feed => {
      const feedItem = document.createElement('div');
      feedItem.className = 'group rounded-md border bg-card p-2 shadow-sm transition-colors hover:bg-accent';

      const subscribeUrl = `${baseUrl}/app/subscriptions?subscribe=${encodeURIComponent(feed.url)}`;

      feedItem.innerHTML = `
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-xs text-card-foreground mb-0.5 truncate">${escapeHtml(feed.title)}</div>
            <div class="text-[10px] text-muted-foreground truncate">${escapeHtml(feed.url)}</div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <span class="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-inset ring-primary/20">${escapeHtml(feed.type)}</span>
            <button
              class="subscribe-btn inline-flex items-center justify-center rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-feed-url="${escapeHtml(subscribeUrl)}"
              title="Subscribe in Tuvix"
            >
              Subscribe
            </button>
          </div>
        </div>
      `;

      // Add click handler for subscribe button
      const subscribeBtn = feedItem.querySelector('.subscribe-btn') as HTMLButtonElement;
      if (subscribeBtn) {
        subscribeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();

          // Visual feedback
          const originalText = subscribeBtn.textContent;
          subscribeBtn.textContent = '✓ Opening...';
          subscribeBtn.disabled = true;

          await browser.tabs.create({ url: subscribeUrl });

          // Reset after a moment
          setTimeout(() => {
            subscribeBtn.textContent = originalText;
            subscribeBtn.disabled = false;
          }, 1000);
        });
      }

      feedsList.appendChild(feedItem);
    });
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function performDiscovery(forceRefresh: boolean = false) {
    hideError();
    setStatus('searching', forceRefresh ? 'Refreshing feeds...' : 'Searching for feeds...');
    discoverBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;
    feedsList.innerHTML = '';

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url) {
        throw new Error('No active tab found');
      }

      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        throw new Error('Can only discover feeds on web pages');
      }

      currentUrl = tab.url;

      const response = await browser.runtime.sendMessage({
        action: 'discoverFeeds',
        url: tab.url,
        forceRefresh
      }) as DiscoveryResponse;

      if (!response.success) {
        throw new Error(response.error || 'Discovery failed');
      }

      const feeds = response.feeds || [];
      isFromCache = response.fromCache || false;

      if (feeds.length > 0) {
        const cacheIndicator = isFromCache ? ' (cached)' : '';
        setStatus('found', `Found ${feeds.length} feed${feeds.length === 1 ? '' : 's'}${cacheIndicator}`);
      } else {
        setStatus('none', 'No feeds found');
      }

      renderFeeds(feeds);

      // Show refresh button if results are from cache
      if (refreshBtn && isFromCache) {
        refreshBtn.classList.remove('hidden');
        refreshBtn.classList.add('inline-flex');
      }
    } catch (error) {
      setStatus('none', 'Discovery failed');
      showError(error instanceof Error ? error.message : 'Unknown error occurred');
      console.error('Feed discovery error:', error);
    } finally {
      discoverBtn.disabled = false;
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  discoverBtn.addEventListener('click', () => performDiscovery(false));

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => performDiscovery(true));
  }

  // Settings button - opens options page (will create later)
  settingsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage().catch(() => {
      // If no options page yet, show alert with info
      alert('Settings coming soon!\n\nDefault Tuvix URL: https://feed.tuvix.app\n\nYou will be able to configure a custom Tuvix instance URL here.');
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Enter key - trigger discovery if button is enabled
    if (e.key === 'Enter' && !discoverBtn.disabled) {
      e.preventDefault();
      performDiscovery(false);
    }
    // 'r' key - refresh if button is visible
    if (e.key === 'r' && refreshBtn && !refreshBtn.classList.contains('hidden') && !refreshBtn.disabled) {
      e.preventDefault();
      performDiscovery(true);
    }
  });

  // Auto-load cached feeds on popup open (background script handles discovery)
  (async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        currentUrl = tab.url;

        // Wait a brief moment for background script to complete if it's still discovering
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await browser.runtime.sendMessage({
          action: 'checkCache',
          url: tab.url
        }) as DiscoveryResponse;

        if (response.success && response.cached && response.feeds) {
          isFromCache = true;
          const feeds = response.feeds;
          if (feeds.length > 0) {
            setStatus('found', `Found ${feeds.length} feed${feeds.length === 1 ? '' : 's'} (cached)`);
            renderFeeds(feeds);
            if (refreshBtn) {
              refreshBtn.classList.remove('hidden');
              refreshBtn.classList.add('inline-flex');
            }
          } else {
            setStatus('none', 'No feeds found (cached)');
          }
        } else {
          // Background script is still discovering or hasn't started yet
          setStatus('searching', 'Discovering feeds...');

          // Poll for cache updates
          let attempts = 0;
          const maxAttempts = 30; // 30 seconds max
          const pollInterval = setInterval(async () => {
            attempts++;
            const pollResponse = await browser.runtime.sendMessage({
              action: 'checkCache',
              url: tab.url
            }) as DiscoveryResponse;

            if (pollResponse.success && pollResponse.cached) {
              clearInterval(pollInterval);
              isFromCache = true;
              const feeds = pollResponse.feeds || [];

              if (feeds.length > 0) {
                setStatus('found', `Found ${feeds.length} feed${feeds.length === 1 ? '' : 's'} (cached)`);
                renderFeeds(feeds);
                if (refreshBtn) {
                  refreshBtn.classList.remove('hidden');
                  refreshBtn.classList.add('inline-flex');
                }
              } else {
                setStatus('none', 'No feeds found');
              }
            } else if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setStatus('none', 'Discovery timeout');
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error checking cache on load:', error);
    }
  })();
});
