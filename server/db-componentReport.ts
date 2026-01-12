/**
 * Component Assessment Report Data Queries
 * 
 * Provides data retrieval functions for generating Individual Component Assessment reports
 */

import { getDb } from "./db";
import { eq, and, inArray, desc, asc, sql, or } from "drizzle-orm";
import { assets, assessments, deficiencies, photos, buildingComponents, users } from "../drizzle/schema";
import type { 
  ComponentAssessmentData, 
  ComponentData, 
  PhotoData,
  ComponentAssessmentFilters,
  ComponentSortOption 
} from "../shared/reportTypes";

/**
 * Get component assessment data for report generation
 */
export async function getComponentAssessmentsForReport(
  projectId: number,
  options: {
    scope: 'all' | 'selected';
    selectedAssetIds?: number[];
    filters?: ComponentAssessmentFilters;
    sortBy?: ComponentSortOption;
    maxAssets?: number;
  }
): Promise<ComponentAssessmentData[]> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const { scope, selectedAssetIds = [], filters = {}, sortBy = 'risk', maxAssets = 25 } = options;

  // Build asset query conditions
  const conditions: any[] = [eq(assets.projectId, projectId)];

  // Apply scope filter
  if (scope === 'selected' && selectedAssetIds.length > 0) {
    conditions.push(inArray(assets.id, selectedAssetIds));
  }

  // Facility filter would require buildingId field in assets table
  // Skipping for now as this field doesn't exist in current schema

  // Category filter would require additional field in assets table
  // Skipping for now as systemCategory doesn't exist in current schema

  // Apply condition filter
  if (filters.conditions && filters.conditions.length > 0) {
    conditions.push(inArray(assets.overallCondition, filters.conditions));
  }

  // Get assets with assessments
  let assetsQuery = db
    .select({
      id: assets.id,
      name: assets.name,
      assetCode: assets.assetCode,
      address: assets.address,
      overallCondition: assets.overallCondition,
      replacementValue: assets.replacementValue,
    })
    .from(assets)
    .where(and(...conditions));

  // Apply sorting
  switch (sortBy) {
    case 'risk':
      // Risk rating doesn't exist in schema, sort by condition as proxy
      assetsQuery = assetsQuery.orderBy(
        sql`CASE 
          WHEN ${assets.overallCondition} = 'critical' THEN 1
          WHEN ${assets.overallCondition} = 'poor' THEN 2
          WHEN ${assets.overallCondition} = 'fair' THEN 3
          WHEN ${assets.overallCondition} = 'good' THEN 4
          WHEN ${assets.overallCondition} = 'excellent' THEN 5
          ELSE 6
        END`
      );
      break;
    case 'condition':
      assetsQuery = assetsQuery.orderBy(
        sql`CASE 
          WHEN ${assets.overallCondition} = 'critical' THEN 1
          WHEN ${assets.overallCondition} = 'poor' THEN 2
          WHEN ${assets.overallCondition} = 'fair' THEN 3
          WHEN ${assets.overallCondition} = 'good' THEN 4
          WHEN ${assets.overallCondition} = 'excellent' THEN 5
          ELSE 6
        END`
      );
      break;
    case 'cost':
      assetsQuery = assetsQuery.orderBy(desc(assets.replacementValue));
      break;
    case 'name':
      assetsQuery = assetsQuery.orderBy(asc(assets.name));
      break;
  }

  // Apply limit
  assetsQuery = assetsQuery.limit(maxAssets);

  const assetsList = await assetsQuery;

  // If no assets found, return empty array
  if (assetsList.length === 0) {
    return [];
  }

  const assetIds = assetsList.map(a => a.id).filter(id => id !== undefined) as number[];

  // Get all assessments for these assets
  const assessmentsList = await db
    .select({
      id: assessments.id,
      assetId: assessments.assetId,
      componentCode: assessments.componentCode,
      componentName: assessments.componentName,
      componentLocation: assessments.componentLocation,
      condition: assessments.condition,
      conditionPercentage: assessments.conditionPercentage,
      conditionNotes: assessments.conditionNotes,
      recommendedAction: assessments.recommendedAction,
      estimatedRepairCost: assessments.estimatedRepairCost,
      remainingUsefulLife: assessments.remainingUsefulLife,
      observations: assessments.observations,
      recommendations: assessments.recommendations,
      assessmentDate: assessments.assessmentDate,
      assessorId: assessments.assessorId,
      assessorName: users.name,
    })
    .from(assessments)
    .leftJoin(users, eq(assessments.assessorId, users.id))
    .where(
      and(
        inArray(assessments.assetId, assetIds),
        eq(assessments.projectId, projectId)
      )
    )
    .orderBy(asc(assessments.componentCode));

  // Get deficiencies for these assets
  const deficienciesList = await db
    .select({
      assetId: deficiencies.assetId,
      count: sql<number>`count(*)`,
    })
    .from(deficiencies)
    .where(inArray(deficiencies.assetId, assetIds))
    .groupBy(deficiencies.assetId);

  const deficienciesMap = new Map(
    deficienciesList.map(d => [d.assetId, d.count])
  );

  // Get photos for these assessments
  const assessmentIds = assessmentsList.map(a => a.id);
  const photosList = assessmentIds.length > 0
    ? await db
        .select({
          id: photos.id,
          assessmentId: photos.assessmentId,
          url: photos.url,
          caption: photos.caption,
          takenAt: photos.takenAt,
        })
        .from(photos)
        .where(inArray(photos.assessmentId, assessmentIds))
        .orderBy(asc(photos.takenAt))
    : [];

  // Build the result
  const result: ComponentAssessmentData[] = [];

  for (const asset of assetsList) {
    const assetAssessments = assessmentsList.filter(a => a.assetId === asset.id);
    
    // Apply deficiencies filter if needed
    const hasDeficiencies = (deficienciesMap.get(asset.id) || 0) > 0;
    if (filters.onlyWithDeficiencies && !hasDeficiencies) {
      continue;
    }

    // Get the most recent assessment for metadata
    const latestAssessment = assetAssessments[0];

    const components: ComponentData[] = assetAssessments.map(assessment => {
      const currentYear = new Date().getFullYear();
      const predictedFailureYear = assessment.remainingUsefulLife 
        ? currentYear + assessment.remainingUsefulLife 
        : null;

      return {
        componentCode: assessment.componentCode || 'N/A',
        componentName: assessment.componentName || 'Unknown Component',
        condition: assessment.condition || 'not_assessed',
        conditionPercentage: assessment.conditionPercentage 
          ? parseFloat(assessment.conditionPercentage) 
          : null,
        riskLevel: calculateComponentRisk(assessment.condition, assessment.remainingUsefulLife),
        predictedFailureYear,
        remainingLife: assessment.remainingUsefulLife,
        recommendedAction: assessment.recommendedAction || 'monitor',
        estimatedCost: assessment.estimatedRepairCost 
          ? parseFloat(assessment.estimatedRepairCost.toString()) 
          : null,
        notes: assessment.conditionNotes || assessment.observations || '',
        aiInsights: assessment.recommendations || '',
      };
    });

    // Get photos for this asset's assessments
    const assetPhotos: PhotoData[] = photosList
      .filter(p => assetAssessments.some(a => a.id === p.assessmentId))
      .slice(0, 4) // Limit to 4 photos per asset
      .map(p => ({
        id: p.id,
        url: p.url,
        caption: p.caption || '',
        takenAt: p.takenAt || new Date().toISOString(),
      }));

    result.push({
      assetId: asset.id,
      assetName: asset.name,
      assetUniqueId: asset.assetCode || `ASSET-${asset.id}`,
      location: asset.address || 'Not specified',
      systemCategory: 'General', // This would need to be added to assets table
      overallCondition: asset.overallCondition || 'good',
      riskRating: 'low', // This would need to be calculated or added to assets table
      assessmentDate: latestAssessment?.assessmentDate || new Date().toISOString(),
      assessorName: latestAssessment?.assessorName || 'Unknown',
      components,
      photos: assetPhotos,
      hasDeficiencies,
    });
  }

  return result;
}

