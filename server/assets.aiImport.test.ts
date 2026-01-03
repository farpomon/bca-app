import { describe, expect, it, vi } from "vitest";
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
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("assets.aiImport", () => {
  it("rejects non-PDF/Word files", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Mock a project that exists
    vi.mock("./db", () => ({
      getProjectById: vi.fn().mockResolvedValue({
        id: 1,
        name: "Test Project",
        company: "Test Company",
      }),
    }));

    await expect(
      caller.assets.aiImport({
        projectId: 1,
        fileContent: Buffer.from("test").toString("base64"),
        fileName: "test.txt",
        mimeType: "text/plain",
      })
    ).rejects.toThrow("Only PDF and Word documents are supported");
  });

  it("rejects files larger than 10MB", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a large file (11MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const base64Content = largeBuffer.toString("base64");

    await expect(
      caller.assets.aiImport({
        projectId: 1,
        fileContent: base64Content,
        fileName: "large.pdf",
        mimeType: "application/pdf",
      })
    ).rejects.toThrow("File size exceeds 10MB limit");
  });

  it("accepts valid PDF files", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Small valid PDF (just a few bytes for testing)
    const smallPdf = Buffer.from("PDF content");
    const base64Content = smallPdf.toString("base64");

    // This will fail at LLM stage, but should pass validation
    try {
      await caller.assets.aiImport({
        projectId: 1,
        fileContent: base64Content,
        fileName: "test.pdf",
        mimeType: "application/pdf",
      });
    } catch (error: any) {
      // Should not be a validation error
      expect(error.message).not.toContain("Only PDF and Word documents are supported");
      expect(error.message).not.toContain("File size exceeds 10MB limit");
    }
  });
});
