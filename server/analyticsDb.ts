import { eq, and, gte, lte, sql, desc, count, sum, avg } from "drizzle-orm";
import { getDb } from "./db";
import { 
  assessments, 
  deficiencies, 
  projects, 
  assets,
  companies 
} from "../drizzle/schema";

/**
 * Analytics Database Helper
 * Provides aggregation queries for dashboard analytics
 */

export interface ConditionDistribution {
  condition: string;
  count: number;
  percentage: number;
}

export interface AssessmentTrend {
  month: string;
  count: number;
  avgConditionScore: number;
}

export interface DeficiencyPriorityBreakdown {
  priority: string;
  count: number;
  totalCost: number;
}

export interface CostAnalysis {
  totalRepairCost: number;
  totalReplacementCost: number;
  avgRepairCost: number;
  avgReplacementCost: number;
  assessmentCount: number;
}

export interface ComponentAnalysis {
  componentCode: string;
  componentName: string;
  assessmentCount: number;
  avgConditionScore: number;
  totalRepairCost: number;
  totalReplacementCost: number;
}

export interface ProjectAnalytics {
  projectId: number;
  projectName: string;
  assetCount: number;
  assessmentCount: number;
  deficiencyCount: number;
  totalRepairCost: number;
  avgConditionScore: number;
}

export interface CompanyAnalytics {
  companyId: number;
  companyName: string;
  projectCount: number;
  assetCount: number;
  assessmentCount: number;
  deficiencyCount: number;
  totalRepairCost: number;
}

/**
 * Get condition distribution across all assessments
 */
export async function getConditionDistribution(
  filters?: {
    projectId?: number;
    companyId?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<ConditionDistribution[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = ['good', 'fair', 'poor', 'not_assessed'] as const;
  
  let query = db
    .select({
      condition: assessments.condition,
      count: count(),
    })
    .from(assessments);

  // Apply filters
  const whereConditions = [];
  if (filters?.projectId) {
    query = query.innerJoin(assets, eq(assessments.assetId, assets.id));
    whereConditions.push(eq(assets.projectId, filters.projectId));
  }
  if (filters?.companyId) {
    query = query
      .innerJoin(assets, eq(assessments.assetId, assets.id))
      .innerJoin(projects, eq(assets.projectId, projects.id));
    whereConditions.push(eq(projects.companyId, filters.companyId));
  }
  if (filters?.startDate) {
    whereConditions.push(gte(assessments.assessmentDate, filters.startDate));
  }
  if (filters?.endDate) {
    whereConditions.push(lte(assessments.assessmentDate, filters.endDate));
  }

  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions));
  }

  const results = await query.groupBy(assessments.condition);

  const total = results.reduce((acc, r) => acc + Number(r.count), 0);
  
  return results.map(r => ({
    condition: r.condition || 'not_assessed',
    count: Number(r.count),
    percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
  }));
}

/**
 * Get assessment trends over time (monthly)
 */
export async function getAssessmentTrends(
  filters?: {
    projectId?: number;
    companyId?: number;
    months?: number; // Default 12
  }
): Promise<AssessmentTrend[]> {
  const db = await getDb();
  if (!db) return [];

  const monthsBack = filters?.months || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  let query = db
    .select({
      month: sql<string>`DATE_FORMAT(${assessments.assessedAt}, '%Y-%m')`,
      count: count(),
      avgScore: avg(sql`CASE 
        WHEN ${assessments.condition} = 'good' THEN 4
        WHEN ${assessments.condition} = 'fair' THEN 3
        WHEN ${assessments.condition} = 'poor' THEN 2
        ELSE 1
      END`),
    })
    .from(assessments)
    .where(gte(assessments.assessedAt, startDate.toISOString()));

  // Apply filters
  if (filters?.projectId) {
    query = query
      .innerJoin(assets, eq(assessments.assetId, assets.id))
      .where(and(
        gte(assessments.assessedAt, startDate.toISOString()),
        eq(assets.projectId, filters.projectId)
      ));
  }
  if (filters?.companyId) {
    query = query
      .innerJoin(assets, eq(assessments.assetId, assets.id))
      .innerJoin(projects, eq(assets.projectId, projects.id))
      .where(and(
        gte(assessments.assessedAt, startDate.toISOString()),
        eq(projects.companyId, filters.companyId)
      ));
  }

  const results = await query
    .groupBy(sql`DATE_FORMAT(${assessments.assessedAt}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${assessments.assessedAt}, '%Y-%m')`);

  return results.map(r => ({
    month: r.month,
    count: Number(r.count),
    avgConditionScore: Number(r.avgScore || 0),
  }));
}

