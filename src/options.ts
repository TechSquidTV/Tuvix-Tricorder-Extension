import browser from 'webextension-polyfill';
import { getConfig, setConfig } from './config';
import { clearCache, getCacheStats } from './cache';

const DEFAULT_BASE_URL = 'https://feed.tuvix.app';

document.addEventListener('DOMContentLoaded', async () => {
  const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
  const currentUrlSpan = document.getElementById('currentUrl') as HTMLSpanElement;
  const successAlert = document.getElementById('successAlert') as HTMLDivElement;
  const successMessage = document.getElementById('successMessage') as HTMLSpanElement;
  const errorAlert = document.getElementById('errorAlert') as HTMLDivElement;
  const errorMessage = document.getElementById('errorMessage') as HTMLSpanElement;
  const cacheTtlSelect = document.getElementById('cacheTtl') as HTMLSelectElement;
  const clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement;
  const cacheStatsDiv = document.getElementById('cacheStats') as HTMLDivElement;

  if (!baseUrlInput || !saveBtn || !resetBtn || !currentUrlSpan || !successAlert || !errorAlert) {
    console.error('Required elements not found');
    return;
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
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  // Show success message
  function showSuccess(message: string) {
    hideError();
    successMessage.textContent = message;
    successAlert.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      successAlert.classList.add('hidden');
    }, 3000);
  }

  // Show error message
  function showError(message: string) {
    hideSuccess();
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
  }

  // Hide success message
  function hideSuccess() {
    successAlert.classList.add('hidden');
  }

  // Hide error message
  function hideError() {
    errorAlert.classList.add('hidden');
  }

  // Save settings
  async function saveSettings() {
    hideError();
    hideSuccess();

    const urlValue = baseUrlInput.value;
    const validation = validateUrl(urlValue);

    if (!validation.valid) {
      showError(validation.error || 'Invalid URL');
      baseUrlInput.focus();
      baseUrlInput.setAttribute('aria-invalid', 'true');
      return;
    }

    // Reset aria-invalid on successful validation
    baseUrlInput.setAttribute('aria-invalid', 'false');

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      await setConfig({
        baseUrl: validation.normalized!,
        cacheTtlDays: parseInt(cacheTtlSelect.value, 10),
      });

      // Update current URL display
      currentUrlSpan.textContent = validation.normalized!;

      showSuccess('Settings saved successfully!');
      baseUrlInput.value = validation.normalized!;
    } catch (error) {
      showError('Failed to save settings. Please try again.');
      console.error('Error saving config:', error);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  }

  // Reset to default
  async function resetToDefault() {
    hideError();
    hideSuccess();

    try {
      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting...';

      await setConfig({ baseUrl: DEFAULT_BASE_URL });
      baseUrlInput.value = DEFAULT_BASE_URL;
      currentUrlSpan.textContent = DEFAULT_BASE_URL;

      showSuccess('Settings reset to default');
    } catch (error) {
      showError('Failed to reset settings. Please try again.');
      console.error('Error resetting config:', error);
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = 'Reset to Default';
    }
  }

  // Event listeners
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetToDefault);

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

      showSuccess('Cache cleared successfully');
    } catch (error) {
      showError('Failed to clear cache');
      console.error('Error clearing cache:', error);
    } finally {
      clearCacheBtn.disabled = false;
      clearCacheBtn.textContent = 'Clear Cache';
    }
  });

  // Save on Enter key in input
  baseUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSettings();
    }
  });

  // Load initial config
  await loadConfig();
});
