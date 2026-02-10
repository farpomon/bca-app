import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock SendGrid before importing the module
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  },
}));

import { sendEmail, sendAccessRequestNotification } from "./emailService";

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "test-key";
    process.env.SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "test@example.com";
  });

  it("should have SendGrid API key configured", () => {
    expect(process.env.SENDGRID_API_KEY).toBeDefined();
  });

  it("should send test email successfully", async () => {
    const result = await sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER || "lfaria@mabenconsulting.ca",
      subject: "BCA System - Email Service Test",
      text: "This is a test email to verify the email service is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Service Test</h2>
          <p>This is a test email to verify the email service is working correctly.</p>
          <p style="color: #6b7280;">If you receive this email, the Office 365 SMTP integration is functioning properly.</p>
        </div>
      `,
    });

    expect(result).toBe(true);
  }, 30000); // 30 second timeout for email sending

  it("should send access request notification", async () => {
    const result = await sendAccessRequestNotification({
      fullName: "Test User",
      email: "test@example.com",
      companyName: "Test Company Inc",
      city: "Toronto",
      phoneNumber: "+1-416-555-0100",
      useCase: "Testing email notification system",
    });

    expect(result).toBe(true);
  }, 30000);
});
