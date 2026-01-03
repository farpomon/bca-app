import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getMunicipalities: vi.fn().mockResolvedValue([
    { id: 1, name: "Springfield", code: "SPR", state: "Illinois", country: "USA" },
    { id: 2, name: "Riverside", code: "RVS", state: "California", country: "USA" },
  ]),
  getMunicipalityById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({ id: 1, name: "Springfield", code: "SPR", state: "Illinois" });
    }
    return Promise.resolve(null);
  }),
  getProjects: vi.fn().mockResolvedValue([
    { id: 1, name: "Project A", projectNumber: "PRJ-001", status: "in_progress", municipalityId: 1 },
    { id: 2, name: "Project B", projectNumber: "PRJ-002", status: "draft", municipalityId: 2 },
  ]),
  getProjectById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({ id: 1, name: "Project A", projectNumber: "PRJ-001", status: "in_progress" });
    }
    return Promise.resolve(null);
  }),
  getProjectWithMunicipality: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        project: { id: 1, name: "Project A", projectNumber: "PRJ-001" },
        municipality: { id: 1, name: "Springfield" }
      });
    }
    return Promise.resolve(null);
  }),
  getAssets: vi.fn().mockResolvedValue([
    { asset: { id: 1, name: "City Hall", assetCode: "CH-001" }, category: { name: "Buildings" } },
    { asset: { id: 2, name: "Library", assetCode: "LIB-001" }, category: { name: "Buildings" } },
  ]),
  getAssetById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        asset: { id: 1, name: "City Hall", assetCode: "CH-001" },
        category: { name: "Buildings" },
        project: { id: 1, name: "Project A" }
      });
    }
    return Promise.resolve(null);
  }),
  getAssessmentsByAssetId: vi.fn().mockResolvedValue([
    { assessment: { id: 1, conditionRating: "3", assetId: 1 }, component: { name: "Roof" } },
  ]),
  getAssessmentById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        assessment: { id: 1, conditionRating: "3" },
        component: { name: "Roof" },
        asset: { name: "City Hall" }
      });
    }
    return Promise.resolve(null);
  }),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalMunicipalities: 3,
    totalProjects: 5,
    totalAssets: 85,
    totalAssessments: 82,
    conditionDistribution: [
      { condition: "good", count: 28 },
      { condition: "fair", count: 14 },
    ],
    projectStatusDistribution: [
      { status: "in_progress", count: 2 },
      { status: "draft", count: 1 },
    ]
  }),
  getAssetCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Buildings", code: "BLDG" },
  ]),
  getAssessmentComponents: vi.fn().mockResolvedValue([
    { id: 1, name: "Roof", code: "ROOF", category: "roofing" },
  ]),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("BCA Routers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("dashboard.stats", () => {
    it("returns dashboard statistics", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.stats();

      expect(result).toBeDefined();
      expect(result?.totalMunicipalities).toBe(3);
      expect(result?.totalProjects).toBe(5);
      expect(result?.totalAssets).toBe(85);
      expect(result?.totalAssessments).toBe(82);
    });
  });

  describe("municipalities", () => {
    it("lists all municipalities", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.municipalities.list();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Springfield");
    });

    it("gets municipality by id", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.municipalities.getById({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.name).toBe("Springfield");
    });

    it("returns null for non-existent municipality", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.municipalities.getById({ id: 999 });

      expect(result).toBeNull();
    });
  });

  describe("projects", () => {
    it("lists all projects", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.list();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Project A");
    });

    it("gets project by id", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.getById({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.name).toBe("Project A");
    });

    it("gets project with municipality", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.getWithMunicipality({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.project.name).toBe("Project A");
      expect(result?.municipality?.name).toBe("Springfield");
    });
  });

  describe("assets", () => {
    it("lists all assets", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assets.list();

      expect(result).toHaveLength(2);
      expect(result[0].asset.name).toBe("City Hall");
    });

    it("gets asset by id", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assets.getById({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.asset.name).toBe("City Hall");
    });
  });

  describe("assessments", () => {
    it("lists assessments by asset", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assessments.listByAsset({ assetId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].component?.name).toBe("Roof");
    });

    it("gets assessment by id", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.assessments.getById({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.assessment.conditionRating).toBe("3");
    });
  });
});
