/**
 * Enhanced Report Data Queries
 * 
 * Provides data retrieval functions for generating professional BCA reports
 * with UNIFORMAT grouping, action lists, and component photos
 */

import { getDb } from "./db";
import { eq, and, inArray, desc, asc, sql, or, gte, lte } from "drizzle-orm";
import { assets, assessments, deficiencies, photos, projects, users } from "../drizzle/schema";

// UNIFORMAT Level 1 Groups
export const UNIFORMAT_GROUPS = {
  'A': { code: 'A', name: 'SUBSTRUCTURE', order: 1 },
  'B': { code: 'B', name: 'SHELL', order: 2 },
  'C': { code: 'C', name: 'INTERIORS', order: 3 },
  'D': { code: 'D', name: 'SERVICES', order: 4 },
  'E': { code: 'E', name: 'EQUIPMENT & FURNISHINGS', order: 5 },
  'F': { code: 'F', name: 'SPECIAL CONSTRUCTION', order: 6 },
  'G': { code: 'G', name: 'BUILDING SITEWORK', order: 7 },
} as const;

// Priority bucket definitions matching reference template
export const PRIORITY_BUCKETS = {
  critical: { label: 'Critical', range: '0-5 years', order: 1 },
  necessary: { label: 'Necessary', range: '6-10 years', order: 2 },
  recommended: { label: 'Recommended', range: '11-20 years', order: 3 },
  no_action: { label: 'No Action Required', range: 'N/A', order: 4 },
} as const;

// Action types matching reference template
export const ACTION_TYPES = {
  renewal: 'Renewal',
  modernization: 'Modernization',
  repair: 'Repair',
  maintenance: 'Maintenance',
  study: 'Study',
  run_to_fail: 'Run to Fail',
  replace: 'Replace',
  immediate_action: 'Immediate Action',
  monitor: 'Monitor',
  none: 'No Action',
} as const;

// Condition ratings matching reference template
export const CONDITION_RATINGS = {
  good: { label: 'Good', eslRange: '100-75% of ESL', color: '#22c55e' },
  fair: { label: 'Fair', eslRange: '75-50% of ESL', color: '#f59e0b' },
  poor: { label: 'Poor', eslRange: '50-25% of ESL', color: '#ef4444' },
  failed: { label: 'Failed', eslRange: '<25% of ESL', color: '#991b1b' },
} as const;

/**
 * Component assessment data structure for report generation
 */
export interface EnhancedComponentData {
  id: number;
  assetId: number;
  assetName: string;
  assetAddress: string;
  
  // UNIFORMAT classification
  uniformatCode: string;
  uniformatLevel1: string; // A, B, C, D, E, F, G
  uniformatLevel2: string | null; // e.g., A10, B20
  uniformatLevel3: string | null; // e.g., A1010, B2010
  uniformatGroup: string;
  componentName: string;
  componentLocation: string | null;
  
  // Condition assessment
  condition: string;
  conditionPercentage: number | null;
  estimatedServiceLife: number | null;
  remainingUsefulLife: number | null;
  reviewYear: number | null;
  lastTimeAction: number | null;
  
  // Cost data
  repairCost: number | null;
  replacementCost: number | null;
  totalCost: number | null;
  
  // Action data
  actionType: string;
  actionYear: number | null;
  actionDescription: string | null;
  priority: string;
  
  // Metadata
  assessmentDate: string;
  assessorName: string | null;
  observations: string | null;
  recommendations: string | null;
  
  // Photos
  photos: ComponentPhotoData[];
}

export interface ComponentPhotoData {
  id: number;
  url: string;
  caption: string | null;
  takenAt: string | null;
  componentCode: string;
  assetName: string;
}

export interface ActionListItem {
  id: number;
  itemId: string; // Formatted ID like "A.1.1"
  actionName: string;
  actionType: string;
  actionYear: number | null;
  actionCost: number | null;
  assetName: string;
  assetId: number;
  uniformatCode: string;
  uniformatGroup: string;
  priority: string;
  description: string | null;
}

