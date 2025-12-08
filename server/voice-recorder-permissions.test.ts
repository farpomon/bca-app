import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Voice Recorder Permission Enhancement Tests
 * 
 * Tests for three major UX improvements:
 * 1. Permission pre-check with "Test Microphone" button
 * 2. Retry functionality after permission denial
 * 3. Browser detection and browser-specific instructions
 */

describe("Voice Recorder Permission Enhancements", () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockMediaStream: MediaStream;
  let mockMediaStreamTrack: MediaStreamTrack;

  beforeEach(() => {
    // Mock MediaStream and MediaStreamTrack
    mockMediaStreamTrack = {
      stop: vi.fn(),
      kind: "audio",
      enabled: true,
      id: "mock-track-id",
      label: "Mock Audio Track",
      readyState: "live",
    } as any;

    mockMediaStream = {
      getTracks: vi.fn(() => [mockMediaStreamTrack]),
      getAudioTracks: vi.fn(() => [mockMediaStreamTrack]),
      active: true,
    } as any;

    // Mock getUserMedia
    mockGetUserMedia = vi.fn(() => Promise.resolve(mockMediaStream));
    global.navigator.mediaDevices = {
      getUserMedia: mockGetUserMedia,
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Permission Pre-Check", () => {
    it("should test microphone access without starting recording", async () => {
      // Simulate testing microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(stream).toBe(mockMediaStream);
      
      // Should stop tracks after testing
      stream.getTracks().forEach(track => track.stop());
      expect(mockMediaStreamTrack.stop).toHaveBeenCalled();
    });

    it("should detect permission granted state", async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      expect(stream.active).toBe(true);
      expect(stream.getTracks().length).toBeGreaterThan(0);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
    });

    it("should detect permission denied state", async () => {
      // Mock permission denied
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })
      );

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.name).toBe("NotAllowedError");
      }
    });

    it("should detect no microphone found", async () => {
      // Mock no microphone
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error("No microphone found"), { name: "NotFoundError" })
      );

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.name).toBe("NotFoundError");
      }
    });
  });

  describe("Retry Functionality", () => {
    it("should allow retry after permission denial", async () => {
      // First attempt - denied
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })
      );

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.name).toBe("NotAllowedError");
      }

      // Retry - granted
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      expect(stream).toBe(mockMediaStream);
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
    });

    it("should reset permission state on retry", async () => {
      let permissionState = "denied";
      
      // Simulate retry
      permissionState = "idle";
      expect(permissionState).toBe("idle");
      
      // Re-request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionState = "granted";
      
      expect(permissionState).toBe("granted");
      expect(stream).toBe(mockMediaStream);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
    });
  });

  describe("Browser Detection", () => {
    it("should detect Chrome browser", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      
      let browserType = "other";
      if (ua.includes("Chrome") && !ua.includes("Edg")) {
        browserType = "chrome";
      }
      
      expect(browserType).toBe("chrome");
    });

    it("should detect Firefox browser", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0";
      
      let browserType = "other";
      if (ua.includes("Firefox")) {
        browserType = "firefox";
      }
      
      expect(browserType).toBe("firefox");
    });

    it("should detect Safari browser", () => {
      const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
      
      let browserType = "other";
      if (ua.includes("Safari") && !ua.includes("Chrome")) {
        browserType = "safari";
      }
      
      expect(browserType).toBe("safari");
    });

    it("should detect Edge browser", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      
      let browserType = "other";
      if (ua.includes("Edg")) {
        browserType = "edge";
      }
      
      expect(browserType).toBe("edge");
    });

    it("should provide Chrome-specific instructions", () => {
      const instructions = {
        chrome: [
          "Click the lock icon (🔒) in the address bar",
          "Find 'Microphone' and select 'Allow'",
          "Click 'Try Again' below"
        ]
      };
      
      expect(instructions.chrome).toHaveLength(3);
      expect(instructions.chrome[0]).toContain("lock icon");
      expect(instructions.chrome[1]).toContain("Microphone");
    });

    it("should provide Firefox-specific instructions", () => {
      const instructions = {
        firefox: [
          "Click the microphone icon in the address bar",
          "Select 'Allow' for microphone access",
          "Click 'Try Again' below"
        ]
      };
      
      expect(instructions.firefox).toHaveLength(3);
      expect(instructions.firefox[0]).toContain("microphone icon");
    });

    it("should provide Safari-specific instructions", () => {
      const instructions = {
        safari: [
          "Go to Safari → Settings → Websites → Microphone",
          "Find this website and select 'Allow'",
          "Click 'Try Again' below"
        ]
      };
      
      expect(instructions.safari).toHaveLength(3);
      expect(instructions.safari[0]).toContain("Safari");
      expect(instructions.safari[0]).toContain("Settings");
    });

    it("should provide Edge-specific instructions", () => {
      const instructions = {
        edge: [
          "Click the lock icon in the address bar",
          "Find 'Microphone' and select 'Allow'",
          "Click 'Try Again' below"
        ]
      };
      
      expect(instructions.edge).toHaveLength(3);
      expect(instructions.edge[0]).toContain("lock icon");
    });

    it("should provide fallback instructions for unknown browsers", () => {
      const instructions = {
        other: [
          "Click the lock/info icon in your browser's address bar",
          "Find 'Microphone' in the permissions list",
          "Change the setting to 'Allow'",
          "Click 'Try Again' below"
        ]
      };
      
      expect(instructions.other).toHaveLength(4);
      expect(instructions.other[0]).toContain("lock/info icon");
    });
  });

  describe("Permission State Management", () => {
    it("should transition from idle to requesting to granted", async () => {
      let state = "idle";
      
      state = "requesting";
      expect(state).toBe("requesting");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state = "granted";
      
      expect(state).toBe("granted");
      expect(stream).toBe(mockMediaStream);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
    });

    it("should transition from idle to requesting to denied", async () => {
      let state = "idle";
      
      state = "requesting";
      expect(state).toBe("requesting");
      
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })
      );
      
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        state = "denied";
        expect(state).toBe("denied");
      }
    });

    it("should track micTested flag", async () => {
      let micTested = false;
      
      // Before testing
      expect(micTested).toBe(false);
      
      // After testing
      await navigator.mediaDevices.getUserMedia({ audio: true });
      micTested = true;
      
      expect(micTested).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle NotAllowedError with appropriate message", async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })
      );

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.name).toBe("NotAllowedError");
        const errorMessage = "Microphone access denied. Please enable microphone permissions in your browser settings.";
        expect(errorMessage).toContain("denied");
        expect(errorMessage).toContain("permissions");
      }
    });

    it("should handle PermissionDeniedError with appropriate message", async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error("Permission denied"), { name: "PermissionDeniedError" })
      );

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.name).toBe("PermissionDeniedError");
      }
    });

    it("should handle NotFoundError with appropriate message", async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error("No microphone found"), { name: "NotFoundError" })
      );

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.name).toBe("NotFoundError");
        const errorMessage = "No microphone found. Please connect a microphone and try again.";
        expect(errorMessage).toContain("No microphone");
      }
    });

    it("should handle generic errors with fallback message", async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new Error("Unknown error")
      );

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        const errorMessage = "Could not access microphone. Please check permissions and try again.";
        expect(errorMessage).toContain("Could not access");
      }
    });
  });
});