/**
 * Get deficiency priority breakdown
 * Note: Deficiencies now have a direct projectId field, so we can filter directly
 * without needing to join through assessments/assets
 */
export async function getDeficiencyPriorityBreakdown(
  filters?: {
    projectId?: number;
    companyId?: number;
  }
): Promise<DeficiencyPriorityBreakdown[]> {
  const db = await getDb();
  if (!db) return [];

  // Build where conditions
  const whereConditions = [];
  
  // Filter by projectId directly on deficiencies table
  if (filters?.projectId) {
    whereConditions.push(eq(deficiencies.projectId, filters.projectId));
  }
  
  // For companyId filter, we need to join with projects
  if (filters?.companyId) {
    const query = db
      .select({
        priority: deficiencies.priority,
        count: count(),
        totalCost: sum(deficiencies.estimatedCost),
      })
      .from(deficiencies)
      .innerJoin(projects, eq(deficiencies.projectId, projects.id))
      .where(eq(projects.companyId, filters.companyId))
      .groupBy(deficiencies.priority);
    
    const results = await query;
    return results.map(r => ({
      priority: r.priority || 'medium_term',
      count: Number(r.count),
      totalCost: Number(r.totalCost || 0),
    }));
  }

  // Simple query with optional projectId filter
  let query = db
    .select({
      priority: deficiencies.priority,
      count: count(),
      totalCost: sum(deficiencies.estimatedCost),
    })
    .from(deficiencies);

  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions));
  }

  const results = await query.groupBy(deficiencies.priority);

  return results.map(r => ({
    priority: r.priority || 'medium_term',
    count: Number(r.count),
    totalCost: Number(r.totalCost || 0),
  }));
}

/**
 * Get cost analysis summary
 */
export async function getCostAnalysis(
  filters?: {
    projectId?: number;
    companyId?: number;
  }
): Promise<CostAnalysis> {
  const db = await getDb();
  if (!db) {
    return {
      totalRepairCost: 0,
      totalReplacementCost: 0,
      avgRepairCost: 0,
      avgReplacementCost: 0,
      assessmentCount: 0,
    };
  }

  let query = db
    .select({
      totalRepair: sum(assessments.estimatedRepairCost),
      totalReplacement: sum(assessments.replacementValue),
      avgRepair: avg(assessments.estimatedRepairCost),
      avgReplacement: avg(assessments.replacementValue),
      count: count(),
    })
    .from(assessments);

  // Apply filters
  const whereConditions = [];
  if (filters?.projectId) {
    query = query.innerJoin(assets, eq(assessments.assetId, assets.id));
    whereConditions.push(eq(assets.projectId, filters.projectId));
  }
  if (filters?.companyId) {
    query = query
      .innerJoin(assets, eq(assessments.assetId, assets.id))
      .innerJoin(projects, eq(assets.projectId, projects.id));
    whereConditions.push(eq(projects.companyId, filters.companyId));
  }

  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions));
  }

  const results = await query;
  const result = results[0];

  return {
    totalRepairCost: Number(result?.totalRepair || 0),
    totalReplacementCost: Number(result?.totalReplacement || 0),
    avgRepairCost: Number(result?.avgRepair || 0),
    avgReplacementCost: Number(result?.avgReplacement || 0),
    assessmentCount: Number(result?.count || 0),
  };
}

/**
 * Get component-level analytics (UNIFORMAT II breakdown)
 */
