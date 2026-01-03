import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { 
  createExportSession, 
  updateExportProgress, 
  completeExport, 
  failExport, 
  cancelExport,
  isExportCancelled,
  getExportStatus 
} from "./api/export-progress";

describe("Export Progress SSE System", () => {
  describe("Export Session Management", () => {
    it("should create a new export session", () => {
      const exportId = createExportSession(5);
      
      expect(exportId).toBeDefined();
      expect(typeof exportId).toBe("string");
      expect(exportId.length).toBeGreaterThan(0);
      
      const status = getExportStatus(exportId);
      expect(status).not.toBeNull();
      expect(status?.status).toBe("pending");
      expect(status?.totalItems).toBe(5);
      expect(status?.currentItem).toBe(0);
      expect(status?.progress).toBe(0);
    });

    it("should update export progress", () => {
      const exportId = createExportSession(10);
      
      updateExportProgress(exportId, {
        status: "processing",
        currentItem: 3,
        currentItemName: "Test Project",
        message: "Generating PDF...",
      });
      
      const status = getExportStatus(exportId);
      expect(status?.status).toBe("processing");
      expect(status?.currentItem).toBe(3);
      expect(status?.currentItemName).toBe("Test Project");
      expect(status?.message).toBe("Generating PDF...");
      expect(status?.progress).toBe(30); // 3/10 = 30%
    });

    it("should complete export with result", () => {
      const exportId = createExportSession(5);
      
      completeExport(exportId, {
        url: "https://example.com/export.zip",
        filename: "bulk-export.zip",
        size: 1024000,
      });
      
      const status = getExportStatus(exportId);
      expect(status?.status).toBe("complete");
      expect(status?.progress).toBe(100);
      expect(status?.result?.url).toBe("https://example.com/export.zip");
      expect(status?.result?.filename).toBe("bulk-export.zip");
      expect(status?.result?.size).toBe(1024000);
      expect(status?.completedAt).toBeDefined();
    });

    it("should fail export with error message", () => {
      const exportId = createExportSession(5);
      
      failExport(exportId, "Database connection failed");
      
      const status = getExportStatus(exportId);
      expect(status?.status).toBe("error");
      expect(status?.error).toBe("Database connection failed");
      expect(status?.completedAt).toBeDefined();
    });

    it("should cancel export", () => {
      const exportId = createExportSession(5);
      
      updateExportProgress(exportId, { status: "processing" });
      
      const cancelled = cancelExport(exportId);
      expect(cancelled).toBe(true);
      
      const status = getExportStatus(exportId);
      expect(status?.status).toBe("cancelled");
      expect(status?.message).toBe("Export cancelled by user");
    });

    it("should not cancel completed export", () => {
      const exportId = createExportSession(5);
      
      completeExport(exportId, { url: "https://example.com/export.zip" });
      
      const cancelled = cancelExport(exportId);
      expect(cancelled).toBe(false);
      
      const status = getExportStatus(exportId);
      expect(status?.status).toBe("complete");
    });

    it("should check if export is cancelled", () => {
      const exportId = createExportSession(5);
      
      expect(isExportCancelled(exportId)).toBe(false);
      
      cancelExport(exportId);
      
      expect(isExportCancelled(exportId)).toBe(true);
    });

    it("should return null for non-existent session", () => {
      const status = getExportStatus("non-existent-id");
      expect(status).toBeNull();
    });

    it("should calculate progress automatically", () => {
      const exportId = createExportSession(4);
      
      updateExportProgress(exportId, { currentItem: 1 });
      expect(getExportStatus(exportId)?.progress).toBe(25);
      
      updateExportProgress(exportId, { currentItem: 2 });
      expect(getExportStatus(exportId)?.progress).toBe(50);
      
      updateExportProgress(exportId, { currentItem: 3 });
      expect(getExportStatus(exportId)?.progress).toBe(75);
      
      updateExportProgress(exportId, { currentItem: 4 });
      expect(getExportStatus(exportId)?.progress).toBe(100);
    });
  });

  describe("Export Progress Timestamps", () => {
    it("should track startedAt and updatedAt", () => {
      const exportId = createExportSession(5);
      const status = getExportStatus(exportId);
      
      expect(status?.startedAt).toBeDefined();
      expect(status?.updatedAt).toBeDefined();
      expect(status?.startedAt).toBeLessThanOrEqual(Date.now());
    });

    it("should update updatedAt on progress changes", async () => {
      const exportId = createExportSession(5);
      const initialStatus = getExportStatus(exportId);
      const initialUpdatedAt = initialStatus?.updatedAt;
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      updateExportProgress(exportId, { currentItem: 1 });
      const updatedStatus = getExportStatus(exportId);
      
      expect(updatedStatus?.updatedAt).toBeGreaterThan(initialUpdatedAt!);
    });
  });
});
