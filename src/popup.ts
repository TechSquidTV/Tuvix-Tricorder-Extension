import type { DiscoveredFeed } from '@tuvixrss/tricorder';
import browser from 'webextension-polyfill';
import { ToggleSwitch } from './components/ToggleSwitch';
import { getConfig } from './config';
import { createDiscoveryError, type ErrorType } from './types';
import { groupFeedsByUrl } from './utils/feedGrouping';

interface DiscoveryResponse {
  success: boolean;
  feeds?: DiscoveredFeed[];
  fromCache?: boolean;
  cached?: boolean;
  error?: string;
  errorType?: ErrorType;
  suggestion?: string;
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

  let isFromCache = false;

  function setStatus(state: 'none' | 'searching' | 'found', text: string) {
    statusIcon.classList.remove(
      'bg-muted-foreground',
      'bg-yellow-500',
      'bg-green-500',
      'animate-pulse-subtle'
    );

    if (state === 'searching') {
      statusIcon.classList.add('bg-yellow-500', 'animate-pulse-subtle');
    } else if (state === 'found') {
      statusIcon.classList.add('bg-green-500');
    } else {
      statusIcon.classList.add('bg-muted-foreground');
    }

    statusText.textContent = text;
  }

  function showError(message: string, suggestion?: string) {
    if (suggestion) {
      // Inline format: "Error message. Suggestion here."
      errorEl.textContent = `${message}. ${suggestion}`;
    } else {
      errorEl.textContent = message;
    }
    errorEl.classList.remove('hidden');
  }

  function hideError() {
    errorEl.classList.add('hidden');
  }

