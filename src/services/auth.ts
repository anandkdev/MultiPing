/// <reference types="chrome" />
import type { Account } from '../types';

// OAuth Client ID & Scope Configurations
export const OAUTH_CONFIG = {
  google: {
    clientId: '1029228965565-mrrajl9e7k7s2l9df2t7n9rigo2mqfi3.apps.googleusercontent.com', // Google Cloud Console Client ID
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
 */
export function getRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}

/**
 * Interface representing the Google UserInfo response
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Launches WebAuthFlow to authenticate a Google Account and fetches user profile details
 */
export async function authenticateGoogle(): Promise<Account> {
  const redirectUri = getRedirectUri();
  const { clientId, scopes, authUrl } = OAUTH_CONFIG.google;

  if (!clientId || clientId.startsWith('YOUR_GOOGLE')) {
    throw new Error('Google Client ID is missing. Please set it in src/services/auth.ts');
  }

  // Build OAuth authorization URL
  const authParams = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    prompt: 'select_account',
  });

  const fullAuthUrl = `${authUrl}?${authParams.toString()}`;

  // 1. Launch Chrome interactive authentication popup
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

  // 2. Extract access token and expiration from response URL hash fragment
  const urlHash = new URL(redirectUrl).hash.substring(1);
  const params = new URLSearchParams(urlHash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (!accessToken) {
    throw new Error('Failed to retrieve access token from Google response.');
  }

  const expiresAt = Date.now() + (expiresIn ? parseInt(expiresIn, 10) * 1000 : 3600 * 1000);

  // 3. Fetch user profile information using the access token
  const userProfileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userProfileResponse.ok) {
    throw new Error('Failed to fetch user profile details from Google API.');
  }

  const profile: GoogleUserInfo = await userProfileResponse.json();

  // 4. Return formatted Account object
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