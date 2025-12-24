/**
 * Tests for notification preference logic
 * 
 * These tests verify the notification preference storage and logic
 * that is used by the frontend notification system.
 */

import { describe, it, expect } from "vitest";

// Notification preference interface (mirrors frontend)
interface NotificationPreference {
  enabled: boolean;
  syncComplete: boolean;
  offlineWarning: boolean;
  lastAsked: number | null;
}

const DEFAULT_PREFERENCE: NotificationPreference = {
  enabled: false,
  syncComplete: true,
  offlineWarning: true,
  lastAsked: null,
};

/**
 * Parse stored preference with defaults
 */
function parsePreference(stored: string | null): NotificationPreference {
  if (!stored) return DEFAULT_PREFERENCE;
  try {
    return { ...DEFAULT_PREFERENCE, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/**
 * Check if sync notification should be sent
 */
function shouldSendSyncNotification(
  preference: NotificationPreference,
  permissionGranted: boolean
): boolean {
  return preference.enabled && preference.syncComplete && permissionGranted;
}

/**
 * Check if offline warning should be sent
 */
function shouldSendOfflineNotification(
  preference: NotificationPreference,
  permissionGranted: boolean
): boolean {
  return preference.enabled && preference.offlineWarning && permissionGranted;
}

describe("Notification Preference Parsing", () => {
  it("should return defaults when stored value is null", () => {
    const result = parsePreference(null);
    expect(result).toEqual(DEFAULT_PREFERENCE);
  });

  it("should return defaults when stored value is invalid JSON", () => {
    const result = parsePreference("invalid json");
    expect(result).toEqual(DEFAULT_PREFERENCE);
  });

  it("should merge stored values with defaults", () => {
    const stored = JSON.stringify({ enabled: true });
    const result = parsePreference(stored);
    
    expect(result.enabled).toBe(true);
    expect(result.syncComplete).toBe(true); // default
    expect(result.offlineWarning).toBe(true); // default
    expect(result.lastAsked).toBeNull(); // default
  });

  it("should parse complete preference object", () => {
    const preference: NotificationPreference = {
      enabled: true,
      syncComplete: false,
      offlineWarning: true,
      lastAsked: 1703433600000,
    };
    const stored = JSON.stringify(preference);
    const result = parsePreference(stored);
    
    expect(result).toEqual(preference);
  });
});

describe("Sync Notification Logic", () => {
  it("should send notification when enabled and permission granted", () => {
    const preference: NotificationPreference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: Date.now(),
    };
    
    expect(shouldSendSyncNotification(preference, true)).toBe(true);
  });

  it("should not send notification when disabled", () => {
    const preference: NotificationPreference = {
      enabled: false,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: null,
    };
    
    expect(shouldSendSyncNotification(preference, true)).toBe(false);
  });

  it("should not send notification when syncComplete is false", () => {
    const preference: NotificationPreference = {
      enabled: true,
      syncComplete: false,
      offlineWarning: true,
      lastAsked: Date.now(),
    };
    
    expect(shouldSendSyncNotification(preference, true)).toBe(false);
  });

  it("should not send notification when permission not granted", () => {
    const preference: NotificationPreference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: Date.now(),
    };
    
    expect(shouldSendSyncNotification(preference, false)).toBe(false);
  });
});

describe("Offline Warning Logic", () => {
  it("should send warning when enabled and permission granted", () => {
    const preference: NotificationPreference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: Date.now(),
    };
    
    expect(shouldSendOfflineNotification(preference, true)).toBe(true);
  });

  it("should not send warning when disabled", () => {
    const preference: NotificationPreference = {
      enabled: false,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: null,
    };
    
    expect(shouldSendOfflineNotification(preference, true)).toBe(false);
  });

  it("should not send warning when offlineWarning is false", () => {
    const preference: NotificationPreference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: false,
      lastAsked: Date.now(),
    };
    
    expect(shouldSendOfflineNotification(preference, true)).toBe(false);
  });

  it("should not send warning when permission not granted", () => {
    const preference: NotificationPreference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: Date.now(),
    };
    
    expect(shouldSendOfflineNotification(preference, false)).toBe(false);
  });
});

describe("Default Preference Values", () => {
  it("should have notifications disabled by default", () => {
    expect(DEFAULT_PREFERENCE.enabled).toBe(false);
  });

  it("should have syncComplete enabled by default", () => {
    expect(DEFAULT_PREFERENCE.syncComplete).toBe(true);
  });

  it("should have offlineWarning enabled by default", () => {
    expect(DEFAULT_PREFERENCE.offlineWarning).toBe(true);
  });

  it("should have lastAsked as null by default", () => {
    expect(DEFAULT_PREFERENCE.lastAsked).toBeNull();
  });
});
