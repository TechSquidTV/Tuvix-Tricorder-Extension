import { clearCache, getCacheStats } from './cache';
import { getConfig, setConfig, type SubscribeAction } from './config';

const DEFAULT_BASE_URL = 'https://feed.tuvix.app';

document.addEventListener('DOMContentLoaded', async () => {
  const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
  const currentUrlSpan = document.getElementById('currentUrl') as HTMLSpanElement;
  const autoSaveIndicator = document.getElementById('autoSaveIndicator') as HTMLSpanElement;
  const errorAlert = document.getElementById('errorAlert') as HTMLDivElement;
  const errorMessage = document.getElementById('errorMessage') as HTMLSpanElement;
  const subscribeActionSelect = document.getElementById('subscribeAction') as HTMLSelectElement;
  const subscribeActionHelpText = document.getElementById(
    'subscribeActionHelpText'
  ) as HTMLSpanElement;
  const cacheTtlSelect = document.getElementById('cacheTtl') as HTMLSelectElement;
  const clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement;
  const cacheStatsDiv = document.getElementById('cacheStats') as HTMLDivElement;

  if (!baseUrlInput || !resetBtn || !currentUrlSpan || !errorAlert) {
    console.error('Required elements not found');
    return;
  }

  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Show auto-save indicator temporarily
  function showAutoSaveIndicator() {
    autoSaveIndicator.classList.remove('opacity-0');
    autoSaveIndicator.classList.add('opacity-100');

    setTimeout(() => {
      autoSaveIndicator.classList.remove('opacity-100');
      autoSaveIndicator.classList.add('opacity-0');
    }, 2000);
  }

  // Update subscribe action help text based on selection
  function updateSubscribeActionHelp() {
    const action = subscribeActionSelect.value;
    let helpText = '';

    switch (action) {
      case 'tuvix':
        helpText = 'Opens feeds in your Tuvix instance for subscribing and reading.';
        break;
      case 'feed-reader':
        helpText =
          'Requires a feed reader app installed on your system. You can install the Tuvix app (or other feed readers) and subscribe this way.';
        break;
      case 'raw-url':
        helpText = 'Opens the raw feed XML directly in your browser.';
        break;
    }

    subscribeActionHelpText.textContent = helpText;
  }

  // Update cache statistics display
  async function updateCacheStats() {
    try {
      const stats = await getCacheStats();
      if (stats.totalEntries === 0) {
        cacheStatsDiv.textContent = 'Cache is empty';
      } else {
        const oldestDate = stats.oldestEntry
          ? new Date(stats.oldestEntry).toLocaleDateString()
          : 'N/A';
        cacheStatsDiv.textContent = `${stats.totalEntries} cached site${stats.totalEntries === 1 ? '' : 's'}. Oldest: ${oldestDate}`;
      }
    } catch (error) {
      console.error('Error loading cache stats:', error);
      cacheStatsDiv.textContent = 'Unable to load cache stats';
    }
  }

  // Load current configuration
  async function loadConfig() {
    try {
      const config = await getConfig();
      baseUrlInput.value = config.baseUrl;
      currentUrlSpan.textContent = config.baseUrl;

      // Load subscribe action
      if (config.subscribeAction) {
        subscribeActionSelect.value = config.subscribeAction;
      }

      // Update help text for current selection
      updateSubscribeActionHelp();

      // Load cache TTL
      if (config.cacheTtlDays) {
        cacheTtlSelect.value = config.cacheTtlDays.toString();
      }

      // Load cache stats
      await updateCacheStats();
    } catch (error) {
      showError('Failed to load settings');
      console.error('Error loading config:', error);
    }
  }

  // Validate URL format
  function validateUrl(urlString: string): { valid: boolean; error?: string; normalized?: string } {
    if (!urlString || urlString.trim() === '') {
      return { valid: false, error: 'URL cannot be empty' };
    }

    const trimmed = urlString.trim();

    // Check if it has a protocol
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }

    // Try to parse the URL
    try {
      const url = new URL(trimmed);

      // Remove trailing slashes
      let normalized = url.origin + url.pathname;
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }

      // Add back search params if any
      if (url.search) {
        normalized += url.search;
      }

      // Validate hostname
      if (!url.hostname || url.hostname === '') {
        return { valid: false, error: 'Invalid hostname' };
      }

      return { valid: true, normalized };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  // Show error message
  function showError(message: string) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
  }

  // Hide error message
  function hideError() {
    errorAlert.classList.add('hidden');
  }

  // Auto-save settings with debounce
  async function autoSaveSettings() {
    hideError();

    const urlValue = baseUrlInput.value;
    const validation = validateUrl(urlValue);

    if (!validation.valid) {
      showError(validation.error || 'Invalid URL');
      baseUrlInput.setAttribute('aria-invalid', 'true');
      return;
    }

    // Reset aria-invalid on successful validation
    baseUrlInput.setAttribute('aria-invalid', 'false');

    try {
      const normalizedUrl = validation.normalized || '';

      await setConfig({
        baseUrl: normalizedUrl,
        subscribeAction: subscribeActionSelect.value as SubscribeAction,
        cacheTtlDays: parseInt(cacheTtlSelect.value, 10),
      });

      // Update current URL display
      currentUrlSpan.textContent = normalizedUrl;
      baseUrlInput.value = normalizedUrl;

      showAutoSaveIndicator();
    } catch (error) {
      showError('Failed to save settings. Please try again.');
      console.error('Error saving config:', error);
    }
  }

  // Debounced auto-save for input changes
  function debouncedAutoSave() {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
      autoSaveSettings();
    }, 500);
  }

  // Reset to default
  async function resetToDefault() {
    hideError();

    try {
      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting...';

      await setConfig({ baseUrl: DEFAULT_BASE_URL });
      baseUrlInput.value = DEFAULT_BASE_URL;
      currentUrlSpan.textContent = DEFAULT_BASE_URL;

      showAutoSaveIndicator();
    } catch (error) {
      showError('Failed to reset settings. Please try again.');
      console.error('Error resetting config:', error);
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = 'Reset to Default';
    }
  }

  // Event listeners
  resetBtn.addEventListener('click', resetToDefault);

  // Auto-save on input changes
  baseUrlInput.addEventListener('input', debouncedAutoSave);
  subscribeActionSelect.addEventListener('change', () => {
    updateSubscribeActionHelp();
    autoSaveSettings();
  });
  cacheTtlSelect.addEventListener('change', autoSaveSettings);

  // Clear cache button handler
  clearCacheBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all cached feed discoveries?')) {
      return;
    }

    try {
      clearCacheBtn.disabled = true;
      clearCacheBtn.textContent = 'Clearing...';

      await clearCache();
      await updateCacheStats();

      showAutoSaveIndicator();
    } catch (error) {
      showError('Failed to clear cache');
      console.error('Error clearing cache:', error);
    } finally {
      clearCacheBtn.disabled = false;
      clearCacheBtn.textContent = 'Clear Cache';
    }
  });

  // Load initial config
  await loadConfig();
});