export async function getComponentAnalysis(
  filters?: {
    projectId?: number;
    companyId?: number;
  }
): Promise<ComponentAnalysis[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      componentCode: assessments.componentCode,
      componentName: assessments.componentName,
      count: count(),
      avgScore: avg(sql`CASE 
        WHEN ${assessments.condition} = 'good' THEN 4
        WHEN ${assessments.condition} = 'fair' THEN 3
        WHEN ${assessments.condition} = 'poor' THEN 2
        ELSE 1
      END`),
      totalRepair: sum(assessments.repairCost),
      totalReplacement: sum(assessments.replacementCost),
    })
    .from(assessments);

  // Apply filters
  const whereConditions = [];
  if (filters?.projectId) {
    query = query.innerJoin(assets, eq(assessments.assetId, assets.id));
    whereConditions.push(eq(assets.projectId, filters.projectId));
  }
  if (filters?.companyId) {
    query = query
      .innerJoin(assets, eq(assessments.assetId, assets.id))
      .innerJoin(projects, eq(assets.projectId, projects.id));
    whereConditions.push(eq(projects.companyId, filters.companyId));
  }

  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions));
  }

  const results = await query
    .groupBy(assessments.componentCode, assessments.componentName)
    .orderBy(desc(count()));

  return results.map(r => ({
    componentCode: r.componentCode || '',
    componentName: r.componentName || '',
    assessmentCount: Number(r.count),
    avgConditionScore: Number(r.avgScore || 0),
    totalRepairCost: Number(r.totalRepair || 0),
    totalReplacementCost: Number(r.totalReplacement || 0),
  }));
}

/**
 * Get project-level analytics
 */
export async function getProjectAnalytics(
  filters?: {
    companyId?: number;
  }
): Promise<ProjectAnalytics[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      assetCount: count(sql`DISTINCT ${assets.id}`),
      assessmentCount: count(sql`DISTINCT ${assessments.id}`),
      deficiencyCount: count(sql`DISTINCT ${deficiencies.id}`),
      totalRepair: sum(assessments.repairCost),
      avgScore: avg(sql`CASE 
        WHEN ${assessments.condition} = 'good' THEN 4
        WHEN ${assessments.condition} = 'fair' THEN 3
        WHEN ${assessments.condition} = 'poor' THEN 2
        ELSE 1
      END`),
    })
    .from(projects)
    .leftJoin(assets, eq(projects.id, assets.projectId))
    .leftJoin(assessments, eq(assets.id, assessments.assetId))
    .leftJoin(deficiencies, eq(assessments.id, deficiencies.assessmentId));

  if (filters?.companyId) {
    query = query.where(eq(projects.companyId, filters.companyId));
  }

  const results = await query
    .groupBy(projects.id, projects.name)
    .orderBy(desc(projects.id));

  return results.map(r => ({
    projectId: r.projectId,
    projectName: r.projectName,
    assetCount: Number(r.assetCount || 0),
    assessmentCount: Number(r.assessmentCount || 0),
    deficiencyCount: Number(r.deficiencyCount || 0),
    totalRepairCost: Number(r.totalRepair || 0),
    avgConditionScore: Number(r.avgScore || 0),
  }));
}

/**
 * Get company-level analytics
 */
export async function getCompanyAnalytics(): Promise<CompanyAnalytics[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      companyId: companies.id,
      companyName: companies.name,
      projectCount: count(sql`DISTINCT ${projects.id}`),
      assetCount: count(sql`DISTINCT ${assets.id}`),
      assessmentCount: count(sql`DISTINCT ${assessments.id}`),
      deficiencyCount: count(sql`DISTINCT ${deficiencies.id}`),
      totalRepair: sum(assessments.repairCost),
    })
    .from(companies)
    .leftJoin(projects, eq(companies.id, projects.companyId))
    .leftJoin(assets, eq(projects.id, assets.projectId))
    .leftJoin(assessments, eq(assets.id, assessments.assetId))
    .leftJoin(deficiencies, eq(assessments.id, deficiencies.assessmentId))
    .groupBy(companies.id, companies.name)
    .orderBy(desc(companies.id));

  return results.map(r => ({
    companyId: r.companyId,
    companyName: r.companyName,
    projectCount: Number(r.projectCount || 0),
    assetCount: Number(r.assetCount || 0),
    assessmentCount: Number(r.assessmentCount || 0),
    deficiencyCount: Number(r.deficiencyCount || 0),
    totalRepairCost: Number(r.totalRepair || 0),
  }));
}
