/// <reference types="chrome" />

// OAuth Client ID & Scope Configurations (Keys will be populated in Phase 2)
export const OAUTH_CONFIG = {
  google: {
    clientId: '', // Google Cloud Console Client ID
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  },
  microsoft: {
    clientId: '', // Azure AD Application Client ID
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ],
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  },
};

/**
 * Generates Chrome's native extension redirect URI for OAuth authentication flows.
 * Example format: https://<extension-id>.chromiumapp.org/
 */
export function getRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}