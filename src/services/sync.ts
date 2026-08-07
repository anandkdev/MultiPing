import { getStorage, updateStorage } from '../utils/storage';
import { syncGoogleAccount } from './google';
import { sendDesktopNotification } from '../utils/notifications';
import type { NotificationItem } from '../types';

/**
 * Core Sync Engine: Iterates through all connected accounts,
 * fetches the latest items, updates local storage, and fires desktop notifications.
 */
export async function runBackgroundSync(): Promise<void> {
  const currentStorage = await getStorage();
  const { accounts, items: existingItems } = currentStorage;

  if (accounts.length === 0) {
    console.log('[Sync Engine] No connected accounts to sync.');
    return;
  }

  const existingItemIds = new Set(existingItems.map((item) => item.id));
  const newFetchedItems: NotificationItem[] = [];

  for (const account of accounts) {
    if (account.provider === 'google') {
      try {
        const accountItems = await syncGoogleAccount(account);
        newFetchedItems.push(...accountItems);
      } catch (err) {
        console.error(`[Sync Engine] Failed to sync account ${account.email}:`, err);
      }
    }
    // Microsoft Graph API sync will be integrated here in Phase 3
  }

  // Detect brand new alerts that were not previously present in storage
  const brandNewItems = newFetchedItems.filter((item) => !existingItemIds.has(item.id));

  // Calculate unread category totals
  const emails = newFetchedItems.filter((i) => i.category === 'email' && i.isUnread).length;
  const meetings = newFetchedItems.filter((i) => i.category === 'meeting' && i.isUnread).length;
  const teamsMsgs = newFetchedItems.filter((i) => i.category === 'teams_msg' && i.isUnread).length;

  // Persist updated state to chrome.storage.local
  await updateStorage((prev) => ({
    ...prev,
    items: newFetchedItems,
    unreadCounts: {
      total: emails + meetings + teamsMsgs,
      emails,
      meetings,
      teamsMsgs,
    },
  }));

  // Trigger OS desktop notifications for newly discovered unread items
  for (const newItem of brandNewItems) {
    sendDesktopNotification(newItem);
  }

  console.log(
    `[Sync Engine] Sync complete. Total items: ${newFetchedItems.length}, New alerts: ${brandNewItems.length}`
  );
}