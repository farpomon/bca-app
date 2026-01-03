/**
 * useServiceWorker Hook
 * 
 * Manages Service Worker registration, updates, and communication.
 * Provides background sync capabilities and push notification support.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

export interface ServiceWorkerActions {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
  requestBackgroundSync: (tag: string) => Promise<boolean>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  getCacheSize: () => Promise<number>;
  clearCache: (cacheName?: string) => Promise<void>;
}

export function useServiceWorker(): ServiceWorkerState & ServiceWorkerActions {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: "serviceWorker" in navigator,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
    error: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  /**
   * Handle Service Worker messages
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    const { type, result, timestamp } = event.data;

    switch (type) {
      case "SYNC_START":
        console.log("[ServiceWorker] Sync started at", new Date(timestamp));
        toast.info("Background sync started...");
        break;

      case "SYNC_COMPLETE":
        console.log("[ServiceWorker] Sync completed:", result);
        if (result.failed > 0) {
          toast.warning(`Sync completed: ${result.synced} synced, ${result.failed} failed`);
        } else {
          toast.success(`Sync completed: ${result.synced} items synced`);
        }
        break;

      case "CHECK_PENDING_DATA":
        console.log("[ServiceWorker] Checking pending data...");
        // Trigger sync check in the main app
        window.dispatchEvent(new CustomEvent("sw-check-pending"));
        break;

      default:
        console.log("[ServiceWorker] Unknown message:", event.data);
    }
  }, []);

  /**
   * Register Service Worker
   */
  const register = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: "Service Workers not supported" }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      registrationRef.current = registration;

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, isUpdateAvailable: true }));
              toast.info("A new version is available! Click to update.", {
                action: {
                  label: "Update",
                  onClick: () => skipWaiting(),
                },
                duration: 10000,
              });
            }
          });
        }
      });

      // Listen for messages
      navigator.serviceWorker.addEventListener("message", handleMessage);

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[ServiceWorker] Controller changed, reloading...");
        window.location.reload();
      });

      setState(prev => ({
        ...prev,
        isRegistered: true,
        registration,
        error: null,
      }));

      console.log("[ServiceWorker] Registered successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error("[ServiceWorker] Registration failed:", error);
    }
  }, [state.isSupported, handleMessage]);

  /**
   * Unregister Service Worker
   */
  const unregister = useCallback(async () => {
    if (registrationRef.current) {
      await registrationRef.current.unregister();
      registrationRef.current = null;
      setState(prev => ({
        ...prev,
        isRegistered: false,
        registration: null,
      }));
      console.log("[ServiceWorker] Unregistered");
    }
  }, []);

  /**
   * Check for updates
   */
  const update = useCallback(async () => {
    if (registrationRef.current) {
      await registrationRef.current.update();
      console.log("[ServiceWorker] Update check triggered");
    }
  }, []);

  /**
   * Skip waiting and activate new Service Worker
   */
  const skipWaiting = useCallback(() => {
    if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  /**
   * Request background sync
   */
  const requestBackgroundSync = useCallback(async (tag: string): Promise<boolean> => {
    if (!registrationRef.current) {
      console.warn("[ServiceWorker] Not registered");
      return false;
    }

    try {
      // Check if Background Sync is supported
      if ("sync" in registrationRef.current) {
        await (registrationRef.current as any).sync.register(tag);
        console.log("[ServiceWorker] Background sync registered:", tag);
        return true;
      } else {
        console.warn("[ServiceWorker] Background Sync not supported");
        return false;
      }
    } catch (error) {
      console.error("[ServiceWorker] Background sync registration failed:", error);
      return false;
    }
  }, []);

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
      return "denied";
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  /**
   * Get cache size
   */
  const getCacheSize = useCallback(async (): Promise<number> => {
    if (!navigator.serviceWorker.controller) {
      return 0;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.size || 0);
      };

      navigator.serviceWorker.controller!.postMessage(
        { type: "GET_CACHE_SIZE" },
        [channel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => resolve(0), 5000);
    });
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(async (cacheName?: string): Promise<void> => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CLEAR_CACHE",
        payload: { cacheName },
      });
    }
  }, []);

  /**
   * Auto-register on mount
   */
  useEffect(() => {
    if (state.isSupported && !state.isRegistered) {
      register();
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [state.isSupported, state.isRegistered, register, handleMessage]);

  /**
   * Check for existing registration on mount
   */
  useEffect(() => {
    if (state.isSupported) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registrationRef.current = registration;
          setState(prev => ({
            ...prev,
            isRegistered: true,
            registration,
          }));
        }
      });
    }
  }, [state.isSupported]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
    requestBackgroundSync,
    requestNotificationPermission,
    getCacheSize,
    clearCache,
  };
}

/**
 * Hook for listening to Service Worker events
 */
export function useServiceWorkerEvents(
  onSyncStart?: () => void,
  onSyncComplete?: (result: { synced: number; failed: number }) => void,
  onCheckPending?: () => void
) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, result } = event.data;

      switch (type) {
        case "SYNC_START":
          onSyncStart?.();
          break;
        case "SYNC_COMPLETE":
          onSyncComplete?.(result);
          break;
        case "CHECK_PENDING_DATA":
          onCheckPending?.();
          break;
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [onSyncStart, onSyncComplete, onCheckPending]);
}

/**
 * Notify Service Worker of sync completion
 */
export function notifyServiceWorkerSyncComplete(result: { synced: number; failed: number }) {
  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    controller.postMessage({
      type: "SYNC_COMPLETE",
      payload: result,
    });
  }
}
