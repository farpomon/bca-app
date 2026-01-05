import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
  }),
  getProjectById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test Project",
    address: "123 Test St",
  }),
  getProjectAssessments: vi.fn().mockResolvedValue([]),
  getProjectDeficiencies: vi.fn().mockResolvedValue([]),
  getProjectAssets: vi.fn().mockResolvedValue([]),
  getAssessmentPhotos: vi.fn().mockResolvedValue([]),
  getProjectFCI: vi.fn().mockResolvedValue({
    fci: 15,
    rating: "Good",
    totalRepairCost: 50000,
    totalReplacementValue: 1000000,
  }),
}));

vi.mock("../dashboardData", () => ({
  getFinancialPlanningData: vi.fn().mockResolvedValue({}),
  getConditionMatrixData: vi.fn().mockResolvedValue({}),
}));

vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://storage.example.com/report.pdf",
    key: "report.pdf",
  }),
}));

vi.mock("../services/reportGenerator.service", () => ({
  ReportGeneratorService: vi.fn().mockImplementation(() => ({
    generateReport: vi.fn().mockResolvedValue({
      buffer: Buffer.from("test"),
      fileName: "test_report.pdf",
      mimeType: "application/pdf",
      fileSize: 4,
    }),
  })),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
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
    companyId: 1,
    company: "Test Company",
    isSuperAdmin: 0,
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
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

describe("customReports router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefaultTemplates", () => {
    it("returns default template options for authenticated users", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customReports.getDefaultTemplates();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check first template structure
      const firstTemplate = result[0];
      expect(firstTemplate).toHaveProperty("id");
      expect(firstTemplate).toHaveProperty("name");
      expect(firstTemplate).toHaveProperty("description");
      expect(firstTemplate).toHaveProperty("type");
      expect(firstTemplate).toHaveProperty("sections");
      expect(Array.isArray(firstTemplate.sections)).toBe(true);
    });

    it("includes executive summary template", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customReports.getDefaultTemplates();

      const execSummary = result.find(t => t.id === "executive-summary");
      expect(execSummary).toBeDefined();
      expect(execSummary?.type).toBe("executive_summary");
    });

    it("includes detailed assessment template", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customReports.getDefaultTemplates();

      const detailed = result.find(t => t.id === "detailed-assessment");
      expect(detailed).toBeDefined();
      expect(detailed?.type).toBe("detailed_assessment");
    });

    it("includes financial analysis template", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customReports.getDefaultTemplates();

      const financial = result.find(t => t.id === "financial-analysis");
      expect(financial).toBeDefined();
      expect(financial?.type).toBe("financial_analysis");
    });

    it("rejects unauthenticated requests", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customReports.getDefaultTemplates()).rejects.toThrow();
    });
  });

  describe("templates.list", () => {
    it("returns templates for authenticated users", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // The mock returns an empty array from the database query
      // This test verifies the endpoint is callable and returns a result
      const result = await caller.customReports.templates.list({});

      expect(result).toBeDefined();
      // Result could be array or object depending on mock behavior
      // Main assertion is that it doesn't throw
    });

    it("rejects unauthenticated requests", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customReports.templates.list({})).rejects.toThrow();
    });
  });

  describe("section types validation", () => {
    it("validates section type enum values", async () => {
      const validSectionTypes = [
        'narrative',
        'data_table',
        'chart',
        'photo_gallery',
        'cost_summary',
        'executive_summary',
        'condition_summary',
        'deficiencies_list',
        'component_details',
        'risk_assessment',
        'recommendations',
        'appendix',
      ];

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customReports.getDefaultTemplates();

      // All sections in default templates should have valid types
      for (const template of result) {
        for (const section of template.sections) {
          expect(validSectionTypes).toContain(section.sectionType);
        }
      }
    });
  });

  describe("report type validation", () => {
    it("validates report type enum values", async () => {
      const validReportTypes = [
        'executive_summary',
        'detailed_assessment',
        'financial_analysis',
        'compliance',
        'risk_assessment',
        'optimization_results',
        'custom',
      ];

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customReports.getDefaultTemplates();

      // All default templates should have valid types
      for (const template of result) {
        expect(validReportTypes).toContain(template.type);
      }
    });
  });
});
