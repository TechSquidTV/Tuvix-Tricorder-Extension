import browser from 'webextension-polyfill';

export type SubscribeAction = 'tuvix' | 'feed-reader' | 'raw-url';

export interface Config {
  baseUrl: string;
  cacheTtlDays?: number;
  subscribeAction?: SubscribeAction;
}

const DEFAULT_CONFIG: Config = {
  baseUrl: 'https://feed.tuvix.app',
  cacheTtlDays: 90,
  subscribeAction: 'tuvix',
};

const CONFIG_KEY = 'tuvix_config';

export async function getConfig(): Promise<Config> {
  try {
    const result = await browser.storage.local.get(CONFIG_KEY);
    return {
      ...DEFAULT_CONFIG,
      ...(result[CONFIG_KEY] || {}),
    };
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

export async function setConfig(config: Partial<Config>): Promise<void> {
  try {
    const currentConfig = await getConfig();
    const newConfig = { ...currentConfig, ...config };
    await browser.storage.local.set({ [CONFIG_KEY]: newConfig });
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

export async function getBaseUrl(): Promise<string> {
  const config = await getConfig();
  return config.baseUrl;
}

export async function getCacheTtl(): Promise<number> {
  const config = await getConfig();
  const days = config.cacheTtlDays ?? 90;
  return days * 24 * 60 * 60 * 1000; // Convert to milliseconds
}
