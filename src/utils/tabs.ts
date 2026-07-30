/// <reference types="chrome" />

/**
 * Extracts a match pattern URL domain from a deep link URL
 * Example: "https://mail.google.com/mail/u/0/#inbox/123" -> "https://mail.google.com/*"
 */
export function getDomainMatchPattern(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/*`;
  } catch {
    return url;
  }
}

/**
 * Smart Navigation Helper:
 * Checks if a tab matching the target domain is already open in Chrome.
 * - If FOUND: Focuses the existing window/tab and updates its URL to the target deep link.
 * - If NOT FOUND: Creates a new tab with the target deep link.
 */
export async function openOrFocusTab(targetUrl: string): Promise<chrome.tabs.Tab> {
  const matchPattern = getDomainMatchPattern(targetUrl);

  return new Promise((resolve) => {
    chrome.tabs.query({ url: matchPattern }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].id !== undefined) {
        const existingTab = tabs[0];
        const tabId = existingTab.id;

        // 1. Focus tab and update URL to exact deep link location
        chrome.tabs.update(tabId, { url: targetUrl, active: true }, (updatedTab) => {
          // 2. Bring the parent Chrome window to the front
          if (existingTab.windowId !== undefined) {
            chrome.windows.update(existingTab.windowId, { focused: true });
          }
          resolve(updatedTab || existingTab);
        });
      } else {
        // 3. No existing tab matched -> create a new tab
        chrome.tabs.create({ url: targetUrl }, (newTab) => {
          resolve(newTab);
        });
      }
    });
  });
}