  async function renderFeeds(feeds: DiscoveredFeed[]) {
    feedsList.replaceChildren();

    if (feeds.length === 0) {
      const emptyContainer = document.createElement('div');
      emptyContainer.className = 'text-center py-6 space-y-1';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'text-xs font-medium text-card-foreground';
      titleDiv.textContent = 'No feeds found';

      const subtitleDiv = document.createElement('div');
      subtitleDiv.className = 'text-[10px] text-muted-foreground';
      subtitleDiv.textContent = "This page doesn't have any RSS or Atom feeds";

      emptyContainer.appendChild(titleDiv);
      emptyContainer.appendChild(subtitleDiv);
      feedsList.appendChild(emptyContainer);
      return;
    }

    // Group feeds by normalized URL to detect duplicates
    const feedGroups = groupFeedsByUrl(feeds);

    const config = await getConfig();
    const baseUrl = config.baseUrl;
    const subscribeAction = config.subscribeAction || 'tuvix';

    // Add help text when multiple feed groups are found
    if (feedGroups.length > 1) {
      const helpContainer = document.createElement('div');
      helpContainer.className =
        'px-2 py-1 mb-1 text-[10px] text-muted-foreground bg-accent/30 rounded';
      helpContainer.textContent = 'Select a feed to follow.';
      feedsList.appendChild(helpContainer);
    }

    feedGroups.forEach((group) => {
      // Default to Atom if available, otherwise RSS
      const hasBoth = group.atom && group.rss;
      let activeFeed = group.atom || group.rss;
      if (!activeFeed) return;

      const feedItem = document.createElement('li');
      feedItem.className =
        'group rounded-md border bg-card p-2 shadow-sm transition-colors hover:bg-accent';
      feedItem.setAttribute('aria-label', `${activeFeed.title} - ${activeFeed.type} feed`);

      // Determine subscribe URL based on action
      let subscribeUrl: string;
      if (subscribeAction === 'tuvix') {
        subscribeUrl = `${baseUrl}/app/subscriptions?subscribe=${encodeURIComponent(activeFeed.url)}`;
      } else if (subscribeAction === 'feed-reader') {
        // Replace http(s):// with feed:// for feed reader protocol
        subscribeUrl = activeFeed.url.replace(/^https?:\/\//, 'feed://');
      } else {
        // raw-url
        subscribeUrl = activeFeed.url;
      }

      // Build feed item structure
      const badgeClass =
        'inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-inset ring-primary/20';

      // Create feed item DOM structure
      const flexContainer = document.createElement('div');
      flexContainer.className = 'flex items-start gap-2';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'flex-1 min-w-0';

      const titleEl = document.createElement('div');
      titleEl.className = 'font-medium text-xs text-card-foreground mb-0.5 truncate feed-title';
      titleEl.textContent = activeFeed.title;
      titleEl.title = activeFeed.url;

      const urlContainer = document.createElement('div');
      urlContainer.className = 'flex items-center gap-1';

      const urlEl = document.createElement('div');
      urlEl.className = 'text-[10px] text-muted-foreground truncate feed-url';
      urlEl.textContent = activeFeed.url;
      urlEl.title = activeFeed.url;

      const copyBtn = document.createElement('button');
      copyBtn.className =
        'copy-btn shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors';
      copyBtn.setAttribute('aria-label', 'Copy feed URL');
      copyBtn.title = 'Copy URL';
      copyBtn.innerHTML = `<svg class="copy-icon w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><svg class="check-icon w-3 h-3 hidden text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const urlToCopy = urlEl.textContent || '';
        await navigator.clipboard.writeText(urlToCopy);

        // Update aria-label to announce copy success
        copyBtn.setAttribute('aria-label', 'Copied!');

        // Show checkmark
        const copyIcon = copyBtn.querySelector('.copy-icon');
        const checkIcon = copyBtn.querySelector('.check-icon');
        if (copyIcon && checkIcon) {
          copyIcon.classList.add('hidden');
          checkIcon.classList.remove('hidden');
          checkIcon.classList.add('animate-fade-in');

          // Reset after delay
          setTimeout(() => {
            checkIcon.classList.add('animate-fade-out');
            setTimeout(() => {
              checkIcon.classList.add('hidden');
              checkIcon.classList.remove('animate-fade-in', 'animate-fade-out');
              copyIcon.classList.remove('hidden');
              copyBtn.setAttribute('aria-label', 'Copy feed URL');
            }, 200);
          }, 1500);
        }
      });

      urlContainer.appendChild(urlEl);
      urlContainer.appendChild(copyBtn);

      contentDiv.appendChild(titleEl);
      contentDiv.appendChild(urlContainer);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex items-center gap-1 shrink-0';

      const formatDisplayEl = document.createElement('div');
      formatDisplayEl.className = 'format-display';

      const subscribeBtn = document.createElement('button');
      subscribeBtn.className =
        'subscribe-btn inline-flex items-center justify-center rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
      subscribeBtn.setAttribute('aria-label', `Subscribe to ${activeFeed.title} feed`);
      subscribeBtn.setAttribute('data-feed-url', subscribeUrl);
      subscribeBtn.title = 'Subscribe in Tuvix';
      subscribeBtn.textContent = 'Subscribe';

      actionsDiv.appendChild(formatDisplayEl);
      actionsDiv.appendChild(subscribeBtn);

      flexContainer.appendChild(contentDiv);
      flexContainer.appendChild(actionsDiv);
      feedItem.appendChild(flexContainer);

      // Add toggle or badge based on available formats
      if (hasBoth && group.atom && group.rss) {
        const atomFeed = group.atom;
        const rssFeed = group.rss;
        const toggleSwitch = new ToggleSwitch({
          checked: true, // Default to Atom (right side)
          ariaLabel: 'Toggle between RSS and Atom formats',
          leftLabel: 'RSS',
          rightLabel: 'Atom',
          leftLabelClass: badgeClass,
          rightLabelClass: badgeClass,
          onChange: (checked) => {
            activeFeed = checked ? atomFeed : rssFeed;

            // Update subscribe URL based on action
            if (subscribeAction === 'tuvix') {
              subscribeUrl = `${baseUrl}/app/subscriptions?subscribe=${encodeURIComponent(activeFeed.url)}`;
            } else if (subscribeAction === 'feed-reader') {
              // Replace http(s):// with feed:// for feed reader protocol
              subscribeUrl = activeFeed.url.replace(/^https?:\/\//, 'feed://');
            } else {
              // raw-url
              subscribeUrl = activeFeed.url;
            }

            titleEl.textContent = activeFeed.title;
            titleEl.title = activeFeed.url;
            urlEl.textContent = activeFeed.url;
            urlEl.title = activeFeed.url;
            subscribeBtn.setAttribute('data-feed-url', subscribeUrl);
          },
        });

        formatDisplayEl.appendChild(toggleSwitch.element);
      } else {
        // Show simple badge if only one format
        const badge = document.createElement('span');
        badge.className = badgeClass;
        badge.textContent = activeFeed.type;
        formatDisplayEl.appendChild(badge);
      }

      // Add click handler for subscribe button
      if (subscribeBtn) {
        subscribeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();

          // Visual feedback
          const originalText = subscribeBtn.textContent;
          const originalAriaLabel = subscribeBtn.getAttribute('aria-label');
          subscribeBtn.textContent = '✓ Opening...';
          subscribeBtn.setAttribute('aria-label', 'Opening subscription page');
          subscribeBtn.setAttribute('aria-busy', 'true');
          subscribeBtn.disabled = true;

          const url = subscribeBtn.getAttribute('data-feed-url') || subscribeUrl;
          await browser.tabs.create({ url });

          // Reset after a moment
          setTimeout(() => {
            subscribeBtn.textContent = originalText;
            subscribeBtn.setAttribute('aria-label', originalAriaLabel || '');
            subscribeBtn.removeAttribute('aria-busy');
            subscribeBtn.disabled = false;
          }, 1000);
        });
      }

      feedsList.appendChild(feedItem);
    });
  }

  async function performDiscovery(forceRefresh: boolean = false) {
    hideError();
    setStatus('searching', forceRefresh ? 'Refreshing feeds...' : 'Searching for feeds...');
    discoverBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;
    feedsList.replaceChildren();

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url) {
        throw new Error('No active tab found');
      }

      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        throw new Error('Can only discover feeds on web pages');
      }

      const response = (await browser.runtime.sendMessage({
        action: 'discoverFeeds',
        url: tab.url,
        tabId: tab.id,
        forceRefresh,
      })) as DiscoveryResponse;

      if (!response.success) {
        throw Object.assign(new Error(response.error || 'Discovery failed'), {
          error: response.error,
          errorType: response.errorType,
          suggestion: response.suggestion,
        });
      }

      const feeds = response.feeds || [];
      isFromCache = response.fromCache || false;

      if (feeds.length > 0) {
        const cacheIndicator = isFromCache ? ' (cached)' : '';
        setStatus(
          'found',
          `Found ${feeds.length} feed${feeds.length === 1 ? '' : 's'}${cacheIndicator}`
        );
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

      // Check if it's a response with error info
      if (typeof error === 'object' && error !== null && 'error' in error) {
        const errorResponse = error as { error?: string; suggestion?: string };
        showError(errorResponse.error || 'Unknown error', errorResponse.suggestion);
      } else {
        const discoveryError = createDiscoveryError(error);
        showError(discoveryError.message, discoveryError.suggestion);
      }

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

  // Settings button - opens options page
  settingsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Enter key - trigger discovery if button is enabled
    if (e.key === 'Enter' && !discoverBtn.disabled) {
      e.preventDefault();
      performDiscovery(false);
    }
    // 'r' key - refresh if button is visible
    if (
      e.key === 'r' &&
      refreshBtn &&
      !refreshBtn.classList.contains('hidden') &&
      !refreshBtn.disabled
    ) {
      e.preventDefault();
      performDiscovery(true);
    }
  });

  // Auto-load cached feeds on popup open (background script handles discovery)
  (async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        // Wait a brief moment for background script to complete if it's still discovering
        await new Promise((resolve) => setTimeout(resolve, 100));

        const response = (await browser.runtime.sendMessage({
          action: 'checkCache',
          url: tab.url,
        })) as DiscoveryResponse;

        if (response.success && response.cached && response.feeds) {
          isFromCache = true;
          const feeds = response.feeds;
          if (feeds.length > 0) {
            setStatus(
              'found',
              `Found ${feeds.length} feed${feeds.length === 1 ? '' : 's'} (cached)`
            );
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
            const pollResponse = (await browser.runtime.sendMessage({
              action: 'checkCache',
              url: tab.url,
            })) as DiscoveryResponse;

            if (pollResponse.success && pollResponse.cached) {
              clearInterval(pollInterval);
              isFromCache = true;
              const feeds = pollResponse.feeds || [];

              if (feeds.length > 0) {
                setStatus(
                  'found',
                  `Found ${feeds.length} feed${feeds.length === 1 ? '' : 's'} (cached)`
                );
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
