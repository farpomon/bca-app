/**
 * useNotificationPermission Hook
 * 
 * Manages browser push notification permissions.
 * Handles permission requests, storage of user preferences, and notification sending.
 */

import { useState, useEffect, useCallback } from "react";

const NOTIFICATION_PREF_KEY = "bca-notification-preference";
const NOTIFICATION_ASKED_KEY = "bca-notification-asked";

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export interface NotificationPreference {
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
 * Check if notifications are supported
 */
function isNotificationSupported(): boolean {
  return "Notification" in window;
}

/**
 * Get stored notification preference
 */
function getStoredPreference(): NotificationPreference {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREF_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCE, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to read notification preference:", error);
  }
  return DEFAULT_PREFERENCE;
}

/**
 * Store notification preference
 */
function storePreference(preference: NotificationPreference): void {
  try {
    localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(preference));
  } catch (error) {
    console.error("Failed to store notification preference:", error);
  }
}

/**
 * Check if we've already asked for permission
 */
function hasAskedBefore(): boolean {
  return localStorage.getItem(NOTIFICATION_ASKED_KEY) === "true";
}

/**
 * Mark that we've asked for permission
 */
function markAsAsked(): void {
  localStorage.setItem(NOTIFICATION_ASKED_KEY, "true");
}

export interface UseNotificationPermissionReturn {
  permission: NotificationPermissionState;
  preference: NotificationPreference;
  isSupported: boolean;
  hasAsked: boolean;
  shouldShowPrompt: boolean;
  requestPermission: () => Promise<NotificationPermissionState>;
  updatePreference: (updates: Partial<NotificationPreference>) => void;
  sendNotification: (title: string, options?: NotificationOptions) => void;
  dismissPrompt: () => void;
}

/**
 * Hook for managing notification permissions
 */
export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [permission, setPermission] = useState<NotificationPermissionState>(() => {
    if (!isNotificationSupported()) return "unsupported";
    return Notification.permission as NotificationPermissionState;
  });
  
  const [preference, setPreference] = useState<NotificationPreference>(getStoredPreference);
  const [hasAsked, setHasAsked] = useState(hasAskedBefore);
  const isSupported = isNotificationSupported();

  // Determine if we should show the permission prompt
  const shouldShowPrompt = 
    isSupported && 
    permission === "default" && 
    !hasAsked;

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!isSupported) {
      return "unsupported";
    }

    try {
      const result = await Notification.requestPermission();
      const newPermission = result as NotificationPermissionState;
      setPermission(newPermission);
      markAsAsked();
      setHasAsked(true);

      // Update preference based on result
      const newPreference: NotificationPreference = {
        ...preference,
        enabled: newPermission === "granted",
        lastAsked: Date.now(),
      };
      setPreference(newPreference);
      storePreference(newPreference);

      return newPermission;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      markAsAsked();
      setHasAsked(true);
      return "denied";
    }
  }, [isSupported, preference]);

  /**
   * Update notification preferences
   */
  const updatePreference = useCallback((updates: Partial<NotificationPreference>) => {
    setPreference(prev => {
      const newPreference = { ...prev, ...updates };
      storePreference(newPreference);
      return newPreference;
    });
  }, []);

  /**
   * Send a notification
   */
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted" || !preference.enabled) {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }, [isSupported, permission, preference.enabled]);

  /**
   * Dismiss the permission prompt without asking
   */
  const dismissPrompt = useCallback(() => {
    markAsAsked();
    setHasAsked(true);
  }, []);

  // Listen for permission changes
  useEffect(() => {
    if (!isSupported) return;

    // Check permission periodically (in case user changes it in browser settings)
    const checkPermission = () => {
      const currentPermission = Notification.permission as NotificationPermissionState;
      if (currentPermission !== permission) {
        setPermission(currentPermission);
        
        // Update preference if permission was revoked
        if (currentPermission === "denied" && preference.enabled) {
          updatePreference({ enabled: false });
        }
      }
    };

    const interval = setInterval(checkPermission, 10000);
    return () => clearInterval(interval);
  }, [isSupported, permission, preference.enabled, updatePreference]);

  return {
    permission,
    preference,
    isSupported,
    hasAsked,
    shouldShowPrompt,
    requestPermission,
    updatePreference,
    sendNotification,
    dismissPrompt,
  };
}

/**
 * Send sync completion notification
 */
export function sendSyncNotification(
  sendNotification: (title: string, options?: NotificationOptions) => void,
  preference: NotificationPreference,
  result: { success: boolean; synced: number; failed: number }
): void {
  if (!preference.syncComplete) return;

  if (result.success) {
    sendNotification("Sync Complete", {
      body: `Successfully synced ${result.synced} item${result.synced !== 1 ? "s" : ""}.`,
      tag: "sync-complete",
    });
  } else {
    sendNotification("Sync Completed with Errors", {
      body: `Synced ${result.synced} item${result.synced !== 1 ? "s" : ""}, ${result.failed} failed.`,
      tag: "sync-complete",
    });
  }
}

/**
 * Send offline warning notification
 */
export function sendOfflineNotification(
  sendNotification: (title: string, options?: NotificationOptions) => void,
  preference: NotificationPreference
): void {
  if (!preference.offlineWarning) return;

  sendNotification("You're Offline", {
    body: "Your changes will be saved locally and synced when you're back online.",
    tag: "offline-warning",
  });
}
