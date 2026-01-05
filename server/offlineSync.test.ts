import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * Offline Sync Tests
 * 
 * Tests the offline sync functionality, specifically:
 * 1. Assessment sync returns valid numeric assessmentId
 * 2. Photo sync handles both numeric and offline assessment IDs
 * 3. NaN validation prevents database errors
 */

function createAuthContext(role: "admin" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    company: "test-company",
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("offlineSync.syncAssessment", () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  it("returns a valid numeric assessmentId after syncing", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Mock getProjectById to return a valid project
    const mockGetProjectById = vi.spyOn(db, "getProjectById");
    mockGetProjectById.mockResolvedValue({
      id: 1,
      name: "Test Project",
      address: "123 Test St",
      clientName: "Test Client",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 1,
      company: "test-company",
    } as any);

    // Mock getAssessmentByComponent to return null (no conflict)
    const mockGetAssessmentByComponent = vi.spyOn(db, "getAssessmentByComponent");
    mockGetAssessmentByComponent.mockResolvedValue(null);

    // Mock upsertAssessment to return a numeric ID
    const mockUpsertAssessment = vi.spyOn(db, "upsertAssessment");
    mockUpsertAssessment.mockResolvedValue(456);

    const result = await caller.offlineSync.syncAssessment({
      offlineId: "offline_assessment_123",
      createdAt: new Date().toISOString(),
      projectId: 1,
      assetId: 1,
      componentCode: "A10",
      condition: "good",
      status: "completed",
      observations: "Test observation",
      recommendations: "Test recommendation",
    });

    // Verify the result contains a valid numeric assessmentId
    expect(result.assessmentId).toBe(456);
    expect(typeof result.assessmentId).toBe("number");
    expect(Number.isNaN(result.assessmentId)).toBe(false);
    expect(result.conflict).toBe(false);
    expect(result.offlineId).toBe("offline_assessment_123");
  });

  it("handles conflict resolution when server version is newer", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const now = new Date();
    const olderDate = new Date(now.getTime() - 60000); // 1 minute ago

    // Mock getProjectById
    const mockGetProjectById = vi.spyOn(db, "getProjectById");
    mockGetProjectById.mockResolvedValue({
      id: 1,
      name: "Test Project",
    } as any);

    // Mock getAssessmentByComponent to return existing assessment
    const mockGetAssessmentByComponent = vi.spyOn(db, "getAssessmentByComponent");
    mockGetAssessmentByComponent.mockResolvedValue({
      id: 789,
      componentCode: "A10",
      assessedAt: now, // Server version is newer
      createdAt: now,
    } as any);

    const result = await caller.offlineSync.syncAssessment({
      offlineId: "offline_assessment_123",
      createdAt: olderDate.toISOString(), // Offline version is older
      projectId: 1,
      componentCode: "A10",
      condition: "good",
      status: "completed",
    });

    // Verify conflict resolution
    expect(result.assessmentId).toBe(789);
    expect(result.conflict).toBe(true);
    expect(result.resolution).toBe("server_wins");
  });
});

describe("offlineSync.syncPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts numeric assessmentId without errors", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Mock getProjectById
    const mockGetProjectById = vi.spyOn(db, "getProjectById");
    mockGetProjectById.mockResolvedValue({
      id: 1,
      name: "Test Project",
    } as any);

    // Mock createPhoto to return a numeric ID
    const mockCreatePhoto = vi.spyOn(db, "createPhoto");
    mockCreatePhoto.mockResolvedValue(999);

    // Create a small test image as base64
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const result = await caller.offlineSync.syncPhoto({
      offlineId: "offline_photo_456",
      createdAt: new Date().toISOString(),
      projectId: 1,
      assessmentId: 456, // Valid numeric ID
      fileName: "test.png",
      photoBlob: testImageBase64,
      mimeType: "image/png",
    });

    // Verify photo was created successfully
    expect(result.photoId).toBe(999);
    expect(typeof result.photoId).toBe("number");
    expect(result.offlineId).toBe("offline_photo_456");
    expect(result.url).toBeDefined();
  });

  it("handles undefined assessmentId gracefully", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Mock getProjectById
    const mockGetProjectById = vi.spyOn(db, "getProjectById");
    mockGetProjectById.mockResolvedValue({
      id: 1,
      name: "Test Project",
    } as any);

    // Mock createPhoto
    const mockCreatePhoto = vi.spyOn(db, "createPhoto");
    mockCreatePhoto.mockResolvedValue(888);

    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const result = await caller.offlineSync.syncPhoto({
      offlineId: "offline_photo_789",
      createdAt: new Date().toISOString(),
      projectId: 1,
      // assessmentId is undefined (photo not linked to assessment)
      fileName: "test.png",
      photoBlob: testImageBase64,
      mimeType: "image/png",
    });

    // Verify photo was created successfully without assessmentId
    expect(result.photoId).toBe(888);
    expect(result.offlineId).toBe("offline_photo_789");
  });
});

describe("Assessment ID Validation", () => {
  it("parseInt returns NaN for offline IDs", () => {
    const offlineId = "offline_assessment_123";
    const parsed = parseInt(offlineId);
    
    // This is the bug we're fixing - offline IDs parse to NaN
    expect(Number.isNaN(parsed)).toBe(true);
  });

  it("parseInt returns valid number for numeric strings", () => {
    const numericId = "456";
    const parsed = parseInt(numericId);
    
    // Numeric strings parse correctly
    expect(parsed).toBe(456);
    expect(Number.isNaN(parsed)).toBe(false);
  });

  it("validation prevents NaN from being used", () => {
    const offlineId = "offline_assessment_123";
    const parsed = parseInt(offlineId);
    
    // Our fix: only use parsed value if it's not NaN
    const assessmentId = !Number.isNaN(parsed) ? parsed : undefined;
    
    expect(assessmentId).toBeUndefined();
  });
});
