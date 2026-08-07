import type { Account, NotificationItem } from '../types';
import { fetchUnreadGmail } from './gmail';
import { fetchUpcomingGoogleEvents } from './calendar';

/**
 * Aggregates unread Gmail messages and upcoming Google Calendar events
 * for a single connected Google account using Promise.allSettled.
 */
export async function syncGoogleAccount(account: Account): Promise<NotificationItem[]> {
  if (account.provider !== 'google') return [];

  const results = await Promise.allSettled([
    fetchUnreadGmail(account),
    fetchUpcomingGoogleEvents(account),
  ]);

  const items: NotificationItem[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      console.error(`Error syncing Google service for ${account.email}:`, result.reason);
    }
  });

  return items;
}