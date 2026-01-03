import { eq, and, gte, lte, sql, desc, count, sum, avg, isNull } from "drizzle-orm";
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

export interface ComponentByCondition {
  id: number;
  componentCode: string;
  componentName: string;
  condition: string;
  assetName: string;
  assetId: number;
  repairCost: number;
  replacementCost: number;
  assessedAt: string;
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

  // Query repair costs from assessments
  let repairQuery = db
    .select({
      totalRepair: sum(assessments.estimatedRepairCost),
      avgRepair: avg(assessments.estimatedRepairCost),
      count: count(),
    })
    .from(assessments);

  // Apply filters for repair costs
  const repairWhereConditions = [];
  if (filters?.projectId) {
    repairQuery = repairQuery.innerJoin(assets, eq(assessments.assetId, assets.id));
    repairWhereConditions.push(eq(assets.projectId, filters.projectId));
  }
  if (filters?.companyId) {
    repairQuery = repairQuery
      .innerJoin(assets, eq(assessments.assetId, assets.id))
      .innerJoin(projects, eq(assets.projectId, projects.id));
    repairWhereConditions.push(eq(projects.companyId, filters.companyId));
  }

  if (repairWhereConditions.length > 0) {
    repairQuery = repairQuery.where(and(...repairWhereConditions));
  }

  const repairResults = await repairQuery;
  const repairResult = repairResults[0];

  // Query replacement values from assets table (not assessments)
  let replacementQuery = db
    .select({
      totalReplacement: sum(assets.replacementValue),
      avgReplacement: avg(assets.replacementValue),
    })
    .from(assets);

  // Apply filters for replacement values
  const replacementWhereConditions = [];
  if (filters?.projectId) {
    replacementWhereConditions.push(eq(assets.projectId, filters.projectId));
  }
  if (filters?.companyId) {
    replacementQuery = replacementQuery.innerJoin(projects, eq(assets.projectId, projects.id));
    replacementWhereConditions.push(eq(projects.companyId, filters.companyId));
  }

  if (replacementWhereConditions.length > 0) {
    replacementQuery = replacementQuery.where(and(...replacementWhereConditions));
  }

  const replacementResults = await replacementQuery;
  const replacementResult = replacementResults[0];

  return {
    totalRepairCost: Number(repairResult?.totalRepair || 0),
    totalReplacementCost: Number(replacementResult?.totalReplacement || 0),
    avgRepairCost: Number(repairResult?.avgRepair || 0),
    avgReplacementCost: Number(replacementResult?.avgReplacement || 0),
    assessmentCount: Number(repairResult?.count || 0),
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
      totalRepair: sum(assessments.estimatedRepairCost),
      totalReplacement: sum(assessments.replacementValue),
    })
    .from(assessments);

  // Apply filters - always exclude deleted assessments
  const whereConditions = [isNull(assessments.deletedAt)];
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

  // Always apply where conditions (at minimum, exclude deleted)
  query = query.where(and(...whereConditions));

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


/**
 * Get components filtered by condition for interactive chart
 */
export async function getComponentsByCondition(
  filters: {
    projectId: number;
    condition?: string;
  }
): Promise<ComponentByCondition[]> {
  const db = await getDb();
  if (!db) return [];

  const whereConditions = [
    eq(assets.projectId, filters.projectId),
    isNull(assessments.deletedAt),
  ];

  if (filters.condition) {
    whereConditions.push(eq(assessments.condition, filters.condition as any));
  }

  const results = await db
    .select({
      id: assessments.id,
      componentCode: assessments.componentCode,
      componentName: assessments.componentName,
      condition: assessments.condition,
      assetName: assets.name,
      assetId: assets.id,
      repairCost: assessments.estimatedRepairCost,
      replacementCost: assessments.replacementValue,
      assessedAt: assessments.assessedAt,
    })
    .from(assessments)
    .innerJoin(assets, eq(assessments.assetId, assets.id))
    .where(and(...whereConditions))
    .orderBy(desc(assessments.assessedAt))
    .limit(100);

  return results.map(r => ({
    id: r.id,
    componentCode: r.componentCode || '',
    componentName: r.componentName || 'Unknown Component',
    condition: r.condition || 'not_assessed',
    assetName: r.assetName || 'Unknown Asset',
    assetId: r.assetId,
    repairCost: Number(r.repairCost || 0),
    replacementCost: Number(r.replacementCost || 0),
    assessedAt: r.assessedAt || '',
  }));
}
