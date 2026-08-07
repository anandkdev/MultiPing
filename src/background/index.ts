/// <reference types="chrome" />
import { getStorage, updateStorage } from '../utils/storage';
import { openOrFocusTab } from '../utils/tabs';
import { setupPollingAlarm, POLLING_ALARM_NAME } from '../utils/alarms';
import { authenticateGoogle } from '../services/auth';
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

// Immediate Top-Level Initialization
async function initBackground(): Promise<void> {
  try {
    const currentStorage = await getStorage();
    updateExtensionBadge(currentStorage.unreadCounts.total);
    await setupPollingAlarm(currentStorage.preferences.refreshIntervalMinutes);
  } catch (err) {
    console.error('Failed to initialize background worker state:', err);
  }
}

// Execute background setup on service worker boot
initBackground();

// Event listeners for extension install and browser startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`MultiPing extension event: ${details.reason}`);
  await initBackground();
});

chrome.runtime.onStartup.addListener(async () => {
  await initBackground();
});

// Periodic Alarm Listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === POLLING_ALARM_NAME) {
    console.log('[MultiPing Alarm] Triggered background sync job...');
  }
});

// Real-time Badge Listener
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.unreadCounts) {
    const newValue = changes.unreadCounts.newValue as StorageSchema['unreadCounts'] | undefined;
    const newTotal = newValue?.total ?? 0;
    updateExtensionBadge(newTotal);
  }
});

// Handle Notification Clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const currentStorage = await getStorage();
  const clickedItem = currentStorage.items.find((item) => item.id === notificationId);

  if (clickedItem?.deepLink) {
    await openOrFocusTab(clickedItem.deepLink);
  }

  chrome.notifications.clear(notificationId);
});

// Central Message Router
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
    return true;
  }
);

// Message Action Handler Logic
async function handleAction(action: ExtensionAction): Promise<unknown> {
  switch (action.type) {
    case 'GET_STATE':
      return await getStorage();

    case 'ADD_ACCOUNT': {
      if (action.payload.provider === 'google') {
        const newAccount = await authenticateGoogle();
        const updatedStorage = await updateStorage((prev) => {
          // Avoid duplicate accounts by replacing existing entry if ID matches
          const filtered = prev.accounts.filter((acc) => acc.id !== newAccount.id);
          return {
            ...prev,
            accounts: [...filtered, newAccount],
          };
        });
        return updatedStorage;
      }
      throw new Error(`Provider ${action.payload.provider} not yet supported.`);
    }

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
      console.log('Background account polling triggered manually...');
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