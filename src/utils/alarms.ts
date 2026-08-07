/// <reference types="chrome" />

export const POLLING_ALARM_NAME = 'multi-ping-sync-alarm';

/**
 * Schedules or updates the periodic background sync alarm.
 * @param intervalMinutes Frequency of background polling in minutes (defaults to 5)
 */
export async function setupPollingAlarm(intervalMinutes: number = 5): Promise<void> {
  // Clear existing alarm to avoid duplicate triggers
  await chrome.alarms.clear(POLLING_ALARM_NAME);

  // Chrome enforces a minimum 1-minute period for alarms in production
  const periodInMinutes = Math.max(1, intervalMinutes);

  chrome.alarms.create(POLLING_ALARM_NAME, {
    periodInMinutes,
  });

  console.log(`[MultiPing Alarm] Scheduled polling every ${periodInMinutes} minute(s).`);
}

/**
 * Clears the background polling alarm
 */
export async function clearPollingAlarm(): Promise<void> {
  await chrome.alarms.clear(POLLING_ALARM_NAME);
  console.log('[MultiPing Alarm] Polling alarm stopped.');
}