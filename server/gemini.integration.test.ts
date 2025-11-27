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

describe("Gemini AI Integration in Assessment Workflow", () => {
  it("should analyze component image and return structured assessment", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a minimal 1x1 test image (red pixel PNG)
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    const result = await caller.photos.analyzeWithGemini({
      fileData: testImageBase64,
      componentCode: "B30",
      componentName: "Roofing",
      userNotes: "Test roofing component for AI analysis",
    });

    // Verify response structure
    expect(result).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.condition).toBeDefined();
    expect(result.recommendation).toBeDefined();

    // Verify condition is valid
    expect(["good", "fair", "poor", "not_assessed"]).toContain(result.condition);

    // Verify we got meaningful content
    expect(result.description.length).toBeGreaterThan(10);
    expect(result.recommendation.length).toBeGreaterThan(10);

    console.log("AI Analysis Result:");
    console.log("Condition:", result.condition);
    console.log("Description:", result.description);
    console.log("Recommendation:", result.recommendation);
  }, 30000); // 30 second timeout for API call

  it("should integrate AI analysis into complete assessment workflow", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. Create a project
    const project = await caller.projects.create({
      name: "AI Integration Test Project",
      address: "123 Test Street",
    });

    // 2. Analyze an image with AI
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    
    const aiAnalysis = await caller.photos.analyzeWithGemini({
      fileData: testImageBase64,
      componentCode: "D30",
      componentName: "HVAC",
      userNotes: "Testing HVAC system condition",
    });

    // 3. Create assessment using AI results
    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D30",
      condition: aiAnalysis.condition,
      observations: `${aiAnalysis.description}\n\nAI Recommendation: ${aiAnalysis.recommendation}`,
      reviewYear: new Date().getFullYear(),
    });

    // 4. Verify the assessment was created with AI data
    expect(assessment).toBeDefined();
    expect(assessment.id).toBeTypeOf("number");

    // 5. Retrieve and verify the assessment
    const projectAssessments = await caller.assessments.list({ projectId: project.id });
    expect(projectAssessments.length).toBe(1);
    expect(projectAssessments[0]?.condition).toBe(aiAnalysis.condition);
    expect(projectAssessments[0]?.observations).toContain(aiAnalysis.description);

    console.log("Complete workflow test passed!");
    console.log("AI-generated condition:", aiAnalysis.condition);
    console.log("Assessment saved with ID:", assessment.id);
  }, 35000); // 35 second timeout for complete workflow
});