export interface UniformatGroupSummary {
  groupCode: string;
  groupName: string;
  componentCount: number;
  totalRepairCost: number;
  totalReplacementCost: number;
  avgConditionPercentage: number;
  conditionDistribution: {
    good: number;
    fair: number;
    poor: number;
    failed: number;
  };
}

/**
 * Get component assessments grouped by UNIFORMAT for report generation
 */
export async function getComponentsForReport(
  projectId: number,
  options: {
    scope: 'all' | 'selected';
    selectedAssetIds?: number[];
    grouping: 'building_uniformat' | 'uniformat_building' | 'building_only' | 'uniformat_only';
    displayLevel: 'L2' | 'L3' | 'both';
    includePhotos: boolean;
    maxPhotosPerComponent: number;
    conditions?: string[];
    priorities?: string[];
    actionTypes?: string[];
    yearHorizon?: number;
  }
): Promise<EnhancedComponentData[]> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const { 
    scope, 
    selectedAssetIds = [], 
    includePhotos = true,
    maxPhotosPerComponent = 4,
    conditions = [],
    priorities = [],
    actionTypes = [],
    yearHorizon = 20
  } = options;

  // Build asset query conditions
  const assetConditions: any[] = [eq(assets.projectId, projectId)];
  
  if (scope === 'selected' && selectedAssetIds.length > 0) {
    assetConditions.push(inArray(assets.id, selectedAssetIds));
  }

  // Get assets
  const assetsList = await db
    .select({
      id: assets.id,
      name: assets.name,
      address: assets.address,
    })
    .from(assets)
    .where(and(...assetConditions))
    .orderBy(asc(assets.name));

  if (assetsList.length === 0) {
    return [];
  }

  const assetIds = assetsList.map(a => a.id).filter(id => id !== undefined) as number[];
  const assetMap = new Map(assetsList.map(a => [a.id, { name: a.name, address: a.address }]));

  // Build assessment query conditions
  const assessmentConditions: any[] = [
    inArray(assessments.assetId, assetIds),
    eq(assessments.projectId, projectId)
  ];

  // Apply condition filter
  if (conditions.length > 0) {
    assessmentConditions.push(inArray(assessments.condition, conditions));
  }

  // Apply year horizon filter (action year within range)
  const currentYear = new Date().getFullYear();
  if (yearHorizon > 0) {
    assessmentConditions.push(
      or(
        sql`${assessments.actionYear} IS NULL`,
        lte(assessments.actionYear, currentYear + yearHorizon)
      )
    );
  }

  // Get assessments with user info
  const assessmentsList = await db
    .select({
      id: assessments.id,
      assetId: assessments.assetId,
      componentCode: assessments.componentCode,
      componentName: assessments.componentName,
      componentLocation: assessments.componentLocation,
      uniformatId: assessments.uniformatId,
      uniformatLevel: assessments.uniformatLevel,
      uniformatGroup: assessments.uniformatGroup,
      sourceType: assessments.sourceType,
      condition: assessments.condition,
      conditionPercentage: assessments.conditionPercentage,
      estimatedServiceLife: assessments.estimatedServiceLife,
      remainingUsefulLife: assessments.remainingUsefulLife,
      reviewYear: assessments.reviewYear,
      lastTimeAction: assessments.lastTimeAction,
      repairCost: assessments.repairCost,
      renewCost: assessments.renewCost,
      replacementValue: assessments.replacementValue,
      estimatedRepairCost: assessments.estimatedRepairCost,
      recommendedAction: assessments.recommendedAction,
      actionYear: assessments.actionYear,
      actionDescription: assessments.actionDescription,
      priorityLevel: assessments.priorityLevel,
      assessmentDate: assessments.assessmentDate,
      assessorId: assessments.assessorId,
      observations: assessments.observations,
      recommendations: assessments.recommendations,
      assessorName: users.name,
    })
    .from(assessments)
    .leftJoin(users, eq(assessments.assessorId, users.id))
    .where(and(...assessmentConditions))
    .orderBy(asc(assessments.componentCode), asc(assessments.componentName));

  // Get photos if requested
  let photosMap = new Map<number, ComponentPhotoData[]>();
  
  if (includePhotos && assessmentsList.length > 0) {
    const assessmentIds = assessmentsList.map(a => a.id);
    const photosList = await db
      .select({
        id: photos.id,
        assessmentId: photos.assessmentId,
        url: photos.url,
        caption: photos.caption,
        takenAt: photos.takenAt,
      })
      .from(photos)
      .where(inArray(photos.assessmentId, assessmentIds))
      .orderBy(asc(photos.takenAt));

    // Group photos by assessment, limiting to maxPhotosPerComponent
    for (const photo of photosList) {
      if (!photo.assessmentId) continue;
      
      const existing = photosMap.get(photo.assessmentId) || [];
      if (existing.length < maxPhotosPerComponent) {
        const assessment = assessmentsList.find(a => a.id === photo.assessmentId);
        const asset = assessment?.assetId ? assetMap.get(assessment.assetId) : null;
        
        existing.push({
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
          takenAt: photo.takenAt,
          componentCode: assessment?.componentCode || 'N/A',
          assetName: asset?.name || 'Unknown',
        });
        photosMap.set(photo.assessmentId, existing);
      }
    }
  }

  // Build result with enhanced data
  const result: EnhancedComponentData[] = assessmentsList.map(assessment => {
    const asset = assessment.assetId ? assetMap.get(assessment.assetId) : null;
    const componentCode = assessment.componentCode || 'CUSTOM';
    
    // Parse UNIFORMAT levels from code
    const uniformatLevel1 = componentCode.charAt(0).toUpperCase();
    const uniformatLevel2 = componentCode.length >= 3 ? componentCode.substring(0, 3) : null;
    const uniformatLevel3 = componentCode.length >= 5 ? componentCode.substring(0, 5) : null;
    
    // Determine priority bucket from action year
    const priority = getPriorityFromActionYear(assessment.actionYear, currentYear);
    
    // Calculate total cost
    const repairCost = assessment.repairCost ? parseFloat(assessment.repairCost.toString()) : 
                       (assessment.estimatedRepairCost ? parseFloat(assessment.estimatedRepairCost.toString()) : null);
    const replacementCost = assessment.renewCost ? parseFloat(assessment.renewCost.toString()) :
                           (assessment.replacementValue ? parseFloat(assessment.replacementValue.toString()) : null);
    const totalCost = (repairCost || 0) + (replacementCost || 0) || null;

    return {
      id: assessment.id,
      assetId: assessment.assetId || 0,
      assetName: asset?.name || 'Unknown Asset',
      assetAddress: asset?.address || '',
      
      uniformatCode: componentCode,
      uniformatLevel1,
      uniformatLevel2,
      uniformatLevel3,
      uniformatGroup: assessment.uniformatGroup || UNIFORMAT_GROUPS[uniformatLevel1 as keyof typeof UNIFORMAT_GROUPS]?.name || 'Other',
      componentName: assessment.componentName || 'Unknown Component',
      componentLocation: assessment.componentLocation,
      
      condition: assessment.condition || 'not_assessed',
      conditionPercentage: assessment.conditionPercentage ? parseFloat(assessment.conditionPercentage) : null,
      estimatedServiceLife: assessment.estimatedServiceLife,
      remainingUsefulLife: assessment.remainingUsefulLife,
      reviewYear: assessment.reviewYear,
      lastTimeAction: assessment.lastTimeAction,
      
      repairCost,
      replacementCost,
      totalCost,
      
      actionType: normalizeActionType(assessment.recommendedAction),
      actionYear: assessment.actionYear,
      actionDescription: assessment.actionDescription,
      priority,
      
      assessmentDate: assessment.assessmentDate || new Date().toISOString(),
      assessorName: assessment.assessorName,
      observations: assessment.observations,
      recommendations: assessment.recommendations,
      
      photos: photosMap.get(assessment.id) || [],
    };
  });

  // Apply action type filter
  let filteredResult = result;
  if (actionTypes.length > 0) {
    filteredResult = filteredResult.filter(c => 
      actionTypes.some(at => c.actionType.toLowerCase().includes(at.toLowerCase()))
    );
  }

  // Apply priority filter
  if (priorities.length > 0) {
    filteredResult = filteredResult.filter(c => priorities.includes(c.priority));
  }

  return filteredResult;
}

