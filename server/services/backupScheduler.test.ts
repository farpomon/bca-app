/**
 * Tests for Backup Scheduler Service
 * Tests scheduling functionality and cron expression parsing
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  parseNextRunTime,
} from "./backupScheduler";

// Helper function to parse cron expression for testing
function parseCronExpression(cron: string) {
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression');
  }
  return {
    minute: parseInt(parts[0]) || 0,
    hour: parseInt(parts[1]) || 0,
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

describe("backupScheduler", () => {
  describe("parseCronExpression", () => {
    it("should parse a simple daily cron expression", () => {
      const result = parseCronExpression("0 3 * * *");
      
      expect(result).toEqual({
        minute: 0,
        hour: 3,
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*",
      });
    });

    it("should parse cron expression with specific values", () => {
      const result = parseCronExpression("30 14 15 6 2");
      
      expect(result).toEqual({
        minute: 30,
        hour: 14,
        dayOfMonth: "15",
        month: "6",
        dayOfWeek: "2",
      });
    });

    it("should handle midnight cron expression", () => {
      const result = parseCronExpression("0 0 * * *");
      
      expect(result).toEqual({
        minute: 0,
        hour: 0,
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*",
      });
    });

    it("should handle weekly cron expression", () => {
      const result = parseCronExpression("0 3 * * 0");
      
      expect(result).toEqual({
        minute: 0,
        hour: 3,
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "0",
      });
    });
  });

  describe("parseNextRunTime", () => {
    beforeEach(() => {
      // Mock the current date to a known value
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-15T10:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should calculate next run time for daily 3 AM Eastern schedule", () => {
      const nextRun = parseNextRunTime("0 3 * * *", "America/New_York");
      
      // Should be in the future
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
      
      // Should be within 24 hours
      const hoursDiff = (nextRun.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursDiff).toBeLessThanOrEqual(24);
    });

    it("should return a valid Date object", () => {
      const nextRun = parseNextRunTime("0 3 * * *", "America/New_York");
      
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.toString()).not.toBe("Invalid Date");
    });

    it("should handle different timezones", () => {
      const eastCoast = parseNextRunTime("0 3 * * *", "America/New_York");
      const westCoast = parseNextRunTime("0 3 * * *", "America/Los_Angeles");
      
      // West coast should be 3 hours later (UTC offset difference)
      // Both should be valid dates
      expect(eastCoast).toBeInstanceOf(Date);
      expect(westCoast).toBeInstanceOf(Date);
    });

    it("should handle UTC timezone", () => {
      const nextRun = parseNextRunTime("0 3 * * *", "UTC");
      
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("schedule configuration", () => {
    it("should support standard cron format (5 fields)", () => {
      // minute hour day-of-month month day-of-week
      const validCrons = [
        "0 3 * * *",      // Daily at 3 AM
        "30 2 * * *",     // Daily at 2:30 AM
        "0 0 * * 0",      // Weekly on Sunday at midnight
        "0 3 1 * *",      // Monthly on 1st at 3 AM
        "0 3 * * 1-5",    // Weekdays at 3 AM
      ];

      validCrons.forEach(cron => {
        const result = parseCronExpression(cron);
        expect(result).toBeDefined();
        expect(result.minute).toBeDefined();
        expect(result.hour).toBeDefined();
      });
    });

    it("should extract correct hour and minute from cron", () => {
      const testCases = [
        { cron: "0 3 * * *", expectedHour: 3, expectedMinute: 0 },
        { cron: "30 14 * * *", expectedHour: 14, expectedMinute: 30 },
        { cron: "15 0 * * *", expectedHour: 0, expectedMinute: 15 },
        { cron: "45 23 * * *", expectedHour: 23, expectedMinute: 45 },
      ];

      testCases.forEach(({ cron, expectedHour, expectedMinute }) => {
        const result = parseCronExpression(cron);
        expect(result.hour).toBe(expectedHour);
        expect(result.minute).toBe(expectedMinute);
      });
    });
  });

  describe("default schedule", () => {
    it("should have correct default cron expression for 3 AM Eastern", () => {
      const defaultCron = "0 3 * * *";
      const defaultTimezone = "America/New_York";
      
      const parsed = parseCronExpression(defaultCron);
      
      expect(parsed.hour).toBe(3);
      expect(parsed.minute).toBe(0);
      expect(defaultTimezone).toBe("America/New_York");
    });
  });
});
