import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Test suite for access request submission (signup functionality)
 */

function createPublicContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("accessRequests.submit", () => {
  it("accepts valid access request submission", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const testRequest = {
      openId: `test-user-${Date.now()}@example.com`,
      fullName: "John Doe",
      email: `test-${Date.now()}@example.com`,
      companyName: "Test Company Inc",
      city: "Toronto",
      phoneNumber: "+1-416-555-0123",
      useCase: "Building condition assessments for commercial properties",
    };

    const result = await caller.accessRequests.submit(testRequest);

    expect(result).toEqual({
      success: true,
      message: "Access request submitted successfully",
    });
  });

  it("accepts minimal required fields only", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const minimalRequest = {
      openId: `minimal-user-${Date.now()}@example.com`,
      fullName: "Jane Smith",
      email: `minimal-${Date.now()}@example.com`,
      companyName: "Minimal Corp",
      city: "Vancouver",
    };

    const result = await caller.accessRequests.submit(minimalRequest);

    expect(result).toEqual({
      success: true,
      message: "Access request submitted successfully",
    });
  });

  it("rejects duplicate pending request from same openId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const duplicateOpenId = `duplicate-${Date.now()}@example.com`;

    const firstRequest = {
      openId: duplicateOpenId,
      fullName: "Duplicate User",
      email: `dup-${Date.now()}@example.com`,
      companyName: "Duplicate Company",
      city: "Montreal",
    };

    // First submission should succeed
    await caller.accessRequests.submit(firstRequest);

    // Second submission with same openId should fail
    await expect(caller.accessRequests.submit(firstRequest)).rejects.toThrow(
      "You already have a pending access request"
    );
  });

  it("validates email format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const invalidEmailRequest = {
      openId: "test-invalid-email",
      fullName: "Invalid Email User",
      email: "not-an-email",
      companyName: "Test Company",
      city: "Calgary",
    };

    await expect(caller.accessRequests.submit(invalidEmailRequest)).rejects.toThrow();
  });

  it("validates required fields are not empty", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const emptyNameRequest = {
      openId: "test-empty-name",
      fullName: "",
      email: `empty-${Date.now()}@example.com`,
      companyName: "Test Company",
      city: "Ottawa",
    };

    await expect(caller.accessRequests.submit(emptyNameRequest)).rejects.toThrow();
  });
});

describe("accessRequests.getMyRequest", () => {
  it("returns null for non-existent request", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.accessRequests.getMyRequest({
      openId: `non-existent-${Date.now()}@example.com`,
    });

    expect(result).toBeNull();
  });

  it("returns pending request details", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const openId = `pending-check-${Date.now()}@example.com`;
    const email = `pending-${Date.now()}@example.com`;

    // Submit a request first
    await caller.accessRequests.submit({
      openId,
      fullName: "Pending User",
      email,
      companyName: "Pending Company",
      city: "Edmonton",
      phoneNumber: "+1-780-555-0100",
      useCase: "Testing pending status",
    });

    // Check the request status
    const result = await caller.accessRequests.getMyRequest({ openId });

    expect(result).not.toBeNull();
    expect(result?.openId).toBe(openId);
    expect(result?.email).toBe(email);
    expect(result?.status).toBe("pending");
    expect(result?.fullName).toBe("Pending User");
    expect(result?.companyName).toBe("Pending Company");
  });
});