/**
 * Get action list for report generation
 */
export async function getActionListForReport(
  projectId: number,
  options: {
    scope: 'all' | 'selected';
    selectedAssetIds?: number[];
    yearHorizon?: number;
    includePriorities?: string[];
  }
): Promise<ActionListItem[]> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const { 
    scope, 
    selectedAssetIds = [], 
    yearHorizon = 20,
    includePriorities = ['critical', 'necessary', 'recommended']
  } = options;

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + yearHorizon;

  // Build asset conditions
  const assetConditions: any[] = [eq(assets.projectId, projectId)];
  if (scope === 'selected' && selectedAssetIds.length > 0) {
    assetConditions.push(inArray(assets.id, selectedAssetIds));
  }

  // Get assets
  const assetsList = await db
    .select({ id: assets.id, name: assets.name })
    .from(assets)
    .where(and(...assetConditions));

  if (assetsList.length === 0) {
    return [];
  }

  const assetIds = assetsList.map(a => a.id).filter(id => id !== undefined) as number[];
  const assetMap = new Map(assetsList.map(a => [a.id, a.name]));

  // Get assessments with actions
  const assessmentsList = await db
    .select({
      id: assessments.id,
      assetId: assessments.assetId,
      componentCode: assessments.componentCode,
      componentName: assessments.componentName,
      uniformatGroup: assessments.uniformatGroup,
      recommendedAction: assessments.recommendedAction,
      actionYear: assessments.actionYear,
      actionDescription: assessments.actionDescription,
      repairCost: assessments.repairCost,
      renewCost: assessments.renewCost,
      estimatedRepairCost: assessments.estimatedRepairCost,
      replacementValue: assessments.replacementValue,
    })
    .from(assessments)
    .where(
      and(
        inArray(assessments.assetId, assetIds),
        eq(assessments.projectId, projectId),
        // Only include items with actions (not "none" or "monitor" without year)
        or(
          sql`${assessments.actionYear} IS NOT NULL`,
          sql`${assessments.recommendedAction} NOT IN ('none', 'monitor')`
        )
      )
    )
    .orderBy(asc(assessments.actionYear), asc(assessments.componentCode));

  // Build action list
  const actionList: ActionListItem[] = [];
  let itemCounter = 1;

  for (const assessment of assessmentsList) {
    const priority = getPriorityFromActionYear(assessment.actionYear, currentYear);
    
    // Skip if priority not in filter
    if (!includePriorities.includes(priority)) {
      continue;
    }

    // Skip if action year is beyond horizon (unless no_action)
    if (assessment.actionYear && assessment.actionYear > maxYear && priority !== 'no_action') {
      continue;
    }

    const componentCode = assessment.componentCode || 'CUSTOM';
    const uniformatLevel1 = componentCode.charAt(0).toUpperCase();
    
    // Calculate action cost
    const repairCost = assessment.repairCost ? parseFloat(assessment.repairCost.toString()) : 
                       (assessment.estimatedRepairCost ? parseFloat(assessment.estimatedRepairCost.toString()) : 0);
    const renewCost = assessment.renewCost ? parseFloat(assessment.renewCost.toString()) :
                      (assessment.replacementValue ? parseFloat(assessment.replacementValue.toString()) : 0);
    const actionCost = repairCost + renewCost || null;

    actionList.push({
      id: assessment.id,
      itemId: `${uniformatLevel1}.${itemCounter}`,
      actionName: assessment.componentName || 'Unknown Component',
      actionType: normalizeActionType(assessment.recommendedAction),
      actionYear: assessment.actionYear,
      actionCost,
      assetName: assessment.assetId ? (assetMap.get(assessment.assetId) || 'Unknown') : 'Unknown',
      assetId: assessment.assetId || 0,
      uniformatCode: componentCode,
      uniformatGroup: assessment.uniformatGroup || UNIFORMAT_GROUPS[uniformatLevel1 as keyof typeof UNIFORMAT_GROUPS]?.name || 'Other',
      priority,
      description: assessment.actionDescription,
    });

    itemCounter++;
  }

  return actionList;
}

