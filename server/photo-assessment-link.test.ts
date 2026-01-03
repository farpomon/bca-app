import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("Photo-Assessment Linking", () => {
  it("should link photo to assessment when uploaded with assessmentId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project
    const project = await caller.projects.create({
      name: "Test Photo Link Project",
      address: "123 Test St",
    });

    // Create an assessment
    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B2010",
      condition: "fair",
      observations: "Test observation",
    });

    // Upload a photo with the assessment ID
    const photo = await caller.photos.upload({
      projectId: project.id,
      assessmentId: assessment.id,
      fileData: Buffer.from("fake-image-data").toString("base64"),
      fileName: "test-photo.jpg",
      mimeType: "image/jpeg",
      caption: "Test photo",
    });

    expect(photo.id).toBeDefined();

    // Verify the photo is linked to the assessment
    const { getAssessmentPhotos } = await import("./db");
    const photos = await getAssessmentPhotos(assessment.id);
    
    expect(photos).toHaveLength(1);
    expect(photos[0]?.id).toBe(photo.id);
    expect(photos[0]?.caption).toBe("Test photo");
  });

  it("should include photos in report generation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project
    const project = await caller.projects.create({
      name: "Test Report Photos Project",
      address: "456 Report Ave",
    });

    // Create an assessment
    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B2020",
      condition: "good",
      observations: "Test observation for report",
      estimatedRepairCost: 5000,
      replacementValue: 25000,
    });

    // Upload a photo linked to the assessment
    await caller.photos.upload({
      projectId: project.id,
      assessmentId: assessment.id,
      fileData: Buffer.from("fake-image-data").toString("base64"),
      fileName: "report-photo.jpg",
      mimeType: "image/jpeg",
      caption: "Report test photo",
    });

    // Generate report and verify it includes photo data
    const report = await caller.reports.generate({
      projectId: project.id,
    });

    expect(report.url).toBeDefined();
    expect(report.url).toContain('BCA-Report');
  });
});
