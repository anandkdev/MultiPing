/// <reference types="chrome" />
import { useState, useEffect, useCallback } from 'react';
import { getStorage, setStorage, DEFAULT_STORAGE } from '../utils/storage';
import type { StorageSchema } from '../types';

export interface UseStorageReturn {
  storage: StorageSchema;
  loading: boolean;
  updateState: (updater: (prev: StorageSchema) => StorageSchema) => Promise<void>;
  refreshState: () => Promise<void>;
}

export function useStorage(): UseStorageReturn {
  const [storage, setStorageState] = useState<StorageSchema>(DEFAULT_STORAGE);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial storage data from chrome.storage.local
  const refreshState = useCallback(async () => {
    try {
      const data = await getStorage();
      setStorageState(data);
    } catch (err) {
      console.error('Failed to load storage in useStorage hook:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();

    // Event listener for real-time storage updates from the Background Worker
    const handleStorageChange = (
      _changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local') {
        refreshState();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [refreshState]);

  // Helper method to mutate storage from React components
  const updateState = useCallback(
    async (updater: (prev: StorageSchema) => StorageSchema) => {
      setStorageState((prev) => {
        const next = updater(prev);
        setStorage(next); // Persist to disk asynchronously
        return next;
      });
    },
    []
  );

  return { storage, loading, updateState, refreshState };
}