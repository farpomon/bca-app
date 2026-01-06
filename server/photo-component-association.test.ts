import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { assessments, photos } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
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
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Photo Component Association Fix", () => {
  let projectId: number;
  let assetId: number;
  let assessmentId: number;
  let assetPhotoId: number;
  let assessmentPhotoId: number;

  beforeAll(async () => {
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");

    // Find an existing project and asset from mock data
    const existingData = await database.execute<{ projectId: number; assetId: number }>(
      `SELECT p.id as projectId, a.id as assetId 
       FROM projects p 
       INNER JOIN assets a ON p.id = a.projectId 
       LIMIT 1`
    );
    
    if (!existingData || !existingData[0] || existingData[0].length === 0) {
      throw new Error("No existing project/asset found in database. Please run mock data generation first.");
    }

    projectId = existingData[0][0].projectId;
    assetId = existingData[0][0].assetId;

    // Create a photo linked to the asset only (simulating Photo Gallery upload)
    const assetPhotoResult = await database.insert(photos).values({
      projectId,
      assetId,
      assessmentId: null, // No assessment ID - this is the key!
      fileKey: `test/asset-photo-${Date.now()}.jpg`,
      url: `https://example.com/asset-photo-${Date.now()}.jpg`,
      caption: "Asset photo from gallery",
      mimeType: "image/jpeg",
      fileSize: 1024,
    });
    assetPhotoId = Number(assetPhotoResult[0].insertId);

    // Create an assessment for a component
    const assessmentResult = await database.insert(assessments).values({
      assetId,
      componentId: 30, // D30 - HVAC
      assessorId: 1,
      conditionRating: "3",
      conditionNotes: "Test observations for photo association",
      recommendedAction: "monitor",
    });
    assessmentId = Number(assessmentResult[0].insertId);

    // Create a photo linked to the assessment
    const assessmentPhotoResult = await database.insert(photos).values({
      projectId,
      assetId,
      assessmentId, // Linked to assessment
      fileKey: `test/assessment-photo-${Date.now()}.jpg`,
      url: `https://example.com/assessment-photo-${Date.now()}.jpg`,
      caption: "Assessment photo",
      mimeType: "image/jpeg",
      fileSize: 2048,
    });
    assessmentPhotoId = Number(assessmentPhotoResult[0].insertId);
  });

  it("should return photos linked to the assessment", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const photos = await caller.photos.byAssessment({
      assessmentId,
      projectId,
    });

    expect(photos).toBeDefined();
    expect(photos.length).toBeGreaterThanOrEqual(1);
    expect(photos.some((p) => p.id === assessmentPhotoId)).toBe(true);
  });

  it("should return photos linked to the asset (without assessment ID)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const photos = await caller.photos.byAsset({
      assetId,
      projectId,
    });

    expect(photos).toBeDefined();
    expect(photos.length).toBeGreaterThanOrEqual(1);
    // Should include the asset photo (no assessment ID)
    expect(photos.some((p) => p.id === assetPhotoId)).toBe(true);
  });

  it("should combine both assessment and asset photos without duplicates", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get both sets of photos
    const assessmentPhotos = await caller.photos.byAssessment({
      assessmentId,
      projectId,
    });

    const assetPhotos = await caller.photos.byAsset({
      assetId,
      projectId,
    });

    // Combine and deduplicate (simulating frontend logic)
    const allPhotos = [...assessmentPhotos, ...assetPhotos];
    const uniquePhotos = allPhotos.filter(
      (photo, index, self) => index === self.findIndex((p) => p.id === photo.id)
    );

    // Should have both photos
    expect(uniquePhotos.length).toBeGreaterThanOrEqual(2);
    expect(uniquePhotos.some((p) => p.id === assetPhotoId)).toBe(true);
    expect(uniquePhotos.some((p) => p.id === assessmentPhotoId)).toBe(true);
  });

  it("should show asset photos when creating a new assessment (no assessment ID)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // When creating a new assessment, we only query by asset
    const photos = await caller.photos.byAsset({
      assetId,
      projectId,
    });

    expect(photos).toBeDefined();
    expect(photos.length).toBeGreaterThanOrEqual(1);
    // Should include the asset photo from gallery
    expect(photos.some((p) => p.id === assetPhotoId)).toBe(true);
  });
});
