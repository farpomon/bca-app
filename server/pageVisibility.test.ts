import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { DASHBOARD_PAGES } from "./pageVisibilityDb";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createSuperAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "superadmin-user",
    email: "superadmin@example.com",
    name: "Super Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    company: null,
    city: null,
    accountStatus: "active",
    trialEndsAt: null,
    mfaRequired: 0,
    mfaEnforcedAt: null,
    mfaGracePeriodEnd: null,
    welcomeEmailSent: 0,
    welcomeEmailSentAt: null,
    companyId: 1,
    isSuperAdmin: 1,
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

function createRegularUserContext(companyId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    company: "Test Company",
    city: "Toronto",
    accountStatus: "active",
    trialEndsAt: null,
    mfaRequired: 0,
    mfaEnforcedAt: null,
    mfaGracePeriodEnd: null,
    welcomeEmailSent: 1,
    welcomeEmailSentAt: new Date(),
    companyId: companyId,
    isSuperAdmin: 0,
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

describe("pageVisibility router", () => {
  describe("getAvailablePages", () => {
    it("returns all dashboard pages", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const pages = await caller.pageVisibility.getAvailablePages();

      expect(pages).toBeDefined();
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThan(0);
      
      // Check that pages have required properties
      pages.forEach((page) => {
        expect(page).toHaveProperty("key");
        expect(page).toHaveProperty("label");
        expect(page).toHaveProperty("path");
        expect(page).toHaveProperty("section");
      });
    });

    it("includes all sections", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const pages = await caller.pageVisibility.getAvailablePages();
      const sections = new Set(pages.map((p) => p.section));

      expect(sections.has("main")).toBe(true);
      expect(sections.has("analytics")).toBe(true);
      expect(sections.has("sustainability")).toBe(true);
      expect(sections.has("admin")).toBe(true);
    });
  });

  describe("getMyCompanyPageVisibility", () => {
    it("returns default visibility (all visible) for user without company", async () => {
      const ctx = createRegularUserContext();
      ctx.user!.companyId = null;
      const caller = appRouter.createCaller(ctx);

      const settings = await caller.pageVisibility.getMyCompanyPageVisibility();

      expect(settings).toBeDefined();
      // All pages should be visible by default
      Object.keys(DASHBOARD_PAGES).forEach((key) => {
        expect(settings[key]).toBe(true);
      });
    });

    it("returns visibility settings for user with company", async () => {
      const ctx = createRegularUserContext(1);
      const caller = appRouter.createCaller(ctx);

      const settings = await caller.pageVisibility.getMyCompanyPageVisibility({ companyId: 1 });

      expect(settings).toBeDefined();
      expect(typeof settings).toBe("object");
    });
  });

  describe("getCompanyPageVisibility (superadmin only)", () => {
    it("allows superadmin to view company page visibility", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const settings = await caller.pageVisibility.getCompanyPageVisibility({ companyId: 1 });

      expect(settings).toBeDefined();
      expect(typeof settings).toBe("object");
    });

    it("denies regular user from viewing company page visibility", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pageVisibility.getCompanyPageVisibility({ companyId: 1 })
      ).rejects.toThrow("Only super admins can view page visibility settings");
    });
  });

  describe("setPageVisibility (superadmin only)", () => {
    it("allows superadmin to set page visibility", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pageVisibility.setPageVisibility({
        companyId: 1,
        pageKey: "rsmeans",
        isVisible: false,
      });

      expect(result).toEqual({ success: true });
    });

    it("denies regular user from setting page visibility", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pageVisibility.setPageVisibility({
          companyId: 1,
          pageKey: "rsmeans",
          isVisible: false,
        })
      ).rejects.toThrow("Only super admins can modify page visibility settings");
    });

    it("rejects invalid page key", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pageVisibility.setPageVisibility({
          companyId: 1,
          pageKey: "invalid-page-key",
          isVisible: false,
        })
      ).rejects.toThrow("Invalid page key");
    });
  });

  describe("bulkSetPageVisibility (superadmin only)", () => {
    it("allows superadmin to bulk set page visibility", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pageVisibility.bulkSetPageVisibility({
        companyId: 1,
        settings: {
          rsmeans: false,
          esgDashboard: true,
          portfolioAnalytics: false,
        },
      });

      expect(result).toEqual({ success: true });
    });

    it("denies regular user from bulk setting page visibility", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pageVisibility.bulkSetPageVisibility({
          companyId: 1,
          settings: {
            rsmeans: false,
          },
        })
      ).rejects.toThrow("Only super admins can modify page visibility settings");
    });

    it("rejects if any page key is invalid", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pageVisibility.bulkSetPageVisibility({
          companyId: 1,
          settings: {
            rsmeans: false,
            "invalid-key": true,
          },
        })
      ).rejects.toThrow("Invalid page key");
    });
  });

  describe("getAllCompaniesPageVisibility (superadmin only)", () => {
    it("allows superadmin to view all companies page visibility", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pageVisibility.getAllCompaniesPageVisibility();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("denies regular user from viewing all companies page visibility", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pageVisibility.getAllCompaniesPageVisibility()
      ).rejects.toThrow("Only super admins can view all companies' page visibility");
    });
  });

  describe("initializeCompanyPages (superadmin only)", () => {
    it("allows superadmin to initialize company pages", async () => {
      const ctx = createSuperAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pageVisibility.initializeCompanyPages({ companyId: 999 });

      expect(result).toEqual({ success: true });
    });

    it("denies regular user from initializing company pages", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.pageVisibility.initializeCompanyPages({ companyId: 999 })
      ).rejects.toThrow("Only super admins can initialize page visibility");
    });
  });
});

describe("DASHBOARD_PAGES constant", () => {
  it("has all required page keys", () => {
    const expectedKeys = [
      "projects",
      "rsmeans",
      "deletedProjects",
      "portfolioAnalytics",
      "portfolioBi",
      "predictions",
      "prioritization",
      "capitalBudget",
      "portfolioReport",
      "esgDashboard",
      "esgLeed",
      "aiCarbonRecommendations",
      "leedComplianceReport",
      "sustainability",
      "carbonFootprint",
      "admin",
      "buildingTemplates",
      "bulkServiceLife",
      "compliance",
      "dataSecurity",
      "auditTrail",
      "economicIndicators",
      "portfolioTargets",
    ];

    expectedKeys.forEach((key) => {
      expect(DASHBOARD_PAGES).toHaveProperty(key);
    });
  });

  it("each page has required properties", () => {
    Object.entries(DASHBOARD_PAGES).forEach(([key, page]) => {
      expect(page).toHaveProperty("label");
      expect(page).toHaveProperty("path");
      expect(page).toHaveProperty("section");
      expect(typeof page.label).toBe("string");
      expect(typeof page.path).toBe("string");
      expect(["main", "analytics", "sustainability", "admin"]).toContain(page.section);
    });
  });
});
