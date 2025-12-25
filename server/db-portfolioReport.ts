/**
 * Database functions for Portfolio Report generation
 */

import { eq, and, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  projects,
  assets,
  assessments,
  deficiencies,
  photos
} from "../drizzle/schema";
import {
  AssetMetrics,
  PortfolioSummary,
  CategoryBreakdown,
  PriorityMatrix,
  CapitalRenewalForecast,
  calculateFCI,
  getFCIRating,
  getConditionScore,
  getConditionRating,
  calculatePriorityScore,
  aggregatePortfolioMetrics,
  groupByPriority,
  groupByCategory,
  generateCapitalRenewalForecast
} from "./portfolioReportCalculations";

export interface PortfolioReportData {
  project: {
    id: number;
    name: string;
    address: string | null;
    clientName: string | null;
    status: string;
    createdAt: string;
  };
  summary: PortfolioSummary;
  assetMetrics: AssetMetrics[];
  categoryBreakdown: CategoryBreakdown[];
  priorityMatrix: PriorityMatrix[];
  capitalForecast: CapitalRenewalForecast[];
  generatedAt: string;
}

/**
 * Get all assets for a project with their metrics
 */
export async function getProjectAssetsWithMetrics(projectId: number): Promise<AssetMetrics[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all assets for the project
  const projectAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.projectId, projectId));
  
  if (projectAssets.length === 0) return [];
  
  const assetIds = projectAssets.map(a => a.id);
  
  // Get assessments for all assets
  const assetAssessments = await db
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.projectId, projectId),
        inArray(assessments.assetId, assetIds)
      )
    );
  
  // Get deficiencies for all assets (via assessments)
  const assessmentIds = assetAssessments.map(a => a.id);
  const assetDeficiencies = assessmentIds.length > 0
    ? await db
        .select()
        .from(deficiencies)
        .where(
          and(
            eq(deficiencies.projectId, projectId),
            inArray(deficiencies.assessmentId, assessmentIds)
          )
        )
    : [];
  
  const currentYear = new Date().getFullYear();
  
  // Calculate metrics for each asset
  return projectAssets.map(asset => {
    const assetAssessmentList = assetAssessments.filter(a => a.assetId === asset.id);
    const assetDeficiencyList = assetDeficiencies.filter(d => 
      assetAssessmentList.some(a => a.id === d.assessmentId)
    );
    
    // Calculate total repair costs and replacement values from assessments
    const totalRepairCost = assetAssessmentList.reduce(
      (sum, a) => sum + (a.estimatedRepairCost || 0), 0
    );
    const totalReplacementValue = assetAssessmentList.reduce(
      (sum, a) => sum + (a.replacementValue || 0), 0
    );
    
    // Use asset's CRV if available, otherwise use sum from assessments
    const crv = asset.currentReplacementValue 
      ? parseFloat(asset.currentReplacementValue.toString())
      : totalReplacementValue;
    
    // Calculate costs by priority
    const immediateNeeds = assetDeficiencyList
      .filter(d => d.priority === 'immediate')
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
    const shortTermNeeds = assetDeficiencyList
      .filter(d => d.priority === 'short_term')
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
    const mediumTermNeeds = assetDeficiencyList
      .filter(d => d.priority === 'medium_term')
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
    const longTermNeeds = assetDeficiencyList
      .filter(d => d.priority === 'long_term')
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
    
    // Calculate deferred maintenance (sum of all deficiency costs)
    const deferredMaintenanceCost = immediateNeeds + shortTermNeeds + mediumTermNeeds + longTermNeeds;
    
    // Calculate FCI
    const fci = calculateFCI(deferredMaintenanceCost, crv);
    
    // Calculate average condition score
    const conditionScores = assetAssessmentList
      .filter(a => a.condition)
      .map(a => getConditionScore(a.condition));
    const avgConditionScore = conditionScores.length > 0
      ? conditionScores.reduce((sum, s) => sum + s, 0) / conditionScores.length
      : 50;
    
    // Calculate average remaining useful life
    const rulValues = assetAssessmentList
      .filter(a => a.remainingUsefulLife && a.remainingUsefulLife > 0)
      .map(a => a.remainingUsefulLife as number);
    const avgRUL = rulValues.length > 0
      ? rulValues.reduce((sum, r) => sum + r, 0) / rulValues.length
      : 0;
    
    // Calculate asset age
    const assetAge = asset.yearBuilt ? currentYear - asset.yearBuilt : 0;
    
    // Calculate priority score
    const totalNeeds = deferredMaintenanceCost;
    const priorityScore = calculatePriorityScore(
      fci,
      immediateNeeds,
      totalNeeds,
      assetAge,
      assetDeficiencyList.length
    );
    
    return {
      assetId: asset.id,
      assetName: asset.name,
      address: asset.address || undefined,
      yearBuilt: asset.yearBuilt || undefined,
      grossFloorArea: asset.grossFloorArea || undefined,
      currentReplacementValue: crv,
      deferredMaintenanceCost,
      fci,
      fciRating: getFCIRating(fci),
      conditionScore: Math.round(avgConditionScore),
      conditionRating: getConditionRating(avgConditionScore),
      assessmentCount: assetAssessmentList.length,
      deficiencyCount: assetDeficiencyList.length,
      immediateNeeds,
      shortTermNeeds,
      mediumTermNeeds,
      longTermNeeds,
      averageRemainingLife: Math.round(avgRUL),
      priorityScore
    };
  });
}