/**
 * Get UNIFORMAT group summaries for dashboard
 */
export async function getUniformatGroupSummaries(
  projectId: number,
  assetIds?: number[]
): Promise<UniformatGroupSummary[]> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Get all assets if not specified
  let targetAssetIds = assetIds;
  if (!targetAssetIds || targetAssetIds.length === 0) {
    const assetsList = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.projectId, projectId));
    targetAssetIds = assetsList.map(a => a.id).filter(id => id !== undefined) as number[];
  }

  if (targetAssetIds.length === 0) {
    return [];
  }

  // Get assessments grouped by UNIFORMAT Level 1
  const assessmentsList = await db
    .select({
      componentCode: assessments.componentCode,
      condition: assessments.condition,
      conditionPercentage: assessments.conditionPercentage,
      repairCost: assessments.repairCost,
      renewCost: assessments.renewCost,
      estimatedRepairCost: assessments.estimatedRepairCost,
      replacementValue: assessments.replacementValue,
    })
    .from(assessments)
    .where(
      and(
        inArray(assessments.assetId, targetAssetIds),
        eq(assessments.projectId, projectId)
      )
    );

  // Group by UNIFORMAT Level 1
  const groupMap = new Map<string, {
    count: number;
    repairCost: number;
    replacementCost: number;
    conditionSum: number;
    conditionCount: number;
    conditions: { good: number; fair: number; poor: number; failed: number };
  }>();

  for (const assessment of assessmentsList) {
    const code = assessment.componentCode || 'X';
    const level1 = code.charAt(0).toUpperCase();
    
    const existing = groupMap.get(level1) || {
      count: 0,
      repairCost: 0,
      replacementCost: 0,
      conditionSum: 0,
      conditionCount: 0,
      conditions: { good: 0, fair: 0, poor: 0, failed: 0 },
    };

    existing.count++;
    
    const repairCost = assessment.repairCost ? parseFloat(assessment.repairCost.toString()) : 
                       (assessment.estimatedRepairCost ? parseFloat(assessment.estimatedRepairCost.toString()) : 0);
    const replacementCost = assessment.renewCost ? parseFloat(assessment.renewCost.toString()) :
                           (assessment.replacementValue ? parseFloat(assessment.replacementValue.toString()) : 0);
    
    existing.repairCost += repairCost;
    existing.replacementCost += replacementCost;

    if (assessment.conditionPercentage) {
      existing.conditionSum += parseFloat(assessment.conditionPercentage);
      existing.conditionCount++;
    }

    // Count conditions
    const condition = (assessment.condition || '').toLowerCase();
    if (condition.includes('good')) existing.conditions.good++;
    else if (condition.includes('fair')) existing.conditions.fair++;
    else if (condition.includes('poor')) existing.conditions.poor++;
    else if (condition.includes('fail') || condition.includes('critical')) existing.conditions.failed++;

    groupMap.set(level1, existing);
  }

  // Build summaries
  const summaries: UniformatGroupSummary[] = [];
  
  for (const [groupCode, data] of groupMap) {
    const groupInfo = UNIFORMAT_GROUPS[groupCode as keyof typeof UNIFORMAT_GROUPS];
    if (!groupInfo) continue;

    summaries.push({
      groupCode,
      groupName: groupInfo.name,
      componentCount: data.count,
      totalRepairCost: data.repairCost,
      totalReplacementCost: data.replacementCost,
      avgConditionPercentage: data.conditionCount > 0 ? data.conditionSum / data.conditionCount : 0,
      conditionDistribution: data.conditions,
    });
  }

  // Sort by UNIFORMAT order
  return summaries.sort((a, b) => {
    const orderA = UNIFORMAT_GROUPS[a.groupCode as keyof typeof UNIFORMAT_GROUPS]?.order || 99;
    const orderB = UNIFORMAT_GROUPS[b.groupCode as keyof typeof UNIFORMAT_GROUPS]?.order || 99;
    return orderA - orderB;
  });
}

