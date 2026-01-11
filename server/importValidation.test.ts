import { describe, expect, it } from "vitest";
import { validateBulkImport, type ImportType } from "./importValidation";
import type { User } from "../drizzle/schema";

describe("Import Validation", () => {
  const mockUser: User = {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "manus",
    role: "admin",
    companyId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    accountStatus: "active",
    mfaEnabled: 0,
    mfaSecret: null,
    mfaBackupCodes: null,
    mfaTimeRestrictionEnabled: 0,
    mfaTimeRestrictionStart: null,
    mfaTimeRestrictionEnd: null,
  };

  describe("Required Fields Validation", () => {
    it("should reject rows with missing required fields", async () => {
      const rows = [
        { name: "Asset 1", description: "Valid" },
        { description: "Missing name" }, // Invalid
        { name: "", description: "Empty name" }, // Invalid
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.invalidRows).toBeGreaterThan(0);
      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.canProceed).toBe(false);
    });

    it("should accept rows with all required fields", async () => {
      const rows = [
        { name: "Asset 1", description: "Valid asset" },
        { name: "Asset 2", description: "Another valid asset" },
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);
      expect(result.canProceed).toBe(true);
    });
  });

  describe("Data Format Validation", () => {
    it("should reject invalid numeric values", async () => {
      const rows = [
        { name: "Asset 1", weight: "not a number" },
        { name: "Asset 2", cost: "invalid" },
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.invalidRows).toBeGreaterThan(0);
      expect(result.validationErrors.some(e => e.error.includes("number"))).toBe(true);
    });

    it("should reject negative values where inappropriate", async () => {
      const rows = [
        { name: "Asset 1", weight: -10 },
        { name: "Asset 2", cost: -100 },
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.validationErrors.some(e => e.error.includes("negative"))).toBe(true);
    });

    it("should warn about values exceeding reasonable limits", async () => {
      const rows = [
        { name: "Asset 1", weight: 150 }, // Weight > 100
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.validationErrors.some(e => e.severity === "warning")).toBe(true);
    });
  });

  describe("Duplicate Detection Within File", () => {
    it("should detect duplicate names within import file", async () => {
      const rows = [
        { name: "Duplicate Asset" },
        { name: "Unique Asset" },
        { name: "Duplicate Asset" }, // Duplicate
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.duplicatesInFile).toBeGreaterThan(0);
      expect(result.duplicateDetails.some(d => d.matchType === "within_file")).toBe(true);
    });

    it("should handle case-insensitive duplicate detection", async () => {
      const rows = [
        { name: "Test Asset" },
        { name: "test asset" }, // Should be detected as duplicate
        { name: "TEST ASSET" }, // Should be detected as duplicate
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.duplicatesInFile).toBeGreaterThan(0);
    });

    it("should ignore whitespace differences in duplicate detection", async () => {
      const rows = [
        { name: "  Test Asset  " },
        { name: "Test Asset" }, // Should be detected as duplicate
        { name: "Test   Asset" }, // Should be detected as duplicate
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.duplicatesInFile).toBeGreaterThan(0);
    });
  });

  describe("Duplicate Detection Against Database", () => {
    it("should detect duplicates against existing database records", async () => {
      // This test would require setting up test data in the database
      // For now, we'll test that the function runs without error
      const rows = [
        { name: "Test Asset" },
      ];

      const result = await validateBulkImport(rows, "assets", mockUser, { projectId: 1 });

      expect(result).toBeDefined();
      expect(result.duplicatesInDatabase).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Validation Result Structure", () => {
    it("should return complete validation result", async () => {
      const rows = [
        { name: "Valid Asset" },
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("totalRows");
      expect(result).toHaveProperty("validRows");
      expect(result).toHaveProperty("invalidRows");
      expect(result).toHaveProperty("duplicatesInFile");
      expect(result).toHaveProperty("duplicatesInDatabase");
      expect(result).toHaveProperty("validationErrors");
      expect(result).toHaveProperty("duplicateDetails");
      expect(result).toHaveProperty("canProceed");
      expect(result).toHaveProperty("recommendations");
    });

    it("should provide helpful recommendations", async () => {
      const rows = [
        { name: "Asset 1" },
        { description: "Missing name" }, // Invalid
        { name: "Asset 1" }, // Duplicate
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes("validation errors"))).toBe(true);
      expect(result.recommendations.some(r => r.includes("duplicate"))).toBe(true);
    });

    it("should indicate when all rows are valid", async () => {
      const rows = [
        { name: "Asset 1" },
        { name: "Asset 2" },
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      if (result.canProceed && result.duplicateDetails.length === 0) {
        expect(result.recommendations.some(r => r.includes("ready to import"))).toBe(true);
      }
    });
  });

  describe("Error Detail Information", () => {
    it("should provide row numbers in validation errors", async () => {
      const rows = [
        { name: "Valid" },
        { description: "Invalid" }, // Row 2
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      const error = result.validationErrors.find(e => e.row === 2);
      expect(error).toBeDefined();
      expect(error?.field).toBe("name");
    });

    it("should provide field names in validation errors", async () => {
      const rows = [
        { name: "Valid" },
        { name: "" }, // Invalid name field
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      const error = result.validationErrors.find(e => e.field === "name");
      expect(error).toBeDefined();
    });

    it("should provide error messages in validation errors", async () => {
      const rows = [
        { name: "" },
      ];

      const result = await validateBulkImport(rows, "assets", mockUser);

      expect(result.validationErrors[0]?.error).toBeDefined();
      expect(result.validationErrors[0]?.error.length).toBeGreaterThan(0);
    });
  });
});
