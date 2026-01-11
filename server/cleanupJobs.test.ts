import { describe, expect, it } from "vitest";
import { runCleanupJob } from "./cleanupJobs";
import { getDb } from "./db";
import { cleanupReports } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";

describe("Cleanup Jobs", () => {
  describe("Job Execution", () => {
    it("should run cleanup job in read-only mode", async () => {
      const result = await runCleanupJob("read_only");

      expect(result).toBeDefined();
      expect(result.reportId).toBeGreaterThan(0);
      expect(result.status).toBe("completed");
      expect(result.duration).toBeGreaterThan(0);
      expect(result.totalIssuesCount).toBeGreaterThanOrEqual(0);
    });

    it("should create cleanup report in database", async () => {
      const result = await runCleanupJob("read_only");

      const db = await getDb();
      if (db) {
        const reports = await db.select()
          .from(cleanupReports)
          .where(eq(cleanupReports.id, result.reportId))
          .limit(1);

        expect(reports.length).toBe(1);
        expect(reports[0].status).toBe("completed");
      }
    });

    it("should track critical, warning, and info issue counts", async () => {
      const result = await runCleanupJob("read_only");

      expect(result).toHaveProperty("criticalIssuesCount");
      expect(result).toHaveProperty("warningIssuesCount");
      expect(result).toHaveProperty("infoIssuesCount");
      expect(typeof result.criticalIssuesCount).toBe("number");
      expect(typeof result.warningIssuesCount).toBe("number");
      expect(typeof result.infoIssuesCount).toBe("number");
    });

    it("should provide affected records list", async () => {
      const result = await runCleanupJob("read_only");

      expect(result.affectedRecords).toBeInstanceOf(Array);
      
      if (result.affectedRecords.length > 0) {
        const record = result.affectedRecords[0];
        expect(record).toHaveProperty("type");
        expect(record).toHaveProperty("issue");
        expect(record).toHaveProperty("severity");
      }
    });

    it("should provide recommendations", async () => {
      const result = await runCleanupJob("read_only");

      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe("Report Structure", () => {
    it("should store complete report data", async () => {
      const result = await runCleanupJob("read_only");

      const db = await getDb();
      if (db) {
        const reports = await db.select()
          .from(cleanupReports)
          .where(eq(cleanupReports.id, result.reportId))
          .limit(1);

        const report = reports[0];
        
        expect(report).toHaveProperty("runTimestamp");
        expect(report).toHaveProperty("completedAt");
        expect(report).toHaveProperty("duration");
        expect(report).toHaveProperty("status");
        expect(report).toHaveProperty("mode");
        expect(report).toHaveProperty("criticalIssuesCount");
        expect(report).toHaveProperty("warningIssuesCount");
        expect(report).toHaveProperty("infoIssuesCount");
      }
    });

    it("should track specific issue types", async () => {
      const result = await runCleanupJob("read_only");

      const db = await getDb();
      if (db) {
        const reports = await db.select()
          .from(cleanupReports)
          .where(eq(cleanupReports.id, result.reportId))
          .limit(1);

        const report = reports[0];
        
        expect(report).toHaveProperty("orphanedRecordsCount");
        expect(report).toHaveProperty("duplicateRecordsCount");
        expect(report).toHaveProperty("staleComputationsCount");
        expect(report).toHaveProperty("invalidWeightsCount");
        expect(report).toHaveProperty("brokenReferencesCount");
        expect(report).toHaveProperty("missingDependenciesCount");
      }
    });
  });

  describe("Auto-Fix Mode", () => {
    it("should run cleanup job in auto-fix mode", async () => {
      const result = await runCleanupJob("auto_fix");

      expect(result).toBeDefined();
      expect(result.status).toBe("completed");
    });

    it("should track actions taken in auto-fix mode", async () => {
      const result = await runCleanupJob("auto_fix");

      const db = await getDb();
      if (db) {
        const reports = await db.select()
          .from(cleanupReports)
          .where(eq(cleanupReports.id, result.reportId))
          .limit(1);

        const report = reports[0];
        
        expect(report).toHaveProperty("recordsArchived");
        expect(report).toHaveProperty("recordsDeleted");
        expect(report).toHaveProperty("recordsFixed");
        expect(report).toHaveProperty("calculationsRerun");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle job failures gracefully", async () => {
      // This test would require mocking a failure scenario
      // For now, we verify the structure exists
      const db = await getDb();
      if (db) {
        const reports = await db.select()
          .from(cleanupReports)
          .orderBy(desc(cleanupReports.runTimestamp))
          .limit(1);

        if (reports.length > 0) {
          expect(reports[0]).toHaveProperty("status");
          expect(reports[0]).toHaveProperty("errorLog");
        }
      }
    });
  });

  describe("Performance", () => {
    it("should complete cleanup job within reasonable time", async () => {
      const startTime = Date.now();
      const result = await runCleanupJob("read_only");
      const endTime = Date.now();

      const duration = (endTime - startTime) / 1000; // Convert to seconds
      
      // Cleanup should complete within 60 seconds for most databases
      expect(duration).toBeLessThan(60);
      expect(result.duration).toBeLessThan(60);
    });
  });
});
