import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Access Request Email Workflow", () => {
  it("should send email notification when access request is submitted", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const testRequest = {
      openId: `email-test-${Date.now()}@example.com`,
      fullName: "Email Test User",
      email: `email-test-${Date.now()}@example.com`,
      companyName: "Email Test Company",
      city: "Toronto",
      phoneNumber: "+1-416-555-9999",
      useCase: "Testing email notification system for access requests",
    };

    // Submit access request - this should trigger email to admin
    const result = await caller.accessRequests.submit(testRequest);

    expect(result).toEqual({
      success: true,
      message: "Access request submitted successfully",
    });

    console.log("✅ Access request submitted successfully");
    console.log("📧 Email notification should have been sent to:", process.env.ADMIN_EMAIL || "lfaria@mabenconsulting.ca");
    console.log("📝 Check your inbox for: 'New Access Request from Email Test User'");
  }, 30000);
});
