/**
 * Dashboard page keys and their metadata
 * Shared between frontend and backend
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
export type PageSection = "main" | "analytics" | "sustainability" | "admin";

/**
 * Get page key from path
 */
export function getPageKeyFromPath(path: string): PageKey | undefined {
  for (const [key, value] of Object.entries(DASHBOARD_PAGES)) {
    if (value.path === path) {
      return key as PageKey;
    }
  }
  return undefined;
}

/**
 * Get pages by section
 */
export function getPagesBySection(section: PageSection): Array<{ key: PageKey; label: string; path: string }> {
  return Object.entries(DASHBOARD_PAGES)
    .filter(([_, value]) => value.section === section)
    .map(([key, value]) => ({
      key: key as PageKey,
      label: value.label,
      path: value.path,
    }));
}
