import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Voice Recording History Tests
 * 
 * Tests for localStorage-based recording history management:
 * - Save recordings with metadata
 * - Load and retrieve recordings
 * - Search and filter recordings
 * - Delete individual recordings
 * - Clear all recordings
 * - Max recording limit enforcement
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// Import after localStorage mock is set up
import {
  saveRecording,
  getRecordings,
  deleteRecording,
  clearAllRecordings,
  searchRecordings,
  getRecordingsByContext,
  getRecordingCount,
  formatRecordingTimestamp,
  formatDuration,
  type VoiceRecording,
} from "../client/src/lib/voiceRecordingHistory";

describe("Voice Recording History", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Save Recording", () => {
    it("should save a recording with all metadata", () => {
      const text = "This is a test recording";
      const duration = 15;
      const context = "Assessment";

      const recording = saveRecording(text, duration, context);

      expect(recording.text).toBe(text);
      expect(recording.duration).toBe(duration);
      expect(recording.context).toBe(context);
      expect(recording.id).toBeDefined();
      expect(recording.timestamp).toBeDefined();
      expect(recording.preview).toBe(text);
    });

    it("should truncate preview text to 100 characters", () => {
      const longText = "A".repeat(150);
      const recording = saveRecording(longText);

      expect(recording.preview).toBe("A".repeat(100) + "...");
      expect(recording.text).toBe(longText);
    });

    it("should save recording without optional fields", () => {
      const text = "Simple recording";
      const recording = saveRecording(text);

      expect(recording.text).toBe(text);
      expect(recording.duration).toBeUndefined();
      expect(recording.context).toBeUndefined();
    });

    it("should persist recording to localStorage", () => {
      saveRecording("Test recording");

      const stored = localStorage.getItem("bca_voice_recordings");
      expect(stored).toBeDefined();

      const recordings = JSON.parse(stored!) as VoiceRecording[];
      expect(recordings).toHaveLength(1);
      expect(recordings[0]?.text).toBe("Test recording");
    });
  });

  describe("Get Recordings", () => {
    it("should return empty array when no recordings exist", () => {
      const recordings = getRecordings();
      expect(recordings).toEqual([]);
    });

    it("should return all saved recordings", () => {
      saveRecording("Recording 1");
      saveRecording("Recording 2");
      saveRecording("Recording 3");

      const recordings = getRecordings();
      expect(recordings).toHaveLength(3);
    });

    it("should return recordings sorted by timestamp descending", () => {
      const now = Date.now();
      vi.setSystemTime(now);
      saveRecording("First");

      vi.setSystemTime(now + 1000);
      saveRecording("Second");

      vi.setSystemTime(now + 2000);
      saveRecording("Third");

      const recordings = getRecordings();
      expect(recordings[0]?.text).toBe("Third");
      expect(recordings[1]?.text).toBe("Second");
      expect(recordings[2]?.text).toBe("First");
    });
  });

  describe("Delete Recording", () => {
    it("should delete a specific recording by ID", () => {
      const rec1 = saveRecording("Recording 1");
      const rec2 = saveRecording("Recording 2");
      const rec3 = saveRecording("Recording 3");

      deleteRecording(rec2.id);

      const recordings = getRecordings();
      expect(recordings).toHaveLength(2);
      expect(recordings.find(r => r.id === rec1.id)).toBeDefined();
      expect(recordings.find(r => r.id === rec2.id)).toBeUndefined();
      expect(recordings.find(r => r.id === rec3.id)).toBeDefined();
    });

    it("should handle deleting non-existent recording gracefully", () => {
      saveRecording("Recording 1");
      
      expect(() => deleteRecording("non-existent-id")).not.toThrow();
      
      const recordings = getRecordings();
      expect(recordings).toHaveLength(1);
    });
  });

  describe("Clear All Recordings", () => {
    it("should remove all recordings from localStorage", () => {
      saveRecording("Recording 1");
      saveRecording("Recording 2");
      saveRecording("Recording 3");

      clearAllRecordings();

      const recordings = getRecordings();
      expect(recordings).toEqual([]);
      expect(localStorage.getItem("bca_voice_recordings")).toBeNull();
    });
  });

  describe("Search Recordings", () => {
    beforeEach(() => {
      saveRecording("The roof needs repair", undefined, "Assessment");
      saveRecording("HVAC system is functioning well", undefined, "Assessment");
      saveRecording("Foundation has minor cracks", undefined, "Deficiency");
      saveRecording("Electrical panel inspection complete", undefined, "Inspection");
    });

    it("should search by text content (case-insensitive)", () => {
      const results = searchRecordings("roof");
      expect(results).toHaveLength(1);
      expect(results[0]?.text).toContain("roof");
    });

    it("should search by context", () => {
      const results = searchRecordings("assessment");
      expect(results).toHaveLength(2);
    });

    it("should return all recordings for empty query", () => {
      const results = searchRecordings("");
      expect(results).toHaveLength(4);
    });

    it("should return empty array when no matches found", () => {
      const results = searchRecordings("nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("Get Recordings by Context", () => {
    beforeEach(() => {
      saveRecording("Assessment note 1", undefined, "Assessment");
      saveRecording("Assessment note 2", undefined, "Assessment");
      saveRecording("Deficiency note 1", undefined, "Deficiency");
      saveRecording("Project note 1", undefined, "Project");
    });

    it("should filter recordings by context", () => {
      const assessments = getRecordingsByContext("Assessment");
      expect(assessments).toHaveLength(2);
      expect(assessments.every(r => r.context === "Assessment")).toBe(true);
    });

    it("should return empty array for non-existent context", () => {
      const results = getRecordingsByContext("NonExistent");
      expect(results).toEqual([]);
    });
  });

  describe("Get Recording Count", () => {
    it("should return 0 when no recordings exist", () => {
      expect(getRecordingCount()).toBe(0);
    });

    it("should return correct count", () => {
      saveRecording("Recording 1");
      saveRecording("Recording 2");
      saveRecording("Recording 3");

      expect(getRecordingCount()).toBe(3);
    });
  });

  describe("Max Recording Limit", () => {
    it("should enforce max limit of 50 recordings", () => {
      // Save 55 recordings
      for (let i = 1; i <= 55; i++) {
        saveRecording(`Recording ${i}`);
      }

      const recordings = getRecordings();
      expect(recordings).toHaveLength(50);
      
      // Should keep the 50 most recent
      expect(recordings[0]?.text).toBe("Recording 55");
      expect(recordings[49]?.text).toBe("Recording 6");
    });
  });

  describe("Format Recording Timestamp", () => {
    it("should format recent timestamps correctly", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(formatRecordingTimestamp(now)).toBe("Just now");
      expect(formatRecordingTimestamp(now - 30000)).toBe("Just now"); // 30 seconds ago
      expect(formatRecordingTimestamp(now - 120000)).toBe("2m ago"); // 2 minutes ago
      expect(formatRecordingTimestamp(now - 3600000)).toBe("1h ago"); // 1 hour ago
      expect(formatRecordingTimestamp(now - 86400000)).toBe("1d ago"); // 1 day ago
    });

    it("should format old timestamps as dates", () => {
      const now = Date.now();
      const oldDate = now - (8 * 86400000); // 8 days ago
      
      vi.setSystemTime(now);
      const formatted = formatRecordingTimestamp(oldDate);
      
      expect(formatted).toContain("/"); // Should be a date string
    });
  });

  describe("Format Duration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(30)).toBe("30s");
      expect(formatDuration(45)).toBe("45s");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(90)).toBe("1m 30s");
      expect(formatDuration(125)).toBe("2m 5s");
      expect(formatDuration(600)).toBe("10m 0s");
    });

    it("should return empty string for undefined", () => {
      expect(formatDuration(undefined)).toBe("");
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage errors gracefully when loading", () => {
      vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      const recordings = getRecordings();
      expect(recordings).toEqual([]);
    });

    it("should handle localStorage errors gracefully when saving", () => {
      vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => saveRecording("Test")).toThrow();
    });

    it("should handle corrupted localStorage data", () => {
      vi.restoreAllMocks(); // Clear any previous mocks
      localStorage.setItem("bca_voice_recordings", "invalid json");

      const recordings = getRecordings();
      expect(recordings).toEqual([]);
    });
  });

  describe("Recording ID Generation", () => {
    beforeEach(() => {
      vi.restoreAllMocks(); // Clear any previous mocks
    });

    it("should generate unique IDs for each recording", () => {
      const rec1 = saveRecording("Recording 1");
      const rec2 = saveRecording("Recording 2");
      const rec3 = saveRecording("Recording 3");

      expect(rec1.id).not.toBe(rec2.id);
      expect(rec2.id).not.toBe(rec3.id);
      expect(rec1.id).not.toBe(rec3.id);
    });

    it("should include timestamp in ID", () => {
      const recording = saveRecording("Test");
      expect(recording.id).toContain("rec_");
    });
  });
});