/**
 * Get all assessments for a project (for category breakdown)
 */
export async function getProjectAssessmentsForReport(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: assessments.id,
      componentCode: assessments.componentCode,
      componentName: assessments.componentName,
      estimatedRepairCost: assessments.estimatedRepairCost,
      replacementValue: assessments.replacementValue,
      condition: assessments.condition
    })
    .from(assessments)
    .where(eq(assessments.projectId, projectId));
}

/**
 * Get all deficiencies for a project (for priority matrix)
 */
export async function getProjectDeficienciesForReport(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get deficiencies with asset names
  const deficiencyList = await db
    .select({
      id: deficiencies.id,
      priority: deficiencies.priority,
      estimatedCost: deficiencies.estimatedCost,
      title: deficiencies.title,
      description: deficiencies.description,
      componentCode: deficiencies.componentCode,
      assessmentId: deficiencies.assessmentId
    })
    .from(deficiencies)
    .where(eq(deficiencies.projectId, projectId));
  
  // Get assessment-to-asset mapping
  const assessmentIds = Array.from(new Set(deficiencyList.map(d => d.assessmentId).filter(Boolean)));
  
  if (assessmentIds.length === 0) {
    return deficiencyList.map(d => ({
      ...d,
      assetName: 'Unknown'
    }));
  }
  
  const assessmentAssets = await db
    .select({
      assessmentId: assessments.id,
      assetId: assessments.assetId
    })
    .from(assessments)
    .where(inArray(assessments.id, assessmentIds as number[]));
  
  const assetIds = Array.from(new Set(assessmentAssets.map(a => a.assetId).filter(Boolean)));
  
  const assetNames = assetIds.length > 0
    ? await db
        .select({ id: assets.id, name: assets.name })
        .from(assets)
        .where(inArray(assets.id, assetIds as number[]))
    : [];
  
  const assetNameMap = new Map(assetNames.map(a => [a.id, a.name]));
  const assessmentAssetMap = new Map(assessmentAssets.map(a => [a.assessmentId, a.assetId]));
  
  return deficiencyList.map(d => ({
    ...d,
    assetName: d.assessmentId 
      ? assetNameMap.get(assessmentAssetMap.get(d.assessmentId) || 0) || 'Unknown'
      : 'Unknown'
  }));
}

/**
 * Generate complete portfolio report data
 */
export async function generatePortfolioReportData(projectId: number): Promise<PortfolioReportData | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Get project details
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      address: projects.address,
      clientName: projects.clientName,
      status: projects.status,
      createdAt: projects.createdAt
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  
  if (!project) return null;
  
  // Get asset metrics
  const assetMetrics = await getProjectAssetsWithMetrics(projectId);
  
  // Calculate portfolio summary
  const summary = aggregatePortfolioMetrics(assetMetrics);
  
  // Get assessments for category breakdown
  const projectAssessments = await getProjectAssessmentsForReport(projectId);
  const categoryBreakdown = groupByCategory(projectAssessments);
  
  // Get deficiencies for priority matrix
  const projectDeficiencies = await getProjectDeficienciesForReport(projectId);
  const priorityMatrix = groupByPriority(projectDeficiencies);
  
  // Calculate total needs for capital forecast
  const totalImmediateNeeds = assetMetrics.reduce((sum, a) => sum + a.immediateNeeds, 0);
  const totalShortTermNeeds = assetMetrics.reduce((sum, a) => sum + a.shortTermNeeds, 0);
  const totalMediumTermNeeds = assetMetrics.reduce((sum, a) => sum + a.mediumTermNeeds, 0);
  const totalLongTermNeeds = assetMetrics.reduce((sum, a) => sum + a.longTermNeeds, 0);
  
  // Generate 5-year capital forecast
  const capitalForecast = generateCapitalRenewalForecast(
    totalImmediateNeeds,
    totalShortTermNeeds,
    totalMediumTermNeeds,
    totalLongTermNeeds
  );
  
  return {
    project: {
      id: project.id,
      name: project.name,
      address: project.address,
      clientName: project.clientName,
      status: project.status,
      createdAt: project.createdAt || new Date().toISOString()
    },
    summary,
    assetMetrics: assetMetrics.sort((a, b) => b.priorityScore - a.priorityScore),
    categoryBreakdown,
    priorityMatrix,
    capitalForecast,
    generatedAt: new Date().toISOString()
  };
}
