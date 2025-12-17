import { describe, expect, it, vi, beforeEach } from "vitest";
import { contactRouter } from "./contact.router";
import * as emailService from "../services/emailService";

// Mock the email service
vi.mock("../services/emailService", () => ({
  sendEmail: vi.fn(),
}));

describe("contact.sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send contact form email successfully", async () => {
    // Mock successful email sending
    vi.mocked(emailService.sendEmail).mockResolvedValue(true);

    const caller = contactRouter.createCaller({} as any);

    const result = await caller.sendMessage({
      name: "John Doe",
      email: "john@example.com",
      subject: "Test Inquiry",
      message: "This is a test message",
    });

    expect(result).toEqual({ success: true });
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lfaria@mabenconsulting.ca",
        subject: "Contact Form: Test Inquiry",
      })
    );
  });

  it("should send email without subject", async () => {
    vi.mocked(emailService.sendEmail).mockResolvedValue(true);

    const caller = contactRouter.createCaller({} as any);

    const result = await caller.sendMessage({
      name: "Jane Smith",
      email: "jane@example.com",
      message: "Another test message",
    });

    expect(result).toEqual({ success: true });
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lfaria@mabenconsulting.ca",
        subject: "New Contact Form Submission",
      })
    );
  });

  it("should throw error when email sending fails", async () => {
    vi.mocked(emailService.sendEmail).mockRejectedValue(
      new Error("SendGrid error")
    );

    const caller = contactRouter.createCaller({} as any);

    await expect(
      caller.sendMessage({
        name: "Test User",
        email: "test@example.com",
        message: "Test message",
      })
    ).rejects.toThrow("Failed to send message. Please try again later.");
  });

  it("should validate required fields", async () => {
    const caller = contactRouter.createCaller({} as any);

    // Test missing name
    await expect(
      caller.sendMessage({
        name: "",
        email: "test@example.com",
        message: "Test",
      })
    ).rejects.toThrow();

    // Test missing email
    await expect(
      caller.sendMessage({
        name: "Test",
        email: "",
        message: "Test",
      })
    ).rejects.toThrow();

    // Test invalid email
    await expect(
      caller.sendMessage({
        name: "Test",
        email: "invalid-email",
        message: "Test",
      })
    ).rejects.toThrow();

    // Test missing message
    await expect(
      caller.sendMessage({
        name: "Test",
        email: "test@example.com",
        message: "",
      })
    ).rejects.toThrow();
  });

  it("should include all form data in email content", async () => {
    vi.mocked(emailService.sendEmail).mockResolvedValue(true);

    const caller = contactRouter.createCaller({} as any);

    await caller.sendMessage({
      name: "Alice Johnson",
      email: "alice@example.com",
      subject: "Feature Request",
      message: "I would like to request a new feature",
    });

    const emailCall = vi.mocked(emailService.sendEmail).mock.calls[0][0];

    expect(emailCall.text).toContain("Alice Johnson");
    expect(emailCall.text).toContain("alice@example.com");
    expect(emailCall.text).toContain("Feature Request");
    expect(emailCall.text).toContain("I would like to request a new feature");

    expect(emailCall.html).toContain("Alice Johnson");
    expect(emailCall.html).toContain("alice@example.com");
    expect(emailCall.html).toContain("Feature Request");
    expect(emailCall.html).toContain("I would like to request a new feature");
  });
});
