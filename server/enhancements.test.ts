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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Photo Management", () => {
  it("should upload a photo with base64 data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project first
    const project = await caller.projects.create({
      name: "Photo Test Project",
      clientName: "Test Client",
      address: "123 Test St",
      status: "in_progress",
    });

    // Create a small test image (1x1 red pixel PNG)
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    const result = await caller.photos.upload({
      projectId: project.id,
      fileData: testImageBase64,
      fileName: "test-photo.png",
      mimeType: "image/png",
      caption: "Test photo caption",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("url");
    expect(typeof result.id).toBe("number");
    expect(typeof result.url).toBe("string");
  });

  it("should list photos for a project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Photo List Test",
      clientName: "Test Client",
      status: "in_progress",
    });

    const photos = await caller.photos.list({ projectId: project.id });
    expect(Array.isArray(photos)).toBe(true);
  });
});

describe("Report Generation", () => {
  it("should generate a PDF report for a project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Report Test Project",
      clientName: "Test Client",
      address: "456 Report Ave",
      status: "in_progress",
      yearBuilt: 2000,
      numberOfUnits: 10,
    });

    // Add an assessment
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "A10",
      condition: "good",
      observations: "Foundation in good condition",
    });

    // Add a deficiency
    await caller.deficiencies.create({
      projectId: project.id,
      componentCode: "B20",
      title: "Roof damage",
      description: "Minor shingle damage observed",
      severity: "medium",
      priority: "short_term",
      estimatedCost: 500000, // $5000 in cents
    });

    const result = await caller.reports.generate({ projectId: project.id });

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("fileKey");
    expect(typeof result.url).toBe("string");
    expect(result.url).toContain("http");
    expect(result.fileKey).toContain("reports/BCA-Report-");
  });
});

describe("Data Export", () => {
  it("should export deficiencies as CSV", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Export Test Project",
      clientName: "Test Client",
      status: "in_progress",
    });

    // Add deficiencies
    await caller.deficiencies.create({
      projectId: project.id,
      componentCode: "C10",
      title: "Wall crack",
      description: "Vertical crack in exterior wall",
      severity: "high",
      priority: "immediate",
      estimatedCost: 1000000,
    });

    const result = await caller.exports.deficiencies({ projectId: project.id });

    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("filename");
    expect(typeof result.csv).toBe("string");
    expect(result.csv).toContain("Component Code");
    expect(result.csv).toContain("C10");
    expect(result.csv).toContain("Wall crack");
    expect(result.filename).toContain("deficiencies-");
    expect(result.filename).toContain(".csv");
  });

  it("should export assessments as CSV", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Assessment Export Test",
      clientName: "Test Client",
      status: "in_progress",
    });

    // Add assessment
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D30",
      condition: "fair",
      observations: "Some wear and tear",
      remainingUsefulLife: 10,
      expectedUsefulLife: 20,
    });

    const result = await caller.exports.assessments({ projectId: project.id });

    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("filename");
    expect(typeof result.csv).toBe("string");
    expect(result.csv).toContain("Component Code");
    expect(result.csv).toContain("D30");
    expect(result.csv).toContain("fair");
    expect(result.filename).toContain("assessments-");
  });

  it("should export cost estimates as CSV", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Cost Export Test",
      clientName: "Test Client",
      status: "in_progress",
    });

    // Add deficiencies with costs
    await caller.deficiencies.create({
      projectId: project.id,
      componentCode: "E20",
      title: "HVAC replacement",
      severity: "medium",
      priority: "medium_term",
      estimatedCost: 1500000,
    });

    const result = await caller.exports.costs({ projectId: project.id });

    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("filename");
    expect(typeof result.csv).toBe("string");
    expect(result.csv).toContain("Priority");
    expect(result.csv).toContain("Estimated Cost");
    expect(result.filename).toContain("cost-estimates-");
  });
});

describe("Integration: Full Workflow", () => {
  it("should handle complete BCA workflow with all features", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. Create project
    const project = await caller.projects.create({
      name: "Complete Workflow Test",
      clientName: "Integration Test Client",
      address: "789 Integration Blvd",
      status: "in_progress",
      yearBuilt: 1995,
      numberOfUnits: 20,
    });

    expect(project).toHaveProperty("id");

    // 2. Add assessments
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "A10",
      condition: "good",
      observations: "Foundation solid",
    });

    // 3. Add deficiency
    const deficiency = await caller.deficiencies.create({
      projectId: project.id,
      componentCode: "B20",
      title: "Roof repair needed",
      description: "Multiple shingles damaged",
      severity: "high",
      priority: "immediate",
      estimatedCost: 750000,
    });

    expect(deficiency).toHaveProperty("id");

    // 4. Upload photo
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    const photo = await caller.photos.upload({
      projectId: project.id,
      deficiencyId: deficiency.id,
      fileData: testImageBase64,
      fileName: "deficiency-photo.png",
      mimeType: "image/png",
      caption: "Roof damage photo",
    });

    expect(photo).toHaveProperty("url");

    // 5. Generate report
    const report = await caller.reports.generate({ projectId: project.id });
    expect(report).toHaveProperty("url");

    // 6. Export data
    const deficienciesExport = await caller.exports.deficiencies({ projectId: project.id });
    expect(deficienciesExport.csv).toContain("Roof repair needed");

    const assessmentsExport = await caller.exports.assessments({ projectId: project.id });
    expect(assessmentsExport.csv).toContain("A10");

    const costsExport = await caller.exports.costs({ projectId: project.id });
    expect(costsExport.csv).toContain("$7500.00");

    // 7. Verify stats
    const stats = await caller.projects.stats({ projectId: project.id });
    expect(stats.deficiencies).toBe(1);
    expect(stats.assessments).toBe(1);
    expect(stats.photos).toBeGreaterThanOrEqual(1);
    expect(Number(stats.totalEstimatedCost)).toBe(750000);
  });
});