/**
 * Helper: Get priority bucket from action year
 */
function getPriorityFromActionYear(actionYear: number | null, currentYear: number): string {
  if (!actionYear) return 'no_action';
  
  const yearsUntil = actionYear - currentYear;
  
  if (yearsUntil <= 5) return 'critical';
  if (yearsUntil <= 10) return 'necessary';
  if (yearsUntil <= 20) return 'recommended';
  return 'no_action';
}

/**
 * Helper: Normalize action type to display string
 */
function normalizeActionType(action: string | null): string {
  if (!action) return 'No Action';
  
  const actionLower = action.toLowerCase().replace(/_/g, ' ');
  
  // Map to standard action types
  if (actionLower.includes('renew')) return 'Renewal';
  if (actionLower.includes('modern')) return 'Modernization';
  if (actionLower.includes('repair')) return 'Repair';
  if (actionLower.includes('maint')) return 'Maintenance';
  if (actionLower.includes('study')) return 'Study';
  if (actionLower.includes('run') || actionLower.includes('fail')) return 'Run to Fail';
  if (actionLower.includes('replace')) return 'Replace';
  if (actionLower.includes('immediate')) return 'Immediate Action';
  if (actionLower.includes('monitor')) return 'Monitor';
  if (actionLower.includes('none')) return 'No Action';
  if (actionLower.includes('preventive')) return 'Preventive Maintenance';
  
  // Return capitalized version if no match
  return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ');
}

