/// <reference types="chrome" />
import type { Account, NotificationItem } from '../types';

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  organizer?: {
    displayName?: string;
    email?: string;
  };
  status?: string;
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEvent[];
}

/**
 * Fetches upcoming calendar events for a given connected Google account
 * @param account Connected account containing access token
 * @param maxResults Maximum number of upcoming events to retrieve (default 10)
 */
export async function fetchUpcomingGoogleEvents(
  account: Account,
  maxResults: number = 10
): Promise<NotificationItem[]> {
  if (!account.accessToken) {
    throw new Error(`No access token available for account ${account.email}`);
  }

  // 1. Set timeMin to current ISO timestamp to fetch only current & future events
  const nowISO = new Date().toISOString();
  const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    nowISO
  )}&singleEvents=true&orderBy=startTime&maxResults=${maxResults}`;

  const response = await fetch(calendarUrl, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(`UNAUTHORIZED:${account.id}`);
    }
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data: GoogleCalendarEventsResponse = await response.json();

  if (!data.items || data.items.length === 0) {
    return [];
  }

  // 2. Map Google Calendar events to OmniPulse NotificationItem structure
  return data.items
    .filter((event) => event.status !== 'cancelled')
    .map((event) => {
      const summary = event.summary || '(No Title)';
      const organizer =
        event.organizer?.displayName || event.organizer?.email || 'Google Calendar';

      // Parse start time (handles all-day 'date' vs timed 'dateTime')
      const startString = event.start?.dateTime || event.start?.date;
      const timestamp = startString ? new Date(startString).getTime() : Date.now();

      // Prioritize Google Meet link if present, falling back to calendar web event link
      const deepLink = event.hangoutLink || event.htmlLink || 'https://calendar.google.com';

      // Format clean preview snippet
      let snippet = event.description?.replace(/<[^>]*>?/gm, '').trim() || '';
      if (!snippet && event.hangoutLink) {
        snippet = 'Video call link attached';
      } else if (!snippet) {
        snippet = `Scheduled meeting starting at ${new Date(timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`;
      }

      return {
        id: `gcal-${event.id}`,
        accountId: account.id,
        accountEmail: account.email,
        provider: 'google',
        category: 'meeting',
        title: summary,
        snippet,
        senderOrOrganizer: organizer,
        timestamp,
        isUnread: true,
        deepLink,
      };
    });
}