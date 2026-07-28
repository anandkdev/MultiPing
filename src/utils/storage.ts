/// <reference types="chrome" />
import type { StorageSchema } from '../types';

// Default initial state for a fresh extension installation
export const DEFAULT_STORAGE: StorageSchema = {
  accounts: [],
  items: [],
  unreadCounts: {
    total: 0,
    emails: 0,
    meetings: 0,
    teamsMsgs: 0,
  },
  preferences: {
    refreshIntervalMinutes: 5,
    enableDesktopNotifications: true,
    soundEnabled: false,
    filterByCategory: 'all',
  },
  lastUpdated: Date.now(),
};

/**
 * Retrieves the complete application state from chrome.storage.local
 */
export const getStorage = (): Promise<StorageSchema> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      if (!result || Object.keys(result).length === 0) {
        // Initialize with default state if empty
        chrome.storage.local.set(DEFAULT_STORAGE, () => {
          resolve(DEFAULT_STORAGE);
        });
      } else {
        resolve({
          ...DEFAULT_STORAGE,
          ...result,
        });
      }
    });
  });
};

/**
 * Saves specific fields or the full object back to chrome.storage.local
 */
export const setStorage = (data: Partial<StorageSchema>): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ ...data, lastUpdated: Date.now() }, () => {
      resolve();
    });
  });
};

/**
 * Mutates storage state using a functional updater function
 */
export const updateStorage = async (
  updater: (prev: StorageSchema) => StorageSchema
): Promise<StorageSchema> => {
  const current = await getStorage();
  const updated = updater(current);
  await setStorage(updated);
  return updated;
};

/**
 * Clears stored extension data and resets back to defaults
 */
export const clearStorage = (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      chrome.storage.local.set(DEFAULT_STORAGE, () => {
        resolve();
      });
    });
  });
};