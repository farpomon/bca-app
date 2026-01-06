import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    company: null,
    companyId: null,
    isSuperAdmin: 0,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("photos.byAssessment", () => {
  it("should require authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.photos.byAssessment({
        assessmentId: 1,
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("should accept valid input parameters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will fail with "Access denied" since we're using test data,
    // but it proves the endpoint accepts the correct input shape
    await expect(
      caller.photos.byAssessment({
        assessmentId: 999999,
        projectId: 999999,
      })
    ).rejects.toThrow("Access denied");
  });

  it("should validate required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Missing required fields should throw validation error
    await expect(
      // @ts-expect-error - Testing invalid input
      caller.photos.byAssessment({})
    ).rejects.toThrow();
  });
});

describe("photos.upload", () => {
  it("should require authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.photos.upload({
        projectId: 1,
        assessmentId: 1,
        fileData: "base64data",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("should validate required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Missing required fields should throw validation error
    await expect(
      // @ts-expect-error - Testing invalid input
      caller.photos.upload({
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("should accept valid upload parameters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a small test image in base64
    const testImageBase64 = Buffer.from("test image data").toString("base64");

    // This will fail with "Project not found" since we're using test data,
    // but it proves the endpoint accepts the correct input shape
    await expect(
      caller.photos.upload({
        projectId: 999999,
        assessmentId: 1,
        fileData: testImageBase64,
        fileName: "test-photo.jpg",
        mimeType: "image/jpeg",
        caption: "Test photo caption",
      })
    ).rejects.toThrow("Project not found");
  });
});

describe("photos.delete", () => {
  it("should require authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.photos.delete({
        id: 1,
      })
    ).rejects.toThrow();
  });

  it("should validate required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Missing required fields should throw validation error
    await expect(
      // @ts-expect-error - Testing invalid input
      caller.photos.delete({})
    ).rejects.toThrow();
  });

  it("should handle non-existent photo", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Non-existent photo should throw NOT_FOUND error
    await expect(
      caller.photos.delete({
        id: 999999,
      })
    ).rejects.toThrow("Photo not found");
  });
});
