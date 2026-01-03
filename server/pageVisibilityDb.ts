import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { companyPageVisibility, InsertCompanyPageVisibility } from "../drizzle/schema";

/**
 * Available dashboard pages that can be toggled
 * Each page has a key (used in database) and display info
 */
export const DASHBOARD_PAGES = {
  // Main navigation
  projects: { label: "Projects", path: "/", section: "main" },
  rsmeans: { label: "RSMeans Cost Data", path: "/rsmeans", section: "main" },
  deletedProjects: { label: "Deleted Projects", path: "/deleted-projects", section: "main" },
  
  // Analytics & Reports
  portfolioAnalytics: { label: "Portfolio Analytics", path: "/portfolio-analytics", section: "analytics" },
  portfolioBi: { label: "Portfolio BI", path: "/portfolio-bi", section: "analytics" },
  predictions: { label: "Predictions", path: "/predictions", section: "analytics" },
  prioritization: { label: "Prioritization", path: "/prioritization", section: "analytics" },
  capitalBudget: { label: "Capital Budget", path: "/capital-budget", section: "analytics" },
  portfolioReport: { label: "Portfolio Report", path: "/portfolio-report", section: "analytics" },
  
  // Sustainability & ESG
  esgDashboard: { label: "ESG Dashboard", path: "/esg-dashboard", section: "sustainability" },
  esgLeed: { label: "ESG & LEED", path: "/esg-leed", section: "sustainability" },
  aiCarbonRecommendations: { label: "AI Carbon Recommendations", path: "/ai-carbon-recommendations", section: "sustainability" },
  leedComplianceReport: { label: "LEED Compliance Report", path: "/leed-compliance-report", section: "sustainability" },
  sustainability: { label: "Sustainability", path: "/sustainability", section: "sustainability" },
  carbonFootprint: { label: "Carbon Footprint", path: "/carbon-footprint", section: "sustainability" },
  
  // Admin (these are typically only for admins, but can still be controlled)
  admin: { label: "Admin Dashboard", path: "/admin", section: "admin" },
  buildingTemplates: { label: "Building Templates", path: "/admin/building-templates", section: "admin" },
  bulkServiceLife: { label: "Bulk Service Life", path: "/admin/bulk-service-life-updates", section: "admin" },
  compliance: { label: "Compliance", path: "/admin/compliance", section: "admin" },
  dataSecurity: { label: "Data Security", path: "/admin/data-security", section: "admin" },
  auditTrail: { label: "Audit Trail", path: "/admin/audit-trail", section: "admin" },
  economicIndicators: { label: "Economic Indicators", path: "/admin/economic-indicators", section: "admin" },
  portfolioTargets: { label: "Portfolio Targets", path: "/admin/portfolio-targets", section: "admin" },
} as const;

export type PageKey = keyof typeof DASHBOARD_PAGES;

/**
 * Get all page visibility settings for a company
 */
export async function getCompanyPageVisibility(companyId: number): Promise<Record<string, boolean>> {
  const db = await getDb();
  if (!db) return {};

  const settings = await db
    .select()
    .from(companyPageVisibility)
    .where(eq(companyPageVisibility.companyId, companyId));

  // Convert to a map of pageKey -> isVisible
  const visibilityMap: Record<string, boolean> = {};
  
  // Default all pages to visible
  for (const key of Object.keys(DASHBOARD_PAGES)) {
    visibilityMap[key] = true;
  }
  
  // Override with database settings
  for (const setting of settings) {
    visibilityMap[setting.pageKey] = setting.isVisible === 1;
  }

  return visibilityMap;
}

/**
 * Get visibility for a specific page in a company
 */
export async function isPageVisibleForCompany(companyId: number, pageKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // Default to visible if DB unavailable

  const setting = await db
    .select()
    .from(companyPageVisibility)
    .where(
      and(
        eq(companyPageVisibility.companyId, companyId),
        eq(companyPageVisibility.pageKey, pageKey)
      )
    )
    .limit(1);

  // If no setting exists, default to visible
  if (setting.length === 0) return true;
  
  return setting[0].isVisible === 1;
}

/**
 * Set visibility for a specific page in a company
 */
export async function setPageVisibility(
  companyId: number,
  pageKey: string,
  isVisible: boolean,
  updatedBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if setting already exists
  const existing = await db
    .select()
    .from(companyPageVisibility)
    .where(
      and(
        eq(companyPageVisibility.companyId, companyId),
        eq(companyPageVisibility.pageKey, pageKey)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing setting
    await db
      .update(companyPageVisibility)
      .set({ 
        isVisible: isVisible ? 1 : 0,
        updatedBy 
      })
      .where(eq(companyPageVisibility.id, existing[0].id));
  } else {
    // Insert new setting
    await db.insert(companyPageVisibility).values({
      companyId,
      pageKey,
      isVisible: isVisible ? 1 : 0,
      updatedBy,
    });
  }
}

/**
 * Bulk update page visibility for a company
 */
export async function bulkSetPageVisibility(
  companyId: number,
  settings: Record<string, boolean>,
  updatedBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const [pageKey, isVisible] of Object.entries(settings)) {
    await setPageVisibility(companyId, pageKey, isVisible, updatedBy);
  }
}

/**
 * Get all companies with their page visibility settings
 * For superadmin overview
 */
export async function getAllCompaniesPageVisibility(): Promise<Array<{
  companyId: number;
  settings: Record<string, boolean>;
}>> {
  const db = await getDb();
  if (!db) return [];

  const allSettings = await db.select().from(companyPageVisibility);

  // Group by company
  const byCompany = new Map<number, Record<string, boolean>>();
  
  for (const setting of allSettings) {
    if (!byCompany.has(setting.companyId)) {
      // Initialize with all pages visible
      const defaultSettings: Record<string, boolean> = {};
      for (const key of Object.keys(DASHBOARD_PAGES)) {
        defaultSettings[key] = true;
      }
      byCompany.set(setting.companyId, defaultSettings);
    }
    byCompany.get(setting.companyId)![setting.pageKey] = setting.isVisible === 1;
  }

  return Array.from(byCompany.entries()).map(([companyId, settings]) => ({
    companyId,
    settings,
  }));
}

/**
 * Initialize default page visibility for a new company
 * All pages are visible by default
 */
export async function initializeCompanyPageVisibility(
  companyId: number,
  updatedBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert default settings for all pages (all visible)
  for (const pageKey of Object.keys(DASHBOARD_PAGES)) {
    await db.insert(companyPageVisibility).values({
      companyId,
      pageKey,
      isVisible: 1,
      updatedBy,
    });
  }
}
