import { getDb } from "../db";
import { projects, assets, assessments, deficiencies, photos, companies } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Context retrieval service for AI chat
 * Fetches relevant data based on session type and user permissions
 */

interface ProjectContext {
  project: any;
  assessmentsSummary: {
    total: number;
    byCondition: Record<string, number>;
    avgCondition: string;
  };
  deficienciesSummary: {
    total: number;
    byPriority: Record<string, number>;
  };
  costSummary: {
    totalEstimatedCost: number;
    totalActualCost: number;
  };
  recentAssessments: any[];
  criticalDeficiencies: any[];
}

interface AssetContext {
  asset: any;
  assessments: any[];
  deficiencies: any[];
  photos: any[];
  conditionHistory: any[];
}

interface CompanyContext {
  company: any;
  projectsSummary: {
    total: number;
    byStatus: Record<string, number>;
  };
  portfolioHealth: {
    avgCondition: string;
    totalDeficiencies: number;
    totalCost: number;
  };
  recentActivity: any[];
}

/**
 * Get project-level context for AI chat
 */
export async function getProjectContext(projectId: number, userId: number, userCompanyId: number | null): Promise<ProjectContext | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get project with permission check
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.deletedAt, sql`NULL`)
      )
    )
    .limit(1);

  if (!project) return null;

  // Check company access (non-admins can only see their company's projects)
  if (userCompanyId && project.company !== String(userCompanyId)) {
    return null;
  }

  // Get assessments summary
  const assessmentStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      condition: assessments.condition,
    })
    .from(assessments)
    .where(eq(assessments.projectId, projectId))
    .groupBy(assessments.condition);

  const byCondition: Record<string, number> = {};
  let totalAssessments = 0;
  assessmentStats.forEach((stat) => {
    const count = Number(stat.total);
    byCondition[stat.condition || 'unknown'] = count;
    totalAssessments += count;
  });

  // Get deficiencies summary
  const deficiencyStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      priority: deficiencies.priority,
    })
    .from(deficiencies)
    .where(eq(deficiencies.projectId, projectId))
    .groupBy(deficiencies.priority);

  const byPriority: Record<string, number> = {};
  let totalDeficiencies = 0;
  deficiencyStats.forEach((stat) => {
    const count = Number(stat.total);
    byPriority[stat.priority || 'unknown'] = count;
    totalDeficiencies += count;
  });

  // Get cost summary
  const [costData] = await db
    .select({
      totalEstimated: sql<number>`SUM(${assessments.estimatedRepairCost})`,
      totalActual: sql<number>`SUM(${assessments.replacementValue})`,
    })
    .from(assessments)
    .where(eq(assessments.projectId, projectId));

  // Get recent assessments (last 10)
  const recentAssessments = await db
    .select()
    .from(assessments)
    .where(eq(assessments.projectId, projectId))
    .orderBy(sql`${assessments.assessedAt} DESC`)
    .limit(10);

  // Get critical deficiencies
  const criticalDeficiencies = await db
    .select()
    .from(deficiencies)
    .where(
      and(
        eq(deficiencies.projectId, projectId),
        eq(deficiencies.priority, 'immediate')
      )
    )
    .limit(20);

  return {
    project,
    assessmentsSummary: {
      total: totalAssessments,
      byCondition,
      avgCondition: calculateAvgCondition(byCondition),
    },
    deficienciesSummary: {
      total: totalDeficiencies,
      byPriority,
    },
    costSummary: {
      totalEstimatedCost: Number(costData?.totalEstimated || 0),
      totalActualCost: Number(costData?.totalActual || 0),
    },
    recentAssessments,
    criticalDeficiencies,
  };
}

/**
 * Get asset-level context for AI chat
 */
