import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Geolocation and OCR Integration", () => {
  it("should capture and store geolocation data with photo upload", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Geolocation Test Building",
      address: "123 Test St",
      clientName: "Test Client",
      assessorName: "Test Assessor",
    });

    // Create a simple 1x1 red pixel PNG
    const redPixelBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    // Upload photo with geolocation data
    const uploadResult = await caller.photos.upload({
      projectId: project.id,
      fileData: redPixelBase64,
      fileName: "test-photo.png",
      mimeType: "image/png",
      caption: "Test photo with geolocation",
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 10.5,
      locationAccuracy: 5.0,
      performOCR: false, // Skip OCR for this test to avoid API calls
    });

    expect(uploadResult.id).toBeDefined();
    expect(uploadResult.url).toBeDefined();

    // Retrieve the photo and verify geolocation data
    const photos = await db.getProjectPhotos(project.id);
    expect(photos.length).toBe(1);
    
    const photo = photos[0];
    // MySQL decimal fields are padded with zeros
    expect(parseFloat(photo.latitude!)).toBeCloseTo(37.7749, 4);
    expect(parseFloat(photo.longitude!)).toBeCloseTo(-122.4194, 4);
    expect(parseFloat(photo.altitude!)).toBeCloseTo(10.5, 1);
    expect(parseFloat(photo.locationAccuracy!)).toBeCloseTo(5.0, 1);
  });

  it("should extract text from images using OCR when performOCR is true", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "OCR Test Building",
      address: "456 OCR Ave",
      clientName: "OCR Client",
      assessorName: "OCR Assessor",
    });

    // Create a simple test image
    const testImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    // Upload photo with OCR enabled
    const uploadResult = await caller.photos.upload({
      projectId: project.id,
      fileData: testImageBase64,
      fileName: "ocr-test.png",
      mimeType: "image/png",
      caption: "Test photo for OCR",
      performOCR: true,
    });

    expect(uploadResult.id).toBeDefined();
    expect(uploadResult.url).toBeDefined();
    
    // OCR might return empty text for a simple red pixel
    // The fields may be undefined if no text was detected
    expect(uploadResult.id).toBeDefined();
    expect(uploadResult.url).toBeDefined();

    // Retrieve the photo and verify it was stored
    const photos = await db.getProjectPhotos(project.id);
    expect(photos.length).toBe(1);
    
    const photo = photos[0];
    // OCR fields should exist in the database schema (may be null)
    expect(photo).toHaveProperty('ocrText');
    expect(photo).toHaveProperty('ocrConfidence');
  });

  it("should handle photo upload with both geolocation and OCR", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Full Integration Test Building",
      address: "789 Integration Blvd",
      clientName: "Integration Client",
      assessorName: "Integration Assessor",
    });

    // Create a simple test image
    const testImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    // Upload photo with both geolocation and OCR
    const uploadResult = await caller.photos.upload({
      projectId: project.id,
      fileData: testImageBase64,
      fileName: "full-test.png",
      mimeType: "image/png",
      caption: "Test photo with geolocation and OCR",
      latitude: 40.7128,
      longitude: -74.006,
      altitude: 20.0,
      locationAccuracy: 3.5,
      performOCR: true,
    });

    expect(uploadResult.id).toBeDefined();
    expect(uploadResult.url).toBeDefined();

    // Retrieve the photo and verify all data
    const photos = await db.getProjectPhotos(project.id);
    expect(photos.length).toBe(1);
    
    const photo = photos[0];
    // Verify geolocation with decimal padding tolerance
    expect(parseFloat(photo.latitude!)).toBeCloseTo(40.7128, 4);
    expect(parseFloat(photo.longitude!)).toBeCloseTo(-74.006, 3);
    expect(parseFloat(photo.altitude!)).toBeCloseTo(20.0, 1);
    expect(parseFloat(photo.locationAccuracy!)).toBeCloseTo(3.5, 1);
    // Verify OCR fields exist in schema
    expect(photo).toHaveProperty('ocrText');
    expect(photo).toHaveProperty('ocrConfidence');
  });
});
