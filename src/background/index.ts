/// <reference types="chrome" />
import { getStorage, updateStorage } from '../utils/storage';
import type { ExtensionAction, ExtensionResponse, StorageSchema } from '../types';

console.log('MultiPing Background Service Worker initializing...');

// Synchronize Chrome badge counter based on total unread count
export function updateExtensionBadge(count: number): void {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count > 99 ? '99+' : count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' }); // Indigo badge
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Initialize storage & badge counter on extension installation or browser startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`MultiPing extension event: ${details.reason}`);
  const currentStorage = await getStorage();
  updateExtensionBadge(currentStorage.unreadCounts.total);
});

// Real-time Badge Listener: Sync icon badge whenever unread count updates in storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.unreadCounts) {
    const newValue = changes.unreadCounts.newValue as StorageSchema['unreadCounts'] | undefined;
    const newTotal = newValue?.total ?? 0;
    updateExtensionBadge(newTotal);
  }
});

// Central Message Router for communications from Popup / Content Scripts
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionAction,
    _sender,
    sendResponse: (response: ExtensionResponse<unknown>) => void
  ) => {
    handleAction(message)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) =>
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Action execution failed',
        })
      );
    return true; // Keep asynchronous response channel open
  }
);

// Message Action Handler Logic
async function handleAction(action: ExtensionAction): Promise<unknown> {
  switch (action.type) {
    case 'GET_STATE':
      return await getStorage();

    case 'MARK_ITEM_READ': {
      const updatedStorage = await updateStorage((prev) => {
        const items = prev.items.map((item) =>
          item.id === action.payload.itemId ? { ...item, isUnread: false } : item
        );
        const emails = items.filter((i) => i.category === 'email' && i.isUnread).length;
        const meetings = items.filter((i) => i.category === 'meeting' && i.isUnread).length;
        const teamsMsgs = items.filter((i) => i.category === 'teams_msg' && i.isUnread).length;

        return {
          ...prev,
          items,
          unreadCounts: {
            total: emails + meetings + teamsMsgs,
            emails,
            meetings,
            teamsMsgs,
          },
        };
      });
      return updatedStorage;
    }

    case 'SYNC_ACCOUNTS':
      console.log('Background account polling triggered...');
      return await getStorage();

    case 'REMOVE_ACCOUNT': {
      const updatedStorage = await updateStorage((prev) => {
        const accounts = prev.accounts.filter((acc) => acc.id !== action.payload.accountId);
        const items = prev.items.filter((item) => item.accountId !== action.payload.accountId);
        const emails = items.filter((i) => i.category === 'email' && i.isUnread).length;
        const meetings = items.filter((i) => i.category === 'meeting' && i.isUnread).length;
        const teamsMsgs = items.filter((i) => i.category === 'teams_msg' && i.isUnread).length;

        return {
          ...prev,
          accounts,
          items,
          unreadCounts: {
            total: emails + meetings + teamsMsgs,
            emails,
            meetings,
            teamsMsgs,
          },
        };
      });
      return updatedStorage;
    }

    default:
      throw new Error('Unknown extension action type');
  }
}