// Provider and Account Types
export type AccountProvider = 'google' | 'microsoft';

export type AccountStatus = 'connected' | 'syncing' | 'expired' | 'error';

export interface Account {
  id: string; // Unique hash or email
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: AccountProvider;
  status: AccountStatus;
  lastSyncedAt: number; // Timestamp (ms)
  // Store OAuth token references securely
  accessToken?: string;
  expiresAt?: number; // Token expiration timestamp
}

// Aggregated Item Categories
export type ItemCategory = 'email' | 'meeting' | 'teams_msg';

export interface NotificationItem {
  id: string;
  accountId: string; // References Account.id
  accountEmail: string;
  provider: AccountProvider;
  category: ItemCategory;
  title: string; // Email Subject / Meeting Title / Sender Name
  snippet: string; // Email preview / Message text / Meeting location
  senderOrOrganizer: string;
  timestamp: number; // Creation or start time
  isUnread: boolean;
  deepLink: string; // Direct link to Gmail thread, Teams chat, or Calendar event
}

// Extension Settings & Preferences
export interface UserPreferences {
  refreshIntervalMinutes: number; // e.g., 5 minutes
  enableDesktopNotifications: boolean;
  soundEnabled: boolean;
  filterByCategory: 'all' | ItemCategory;
}

// Global Application State stored in chrome.storage.local
export interface StorageSchema {
  accounts: Account[];
  items: NotificationItem[];
  unreadCounts: {
    total: number;
    emails: number;
    meetings: number;
    teamsMsgs: number;
  };
  preferences: UserPreferences;
  lastUpdated: number;
}

// Message passing structure between Popup and Background Service Worker
export type ExtensionAction =
  | { type: 'SYNC_ACCOUNTS' }
  | { type: 'ADD_ACCOUNT'; payload: { provider: AccountProvider } }
  | { type: 'REMOVE_ACCOUNT'; payload: { accountId: string } }
  | { type: 'MARK_ITEM_READ'; payload: { itemId: string } }
  | { type: 'GET_STATE' };

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}