import { describe, it, expect } from "vitest";
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
    role: "user",
    company: "test-company",
    companyId: 1,
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

  return { ctx };
}

describe("Report Generation with Photos", () => {
  it("should fetch assessment photos when generating report", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Test Building with Photos",
      address: "123 Test St",
      clientName: "Test Client",
    });

    // Create an assessment
    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B2010",
      condition: "fair",
      observations: "Test observation",
      recommendations: "Test recommendation",
      estimatedRepairCost: 5000,
      replacementValue: 20000,
      actionYear: 2026,
    });

    // Add a photo to the assessment
    // Create a simple 1x1 pixel JPEG for testing
    const testImageBase64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
    const photo = await caller.photos.upload({
      projectId: project.id,
      assessmentId: assessment.id,
      fileData: testImageBase64,
      fileName: "test-photo.jpg",
      mimeType: "image/jpeg",
      caption: "Test photo caption",
    });

    // Generate report
    const report = await caller.reports.generate({ projectId: project.id });

    // Verify report was generated
    expect(report).toBeDefined();
    expect(report.url).toBeTruthy();
    expect(report.fileKey).toContain("BCA-Report");

    console.log("✅ Report with photos generated successfully!");
    console.log(`   Report URL: ${report.url}`);
    console.log(`   Assessment ID: ${assessment.id}`);
    console.log(`   Photo ID: ${photo.id}`);
  });
});
