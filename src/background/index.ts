/// <reference types="chrome" />
import { getStorage } from '../utils/storage';
import type { ExtensionAction, ExtensionResponse, StorageSchema } from '../types';

console.log('MultiPing Background Service Worker initializing...');

// Initialize storage when extension is installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`MultiPing extension event: ${details.reason}`);
  
  // Ensure default storage schema is initialized
  const currentStorage = await getStorage();
  console.log('Current extension storage state:', currentStorage);

  // Set initial badge text
  updateExtensionBadge(currentStorage.unreadCounts.total);
});

// Helper function to update the badge counter on the extension toolbar icon
export function updateExtensionBadge(count: number): void {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count > 99 ? '99+' : count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' }); // Indigo
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Handle message passing requests from the Popup React UI
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionAction,
    _sender,
    sendResponse: (response: ExtensionResponse<StorageSchema>) => void
  ) => {
    if (message.type === 'GET_STATE') {
      getStorage()
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) =>
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : 'Failed to fetch state',
          })
        );
      return true; // Keep message channel open for asynchronous sendResponse
    }
    return false;
  }
);