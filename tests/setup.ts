import { vi } from 'vitest';

// Mock browser.storage.local
const storageData = new Map<string, unknown>();

const mockBrowser = {
  storage: {
    local: {
      get: vi.fn((key: string | string[] | null) => {
        if (key === null || key === undefined) {
          // Return all storage
          return Promise.resolve(Object.fromEntries(storageData));
        }
        if (Array.isArray(key)) {
          const result: Record<string, unknown> = {};
          key.forEach((k) => {
            const value = storageData.get(k);
            if (value !== undefined) {
              result[k] = value;
            }
          });
          return Promise.resolve(result);
        }
        // Single key
        const value = storageData.get(key as string);
        return Promise.resolve(value !== undefined ? { [key as string]: value } : {});
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.entries(items).forEach(([key, value]) => {
          storageData.set(key, value);
        });
        return Promise.resolve();
      }),
      remove: vi.fn((key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        keys.forEach((k) => storageData.delete(k));
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        storageData.clear();
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser,
}));

// Export for test access
export { storageData, mockBrowser };

// Reset storage before each test
beforeEach(() => {
  storageData.clear();
  vi.clearAllMocks();
});
