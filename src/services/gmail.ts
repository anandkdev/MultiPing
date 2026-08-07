/// <reference types="chrome" />
import type { Account, NotificationItem } from '../types';

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    headers?: GmailMessageHeader[];
  };
  internalDate?: string;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  resultSizeEstimate?: number;
}

/**
 * Helper to extract header value by name from Gmail payload headers
 */
function getHeaderValue(headers: GmailMessageHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const match = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return match ? match.value : '';
}

/**
 * Fetches unread primary emails for a given connected Google account
 * @param account Connected account containing access token
 * @param maxResults Maximum number of unread emails to retrieve (default 10)
 */
export async function fetchUnreadGmail(
  account: Account,
  maxResults: number = 10
): Promise<NotificationItem[]> {
  if (!account.accessToken) {
    throw new Error(`No access token available for account ${account.email}`);
  }

  // 1. Query unread messages from Gmail API
  const query = encodeURIComponent('is:unread category:primary');
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`;

  const listResponse = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
  });

  if (!listResponse.ok) {
    if (listResponse.status === 401) {
      throw new Error(`UNAUTHORIZED:${account.id}`);
    }
    throw new Error(`Gmail API error: ${listResponse.statusText}`);
  }

  const listData: GmailListResponse = await listResponse.json();

  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // 2. Fetch full message details in parallel for each message ID
  const detailPromises = listData.messages.map(async (msg) => {
    const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
    const detailRes = await fetch(detailUrl, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
    });

    if (!detailRes.ok) return null;
    const detailData: GmailMessageDetail = await detailRes.json();
    return detailData;
  });

  const details = (await Promise.all(detailPromises)).filter(
    (d): d is GmailMessageDetail => d !== null
  );

  // 3. Map Gmail message payload to OmniPulse NotificationItem structure
  return details.map((msg) => {
    const headers = msg.payload?.headers;
    const subject = getHeaderValue(headers, 'Subject') || '(No Subject)';
    const rawFrom = getHeaderValue(headers, 'From') || 'Unknown Sender';
    
    // Clean up sender string (e.g. "John Doe <john@example.com>" -> "John Doe")
    const senderName = rawFrom.replace(/<.*>/, '').trim() || rawFrom;

    const timestamp = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();

    return {
      id: `gmail-${msg.id}`,
      accountId: account.id,
      accountEmail: account.email,
      provider: 'google',
      category: 'email',
      title: subject,
      snippet: msg.snippet || '',
      senderOrOrganizer: senderName,
      timestamp,
      isUnread: true,
      deepLink: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
    };
  });
}