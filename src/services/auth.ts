/// <reference types="chrome" />
import type { Account } from '../types';

// OAuth Client ID & Scope Configurations
export const OAUTH_CONFIG = {
  google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  },
  microsoft: {
    clientId: 'YOUR_MICROSOFT_CLIENT_ID', // Configured in Task 21
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
 */
export function getRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}

/**
 * Interfaces representing Google & Microsoft UserInfo responses
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface MicrosoftUserInfo {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName?: string;
}

/**
 * Launches WebAuthFlow to authenticate a Google Account
 */
export async function authenticateGoogle(): Promise<Account> {
  const redirectUri = getRedirectUri();
  const { clientId, scopes, authUrl } = OAUTH_CONFIG.google;

  if (!clientId || clientId.startsWith('YOUR_GOOGLE')) {
    throw new Error('Google Client ID is missing. Please set it in src/services/auth.ts');
  }

  const authParams = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    prompt: 'select_account',
  });

  const fullAuthUrl = `${authUrl}?${authParams.toString()}`;

  const redirectUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: fullAuthUrl,
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          reject(
            new Error(
              chrome.runtime.lastError?.message || 'Authentication flow was canceled or failed.'
            )
          );
        } else {
          resolve(responseUrl);
        }
      }
    );
  });

  const urlHash = new URL(redirectUrl).hash.substring(1);
  const params = new URLSearchParams(urlHash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (!accessToken) {
    throw new Error('Failed to retrieve access token from Google response.');
  }

  const expiresAt = Date.now() + (expiresIn ? parseInt(expiresIn, 10) * 1000 : 3600 * 1000);

  const userProfileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userProfileResponse.ok) {
    throw new Error('Failed to fetch user profile details from Google API.');
  }

  const profile: GoogleUserInfo = await userProfileResponse.json();

  return {
    id: `google-${profile.id}`,
    email: profile.email,
    displayName: profile.name,
    avatarUrl: profile.picture,
    provider: 'google',
    status: 'connected',
    lastSyncedAt: Date.now(),
    accessToken,
    expiresAt,
  };
}

/**
 * Launches WebAuthFlow to authenticate a Microsoft Account via Azure AD / Microsoft Graph
 */
export async function authenticateMicrosoft(): Promise<Account> {
  const redirectUri = getRedirectUri();
  const { clientId, scopes, authUrl } = OAUTH_CONFIG.microsoft;

  if (!clientId || clientId.startsWith('YOUR_MICROSOFT')) {
    throw new Error('Microsoft Client ID is missing. Please set it in src/services/auth.ts');
  }

  const authParams = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    prompt: 'select_account',
  });

  const fullAuthUrl = `${authUrl}?${authParams.toString()}`;

  const redirectUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: fullAuthUrl,
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          reject(
            new Error(
              chrome.runtime.lastError?.message ||
                'Microsoft authentication flow failed or was canceled.'
            )
          );
        } else {
          resolve(responseUrl);
        }
      }
    );
  });

  const urlHash = new URL(redirectUrl).hash.substring(1);
  const params = new URLSearchParams(urlHash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (!accessToken) {
    throw new Error('Failed to retrieve access token from Microsoft response.');
  }

  const expiresAt = Date.now() + (expiresIn ? parseInt(expiresIn, 10) * 1000 : 3600 * 1000);

  // Fetch Microsoft user profile using Microsoft Graph API
  const userProfileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userProfileResponse.ok) {
    throw new Error('Failed to fetch user profile details from Microsoft Graph API.');
  }

  const profile: MicrosoftUserInfo = await userProfileResponse.json();
  const userEmail = profile.mail || profile.userPrincipalName || 'unknown@microsoft.com';

  return {
    id: `microsoft-${profile.id}`,
    email: userEmail,
    displayName: profile.displayName || userEmail,
    provider: 'microsoft',
    status: 'connected',
    lastSyncedAt: Date.now(),
    accessToken,
    expiresAt,
  };
}