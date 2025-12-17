import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  notifyAdminNewRegistration,
  notifyUserRegistrationReceived,
  notifyUserApproved,
  notifyUserRejected,
} from "./accessRequestEmail";
import * as notification from "../_core/notification";

// Mock the notification module
vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

describe("Access Request Email Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifyAdminNewRegistration", () => {
    it("should send admin notification with all user details", async () => {
      const mockNotifyOwner = vi.mocked(notification.notifyOwner);
      mockNotifyOwner.mockResolvedValue(true);

      const testData = {
        fullName: "John Doe",
        email: "john@example.com",
        companyName: "Acme Corp",
        city: "Toronto",
        phoneNumber: "416-555-1234",
        useCase: "Building condition assessments for our portfolio",
        submittedAt: new Date("2025-01-15T10:30:00Z"),
      };

      const result = await notifyAdminNewRegistration(testData);

      expect(result).toBe(true);
      expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
      
      const call = mockNotifyOwner.mock.calls[0]![0];
      expect(call.title).toContain("New Registration Request");
      expect(call.title).toContain("John Doe");
      expect(call.content).toContain("john@example.com");
      expect(call.content).toContain("Acme Corp");
      expect(call.content).toContain("Toronto");
      expect(call.content).toContain("416-555-1234");
      expect(call.content).toContain("Building condition assessments");
      expect(call.content).toContain("lfaria@mabenconsulting.ca");
    });

    it("should handle optional fields gracefully", async () => {
      const mockNotifyOwner = vi.mocked(notification.notifyOwner);
      mockNotifyOwner.mockResolvedValue(true);

      const testData = {
        fullName: "Jane Smith",
        email: "jane@example.com",
        companyName: "Test Inc",
        city: "Vancouver",
        submittedAt: new Date(),
      };

      const result = await notifyAdminNewRegistration(testData);

      expect(result).toBe(true);
      expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
      
      const call = mockNotifyOwner.mock.calls[0]![0];
      expect(call.content).toContain("Jane Smith");
      expect(call.content).not.toContain("Phone:");
    });

    it("should return false on notification failure", async () => {
      const mockNotifyOwner = vi.mocked(notification.notifyOwner);
      mockNotifyOwner.mockRejectedValue(new Error("Network error"));

      const testData = {
        fullName: "Test User",
        email: "test@example.com",
        companyName: "Test Co",
        city: "Montreal",
        submittedAt: new Date(),
      };

      const result = await notifyAdminNewRegistration(testData);

      expect(result).toBe(false);
    });
  });

  describe("notifyUserRegistrationReceived", () => {
    it("should log confirmation message for user", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const testData = {
        fullName: "Alice Johnson",
        email: "alice@example.com",
      };

      const result = await notifyUserRegistrationReceived(testData);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Would send confirmation to alice@example.com"),
        expect.objectContaining({
          title: expect.stringContaining("Registration Request Received"),
          content: expect.stringContaining("Alice Johnson"),
        })
      );

      consoleSpy.mockRestore();
    });

    it("should include contact email in message", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const testData = {
        fullName: "Bob Wilson",
        email: "bob@example.com",
      };

      await notifyUserRegistrationReceived(testData);

      const call = consoleSpy.mock.calls[0]![1] as { content: string };
      expect(call.content).toContain("lfaria@mabenconsulting.ca");

      consoleSpy.mockRestore();
    });
  });

  describe("notifyUserApproved", () => {
    it("should log approval notification with account details", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const testData = {
        fullName: "Charlie Brown",
        email: "charlie@example.com",
        companyName: "Peanuts Inc",
        role: "project_manager",
      };

      const result = await notifyUserApproved(testData);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Would send approval notification to charlie@example.com"),
        expect.objectContaining({
          title: expect.stringContaining("Access Request Has Been Approved"),
          content: expect.stringContaining("Charlie Brown"),
        })
      );

      const call = consoleSpy.mock.calls[0]![1] as { content: string };
      expect(call.content).toContain("Peanuts Inc");
      expect(call.content).toContain("project_manager");

      consoleSpy.mockRestore();
    });
  });

  describe("notifyUserRejected", () => {
    it("should log rejection notification with reason", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const testData = {
        fullName: "David Lee",
        email: "david@example.com",
        rejectionReason: "Incomplete company information",
      };

      const result = await notifyUserRejected(testData);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Would send rejection notification to david@example.com"),
        expect.objectContaining({
          title: expect.stringContaining("Registration Request Update"),
          content: expect.stringContaining("David Lee"),
        })
      );

      const call = consoleSpy.mock.calls[0]![1] as { content: string };
      expect(call.content).toContain("Incomplete company information");

      consoleSpy.mockRestore();
    });

    it("should handle rejection without reason", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const testData = {
        fullName: "Eve Martinez",
        email: "eve@example.com",
      };

      const result = await notifyUserRejected(testData);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
