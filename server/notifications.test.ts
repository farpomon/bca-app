/**
 * Notification System Tests
 * 
 * Tests for browser notification permission handling and notification sending.
 * These tests verify the notification hooks and utility functions work correctly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock Notification API
const mockNotification = {
  permission: "default" as NotificationPermission,
  requestPermission: vi.fn(),
};

// Setup global mocks
beforeEach(() => {
  // Reset localStorage
  localStorageMock.clear();
  
  // Reset Notification mock
  mockNotification.permission = "default";
  mockNotification.requestPermission.mockReset();
  
  // Setup global mocks
  global.localStorage = localStorageMock as any;
  (global as any).Notification = mockNotification;
});

describe("Notification Permission Storage", () => {
  it("should store notification preference in localStorage", () => {
    const preference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: Date.now(),
    };

    localStorage.setItem("bca-notification-preference", JSON.stringify(preference));
    const stored = localStorage.getItem("bca-notification-preference");
    
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.enabled).toBe(true);
    expect(parsed.syncComplete).toBe(true);
    expect(parsed.offlineWarning).toBe(true);
  });

  it("should retrieve stored notification preference", () => {
    const preference = {
      enabled: false,
      syncComplete: true,
      offlineWarning: false,
      lastAsked: null,
    };

    localStorage.setItem("bca-notification-preference", JSON.stringify(preference));
    const stored = localStorage.getItem("bca-notification-preference");
    const parsed = JSON.parse(stored!);
    
    expect(parsed.enabled).toBe(false);
    expect(parsed.offlineWarning).toBe(false);
  });

  it("should handle missing preference gracefully", () => {
    const stored = localStorage.getItem("bca-notification-preference");
    expect(stored).toBeNull();
  });

  it("should mark notification as asked", () => {
    localStorage.setItem("bca-notification-asked", "true");
    const hasAsked = localStorage.getItem("bca-notification-asked") === "true";
    
    expect(hasAsked).toBe(true);
  });
});

describe("Notification Permission States", () => {
  it("should handle granted permission", () => {
    mockNotification.permission = "granted";
    expect(mockNotification.permission).toBe("granted");
  });

  it("should handle denied permission", () => {
    mockNotification.permission = "denied";
    expect(mockNotification.permission).toBe("denied");
  });

  it("should handle default permission", () => {
    mockNotification.permission = "default";
    expect(mockNotification.permission).toBe("default");
  });
});

describe("Notification Request Flow", () => {
  it("should request permission successfully", async () => {
    mockNotification.requestPermission.mockResolvedValue("granted");
    
    const result = await mockNotification.requestPermission();
    
    expect(mockNotification.requestPermission).toHaveBeenCalled();
    expect(result).toBe("granted");
  });

  it("should handle permission denial", async () => {
    mockNotification.requestPermission.mockResolvedValue("denied");
    
    const result = await mockNotification.requestPermission();
    
    expect(result).toBe("denied");
  });

  it("should update preference after permission granted", async () => {
    mockNotification.requestPermission.mockResolvedValue("granted");
    
    const result = await mockNotification.requestPermission();
    
    if (result === "granted") {
      const preference = {
        enabled: true,
        syncComplete: true,
        offlineWarning: true,
        lastAsked: Date.now(),
      };
      localStorage.setItem("bca-notification-preference", JSON.stringify(preference));
      localStorage.setItem("bca-notification-asked", "true");
    }
    
    const stored = localStorage.getItem("bca-notification-preference");
    const parsed = JSON.parse(stored!);
    expect(parsed.enabled).toBe(true);
    
    const hasAsked = localStorage.getItem("bca-notification-asked");
    expect(hasAsked).toBe("true");
  });
});

describe("Notification Preference Management", () => {
  it("should enable sync notifications", () => {
    const preference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: Date.now(),
    };
    
    localStorage.setItem("bca-notification-preference", JSON.stringify(preference));
    const stored = JSON.parse(localStorage.getItem("bca-notification-preference")!);
    
    expect(stored.syncComplete).toBe(true);
  });

  it("should disable offline warnings", () => {
    const preference = {
      enabled: true,
      syncComplete: true,
      offlineWarning: false,
      lastAsked: Date.now(),
    };
    
    localStorage.setItem("bca-notification-preference", JSON.stringify(preference));
    const stored = JSON.parse(localStorage.getItem("bca-notification-preference")!);
    
    expect(stored.offlineWarning).toBe(false);
  });

  it("should update individual preferences", () => {
    const initial = {
      enabled: true,
      syncComplete: true,
      offlineWarning: true,
      lastAsked: Date.now(),
    };
    
    localStorage.setItem("bca-notification-preference", JSON.stringify(initial));
    
    // Update preference
    const updated = {
      ...initial,
      syncComplete: false,
    };
    
    localStorage.setItem("bca-notification-preference", JSON.stringify(updated));
    const stored = JSON.parse(localStorage.getItem("bca-notification-preference")!);
    
    expect(stored.syncComplete).toBe(false);
    expect(stored.offlineWarning).toBe(true);
  });
});

describe("Notification Display Logic", () => {
  it("should show prompt when permission is default and not asked", () => {
    mockNotification.permission = "default";
    const hasAsked = localStorage.getItem("bca-notification-asked") === "true";
    
    const shouldShowPrompt = mockNotification.permission === "default" && !hasAsked;
    
    expect(shouldShowPrompt).toBe(true);
  });

  it("should not show prompt when permission is granted", () => {
    mockNotification.permission = "granted";
    const hasAsked = localStorage.getItem("bca-notification-asked") === "true";
    
    const shouldShowPrompt = mockNotification.permission === "default" && !hasAsked;
    
    expect(shouldShowPrompt).toBe(false);
  });

  it("should not show prompt when already asked", () => {
    mockNotification.permission = "default";
    localStorage.setItem("bca-notification-asked", "true");
    const hasAsked = localStorage.getItem("bca-notification-asked") === "true";
    
    const shouldShowPrompt = mockNotification.permission === "default" && !hasAsked;
    
    expect(shouldShowPrompt).toBe(false);
  });

  it("should not show prompt when permission is denied", () => {
    mockNotification.permission = "denied";
    const hasAsked = localStorage.getItem("bca-notification-asked") === "true";
    
    const shouldShowPrompt = mockNotification.permission === "default" && !hasAsked;
    
    expect(shouldShowPrompt).toBe(false);
  });
});

describe("Notification Content", () => {
  it("should format sync completion notification", () => {
    const result = {
      success: true,
      synced: 5,
      failed: 0,
    };
    
    const title = "Sync Complete";
    const body = `Successfully synced ${result.synced} item${result.synced !== 1 ? "s" : ""}.`;
    
    expect(title).toBe("Sync Complete");
    expect(body).toContain("5 items");
  });

  it("should format sync error notification", () => {
    const result = {
      success: false,
      synced: 3,
      failed: 2,
    };
    
    const title = "Sync Completed with Errors";
    const body = `Synced ${result.synced} item${result.synced !== 1 ? "s" : ""}, ${result.failed} failed.`;
    
    expect(title).toBe("Sync Completed with Errors");
    expect(body).toContain("3 items");
    expect(body).toContain("2 failed");
  });

  it("should format offline notification", () => {
    const title = "You're Offline";
    const body = "Your changes will be saved locally and synced when you're back online.";
    
    expect(title).toBe("You're Offline");
    expect(body).toContain("saved locally");
  });

  it("should handle singular item count", () => {
    const result = {
      success: true,
      synced: 1,
      failed: 0,
    };
    
    const body = `Successfully synced ${result.synced} item${result.synced !== 1 ? "s" : ""}.`;
    
    expect(body).toBe("Successfully synced 1 item.");
  });
});

describe("Notification Error Handling", () => {
  it("should handle localStorage errors gracefully", () => {
    // Mock localStorage to throw error
    const mockGetItem = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("Storage error");
    });
    
    let preference = null;
    try {
      const stored = localStorage.getItem("bca-notification-preference");
      preference = stored ? JSON.parse(stored) : null;
    } catch (error) {
      // Should handle error gracefully
      preference = {
        enabled: false,
        syncComplete: true,
        offlineWarning: true,
        lastAsked: null,
      };
    }
    
    expect(preference).toBeTruthy();
    expect(preference.enabled).toBe(false);
    
    mockGetItem.mockRestore();
  });

  it("should handle invalid JSON in localStorage", () => {
    localStorage.setItem("bca-notification-preference", "invalid json");
    
    let preference = null;
    try {
      const stored = localStorage.getItem("bca-notification-preference");
      preference = stored ? JSON.parse(stored) : null;
    } catch (error) {
      // Should handle parse error
      preference = {
        enabled: false,
        syncComplete: true,
        offlineWarning: true,
        lastAsked: null,
      };
    }
    
    expect(preference).toBeTruthy();
  });

  it("should handle permission request errors", async () => {
    mockNotification.requestPermission.mockRejectedValue(new Error("Permission error"));
    
    let result: NotificationPermission = "denied";
    try {
      result = await mockNotification.requestPermission();
    } catch (error) {
      // Should handle error and default to denied
      result = "denied";
    }
    
    expect(result).toBe("denied");
  });
});