export async function getAssetContext(assetId: number, userId: number, userCompanyId: number | null): Promise<AssetContext | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get asset with project join for company check
  const [asset] = await db
    .select({
      asset: assets,
      projectCompany: projects.company,
    })
    .from(assets)
    .innerJoin(projects, eq(assets.projectId, projects.id))
    .where(eq(assets.id, assetId))
    .limit(1);

  if (!asset) return null;

  // Check company access (compare company name strings)
  // Note: userCompanyId is actually company name in this context
  if (userCompanyId && asset.projectCompany !== String(userCompanyId)) {
    return null;
  }

  // Get all assessments for this asset
  const assetAssessments = await db
    .select()
    .from(assessments)
    .where(and(
      eq(assessments.projectId, asset.asset.projectId),
      eq(assessments.assetId, assetId)
    ))
    .orderBy(sql`${assessments.assessedAt} DESC`);

  // Get all deficiencies for this asset
  const assetDeficiencies = await db
    .select()
    .from(deficiencies)
    .where(eq(deficiencies.projectId, asset.asset.projectId))
    .orderBy(sql`${deficiencies.createdAt} DESC`);

  // Get photos
  const assetPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.assetId, assetId))
    .orderBy(sql`${photos.createdAt} DESC`)
    .limit(50);

  // Build condition history
  const conditionHistory = assetAssessments.map((a) => ({
    date: a.assessedAt,
    condition: a.condition,
    notes: a.observations,
  }));

  return {
    asset: asset.asset,
    assessments: assetAssessments,
    deficiencies: assetDeficiencies,
    photos: assetPhotos,
    conditionHistory,
  };
}

/**
 * Get company-level context for AI chat (admin/manager only)
 */
export async function getCompanyContext(companyId: number, userId: number): Promise<CompanyContext | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get company
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) return null;

  // Get projects summary
  const projectStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      status: projects.status,
    })
    .from(projects)
    .where(
      and(        eq(projects.company, String(companyId)),        eq(projects.deletedAt, sql`NULL`)
      )
    )
    .groupBy(projects.status);

  const byStatus: Record<string, number> = {};
  let totalProjects = 0;
  projectStats.forEach((stat) => {
    const count = Number(stat.total);
    byStatus[stat.status || 'unknown'] = count;
    totalProjects += count;
  });

  // Get portfolio health metrics
  const [portfolioData] = await db
    .select({
      totalDeficiencies: sql<number>`COUNT(DISTINCT ${deficiencies.id})`,
      totalCost: sql<number>`SUM(${assessments.estimatedRepairCost})`,
    })
    .from(projects)
    .leftJoin(assessments, eq(projects.id, assessments.projectId))
    .leftJoin(deficiencies, eq(projects.id, deficiencies.projectId))
    .where(
      and(
        eq(projects.company, String(companyId)),
        eq(projects.deletedAt, sql`NULL`)
      )
    );

  // Get recent activity (recent assessments across all projects)
  const recentActivity = await db
    .select({
      assessment: assessments,
      projectName: projects.name,
    })
    .from(assessments)
    .innerJoin(projects, eq(assessments.projectId, projects.id))
    .where(
      and(
        eq(projects.company, String(companyId)),
        eq(projects.deletedAt, sql`NULL`)
      )
    )
    .orderBy(sql`${assessments.assessedAt} DESC`)
    .limit(20);

  return {
    company,
    projectsSummary: {
      total: totalProjects,
      byStatus,
    },
    portfolioHealth: {
      avgCondition: 'fair', // TODO: Calculate actual average
      totalDeficiencies: Number(portfolioData?.totalDeficiencies || 0),
      totalCost: Number(portfolioData?.totalCost || 0),
    },
    recentActivity,
  };
}

/**
 * Helper: Calculate average condition from distribution
 */
function calculateAvgCondition(byCondition: Record<string, number>): string {
  const weights: Record<string, number> = {
    good: 4,
    fair: 3,
    poor: 2,
    not_assessed: 0,
  };

  let totalWeight = 0;
  let totalCount = 0;

  Object.entries(byCondition).forEach(([condition, count]) => {
    const weight = weights[condition] || 0;
    totalWeight += weight * count;
    totalCount += count;
  });

  if (totalCount === 0) return 'not_assessed';

  const avg = totalWeight / totalCount;
  if (avg >= 3.5) return 'good';
  if (avg >= 2.5) return 'fair';
  return 'poor';
}
