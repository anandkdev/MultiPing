/// <reference types="chrome" />
import type { NotificationItem } from '../types';

/**
 * Triggers a native system desktop notification for a new unread item
 */
export function sendDesktopNotification(item: NotificationItem): void {
  // Use item ID as the notification ID so we can map click events
  const notificationId = item.id;

  const categoryLabel =
    item.category === 'email'
      ? '✉️ New Email'
      : item.category === 'meeting'
      ? '📅 Upcoming Meeting'
      : '💬 Teams Message';

  chrome.notifications.create(
    notificationId,
    {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('vite.svg'), // Uses standard asset URL
      title: `${categoryLabel} - ${item.senderOrOrganizer}`,
      message: `${item.title}\n${item.snippet}`,
      priority: 2, // High priority desktop pop-up
    },
    (createdId) => {
      if (chrome.runtime.lastError) {
        console.error('Notification creation failed:', chrome.runtime.lastError.message);
      } else {
        console.log(`System notification displayed: ${createdId}`);
      }
    }
  );
}