/**
 * Calculate component risk level based on condition and remaining life
 */
function calculateComponentRisk(
  condition: string | null,
  remainingLife: number | null
): string {
  if (condition === 'critical' || remainingLife === 0) {
    return 'critical';
  }
  if (condition === 'poor' || (remainingLife !== null && remainingLife <= 2)) {
    return 'high';
  }
  if (condition === 'fair' || (remainingLife !== null && remainingLife <= 5)) {
    return 'medium';
  }
  return 'low';
}

/**
 * Get unique facilities for filtering
 */
export async function getProjectFacilities(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const facilities = await db
    .selectDistinct({
      id: assets.id,
      name: assets.name,
    })
    .from(assets)
    .where(eq(assets.projectId, projectId))
    .orderBy(asc(assets.name));

  return facilities.filter(f => f.id !== null);
}

/**
 * Get unique system categories for filtering
 */
export async function getProjectSystemCategories(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // System categories would require additional field in assets table
  // Returning empty array for now
  return [];
}

/**
 * Estimate page count for component assessment report
 */
export function estimateComponentReportPages(
  assetCount: number,
  detailLevel: 'minimal' | 'standard' | 'full'
): number {
  // Rough estimation based on detail level
  const pagesPerAsset = {
    minimal: 0.5,
    standard: 1,
    full: 2,
  };

  return Math.ceil(assetCount * pagesPerAsset[detailLevel]) + 1; // +1 for table of contents
}
