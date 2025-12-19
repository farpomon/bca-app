import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, sendVerificationEmail } from "./email";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables for tests
    process.env.SENDGRID_API_KEY = "test-api-key";
    process.env.SENDGRID_FROM_EMAIL = "noreply@bcasystem.com";
  });

  describe("sendEmail", () => {
    it("should send email successfully via SendGrid", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
      });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test Email",
        text: "This is a test email",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.sendgrid.com/v3/mail/send",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should return false when SendGrid API fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test Email",
        text: "This is a test email",
      });

      expect(result).toBe(false);
    });

    it("should return false when SendGrid is not configured", async () => {
      delete process.env.SENDGRID_API_KEY;

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test Email",
        text: "This is a test email",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test Email",
        text: "This is a test email",
      });

      expect(result).toBe(false);
    });
  });

  describe("sendVerificationEmail", () => {
    it("should send MFA setup verification email", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
      });

      const result = await sendVerificationEmail(
        "user@example.com",
        "123456",
        "mfa_setup"
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.subject).toBe("BCA System - Set Up Email-Based MFA");
      expect(requestBody.content[0].value).toContain("123456");
      expect(requestBody.content[0].value).toContain("5 minutes");
    });

    it("should send MFA login verification email", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
      });

      const result = await sendVerificationEmail(
        "user@example.com",
        "654321",
        "mfa_login"
      );

      expect(result).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.subject).toBe("BCA System - Verify Your Identity");
      expect(requestBody.content[0].value).toContain("654321");
    });

    it("should include both text and HTML content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
      });

      await sendVerificationEmail("user@example.com", "123456", "mfa_setup");

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.content).toHaveLength(2);
      expect(requestBody.content[0].type).toBe("text/plain");
      expect(requestBody.content[1].type).toBe("text/html");
      expect(requestBody.content[1].value).toContain("<html>");
      expect(requestBody.content[1].value).toContain("123456");
    });
  });
});
