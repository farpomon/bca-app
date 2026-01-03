import { describe, expect, it } from "vitest";
import {
  generateBucketKey,
  objectIdToUrn,
  parseTranslationProgress,
} from "./_core/apsService";

describe("APS Service Utilities", () => {
  describe("generateBucketKey", () => {
    it("should generate a valid bucket key with default prefix", () => {
      const key = generateBucketKey();
      
      expect(key).toBeDefined();
      expect(key.startsWith("bca-app-")).toBe(true);
      expect(key.length).toBeLessThanOrEqual(128);
      expect(key).toMatch(/^[a-z0-9-]+$/);
    });

    it("should generate a valid bucket key with custom prefix", () => {
      const key = generateBucketKey("my-custom-prefix");
      
      expect(key.startsWith("my-custom-prefix-")).toBe(true);
      expect(key).toMatch(/^[a-z0-9-]+$/);
    });

    it("should generate unique keys on each call", () => {
      const key1 = generateBucketKey();
      const key2 = generateBucketKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe("objectIdToUrn", () => {
    it("should convert object ID to base64 URL-safe URN", () => {
      const objectId = "urn:adsk.objects:os.object:my-bucket/my-file.rvt";
      const urn = objectIdToUrn(objectId);
      
      expect(urn).toBeDefined();
      expect(urn.length).toBeGreaterThan(0);
      // Should not contain standard base64 padding or unsafe characters
      expect(urn).not.toContain("=");
      expect(urn).not.toContain("+");
      expect(urn).not.toContain("/");
    });

    it("should handle special characters in object ID", () => {
      const objectId = "urn:adsk.objects:os.object:bucket/path/to/file with spaces.rvt";
      const urn = objectIdToUrn(objectId);
      
      expect(urn).toBeDefined();
      expect(urn).not.toContain("=");
    });
  });

  describe("parseTranslationProgress", () => {
    it("should parse pending status", () => {
      const result = parseTranslationProgress({
        type: "manifest",
        hasThumbnail: "false",
        status: "pending",
        progress: "0%",
        region: "US",
        urn: "test-urn",
      });
      
      expect(result.status).toBe("pending");
      expect(result.progress).toBe(0);
      expect(result.message).toContain("pending");
    });

    it("should parse in-progress status with percentage", () => {
      const result = parseTranslationProgress({
        type: "manifest",
        hasThumbnail: "false",
        status: "inprogress",
        progress: "45%",
        region: "US",
        urn: "test-urn",
      });
      
      expect(result.status).toBe("in_progress");
      expect(result.progress).toBe(45);
      expect(result.message).toContain("45%");
    });

    it("should parse success status", () => {
      const result = parseTranslationProgress({
        type: "manifest",
        hasThumbnail: "true",
        status: "success",
        progress: "complete",
        region: "US",
        urn: "test-urn",
      });
      
      expect(result.status).toBe("success");
      expect(result.progress).toBe(100);
      expect(result.message).toContain("success");
    });

    it("should parse failed status", () => {
      const result = parseTranslationProgress({
        type: "manifest",
        hasThumbnail: "false",
        status: "failed",
        progress: "0%",
        region: "US",
        urn: "test-urn",
      });
      
      expect(result.status).toBe("failed");
      expect(result.message).toContain("failed");
    });

    it("should handle missing progress gracefully", () => {
      const result = parseTranslationProgress({
        type: "manifest",
        hasThumbnail: "false",
        status: "inprogress",
        progress: "",
        region: "US",
        urn: "test-urn",
      });
      
      expect(result.status).toBe("in_progress");
      expect(result.progress).toBe(0);
    });
  });
});