/**
 * Estimate report page count based on configuration
 */
export function estimateReportPageCount(options: {
  componentCount: number;
  photoCount: number;
  includePhotos: boolean;
  displayLevel: 'L2' | 'L3' | 'both';
  includeDashboard: boolean;
  includeActionList: boolean;
  includeIntroduction: boolean;
}): number {
  let pages = 0;
  
  // Cover page + TOC
  pages += 2;
  
  // Introduction section
  if (options.includeIntroduction) {
    pages += 4; // Scope, Property Info, Methodology, Limitations, Disclosure
  }
  
  // Dashboard
  if (options.includeDashboard) {
    pages += 2;
  }
  
  // Component sections
  const componentsPerPage = options.displayLevel === 'L2' ? 4 : 
                           options.displayLevel === 'L3' ? 2 : 1.5;
  pages += Math.ceil(options.componentCount / componentsPerPage);
  
  // Photos (if inline)
  if (options.includePhotos) {
    const photosPerPage = 4; // 2x2 grid
    pages += Math.ceil(options.photoCount / photosPerPage);
  }
  
  // Action list
  if (options.includeActionList) {
    const actionsPerPage = 15;
    pages += Math.ceil(options.componentCount / actionsPerPage);
  }
  
  // Closing remarks
  pages += 1;
  
  return pages;
}
