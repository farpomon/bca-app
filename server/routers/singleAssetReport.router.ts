/**
 * Single Asset Report Router
 * 
 * Dedicated endpoint that returns ALL data needed for a single-asset BCA report.
 * All data is scoped to one asset via SQL WHERE clauses - no portfolio data mixing.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getFCIRating } from "../portfolioReportCalculations";

// Helper: map conditionRating (1-5) to label
function conditionRatingToLabel(rating: string | number | null): string {
  const r = typeof rating === 'string' ? parseInt(rating, 10) : rating;
  if (!r || isNaN(r)) return 'not_assessed';
  if (r <= 2) return 'good';
  if (r === 3) return 'fair';
  return 'poor';
}

// Helper: map conditionRating (1-5) to percentage (0-100)
function conditionRatingToPercentage(rating: string | number | null): number {
  const r = typeof rating === 'string' ? parseInt(rating, 10) : rating;
  if (!r || isNaN(r)) return 0;
  return Math.max(0, 120 - r * 20);
}

// Helper: map priority level to label
function priorityToLabel(level: string | number | null): string {
  const p = typeof level === 'string' ? parseInt(level, 10) : level;
  if (!p || isNaN(p)) return 'routine';
  if (p <= 1) return 'critical';
  if (p <= 2) return 'high';
  if (p <= 3) return 'medium';
  if (p <= 4) return 'low';
  return 'routine';
}

export const singleAssetReportRouter = router({
  /**
   * Get list of assets for the dropdown selector
   */
  getAssets: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import('../db');
    const { sql } = await import('drizzle-orm');
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const result = await db.execute(sql`
      SELECT 
        a.id,
        a.name,
        a.address,
        a.yearBuilt,
        a.replacementValue,
        a.squareFootage,
        p.name as projectName,
        p.clientName,
        (SELECT COUNT(*) FROM assessments ass WHERE ass.assetId = a.id AND ass.deletedAt IS NULL AND ass.hidden = 0) as assessmentCount
      FROM assets a
      JOIN projects p ON a.projectId = p.id
      WHERE p.deletedAt IS NULL
      ORDER BY a.name ASC
    `);

    const rows = (result as any)[0] || result;
    return (Array.isArray(rows) ? rows : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || ''),
      address: r.address ? String(r.address) : null,
      yearBuilt: r.yearBuilt ? Number(r.yearBuilt) : null,
      replacementValue: r.replacementValue ? Number(r.replacementValue) : 0,
      squareFootage: r.squareFootage ? Number(r.squareFootage) : null,
      projectName: r.projectName ? String(r.projectName) : null,
      clientName: r.clientName ? String(r.clientName) : null,
      assessmentCount: Number(r.assessmentCount || 0),
    }));
  }),

  /**
   * Get ALL report data for a single asset - one endpoint, one call
   */
  getReportData: protectedProcedure
    .input(z.object({
      assetId: z.number(),
      includePhotos: z.boolean().default(true),
      maxPhotosPerComponent: z.number().default(4),
    }))
    .query(async ({ ctx, input }) => {
      const { getDb } = await import('../db');
      const { sql } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { assetId, includePhotos, maxPhotosPerComponent } = input;

      // 1. Fetch asset info
      const assetResult = await db.execute(sql`
        SELECT 
          a.id, a.name, a.address, a.yearBuilt, a.replacementValue, a.squareFootage,
          a.numberOfFloors, a.constructionType, a.primaryUse,
          p.name as projectName, p.clientName, p.address as projectAddress,
          p.deferredMaintenanceCost as projectDMC
        FROM assets a
        JOIN projects p ON a.projectId = p.id
        WHERE a.id = ${assetId}
        LIMIT 1
      `);

      const assetRows = (assetResult as any)[0] || assetResult;
      const asset = Array.isArray(assetRows) && assetRows.length > 0 ? assetRows[0] : null;
      if (!asset) throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset not found' });

      // 2. Fetch ALL assessments for this asset
      const assessmentResult = await db.execute(sql`
        SELECT 
          ass.id,
          ass.assetId,
          ass.componentCode,
          ass.componentName,
          ass.componentLocation,
          ass.uniformatGroup,
          ass.conditionRating,
          ass.conditionPercentage,
          ass.condition,
          ass.estimatedServiceLife,
          ass.remainingUsefulLife,
          ass.reviewYear,
          ass.lastTimeAction,
          ass.estimatedRepairCost,
          ass.replacementValue as assessReplacementValue,
          ass.repairCost,
          ass.renewCost,
          ass.recommendedAction,
          ass.actionYear,
          ass.actionDescription,
          ass.priorityLevel,
          ass.assessmentDate,
          ass.observations,
          ass.recommendations,
          bc.code as bcCode,
          bc.name as bcName,
          bc.level as bcLevel,
          bc.parentCode as bcParentCode
        FROM assessments ass
        LEFT JOIN building_components bc ON ass.componentCode = bc.code
        WHERE ass.assetId = ${assetId}
          AND ass.deletedAt IS NULL
          AND ass.hidden = 0
        ORDER BY ass.componentCode ASC
      `);

      const assessmentRows = (assessmentResult as any)[0] || assessmentResult;
      const assessments: any[] = Array.isArray(assessmentRows) ? assessmentRows : [];

      // 3. Fetch photos for this asset (if requested)
      let photosByAssessment: Record<number, any[]> = {};
      if (includePhotos) {
        const photoResult = await db.execute(sql`
          SELECT 
            ph.id, ph.assessmentId, ph.url, ph.caption, ph.takenAt, ph.componentCode
          FROM photos ph
          WHERE ph.assetId = ${assetId}
          ORDER BY ph.createdAt DESC
        `);
        const photoRows = (photoResult as any)[0] || photoResult;
        if (Array.isArray(photoRows)) {
          for (const photo of photoRows) {
            const assId = Number(photo.assessmentId);
            if (!photosByAssessment[assId]) photosByAssessment[assId] = [];
            if (photosByAssessment[assId].length < maxPhotosPerComponent) {
              photosByAssessment[assId].push({
                id: Number(photo.id),
                url: String(photo.url || ''),
                caption: photo.caption ? String(photo.caption) : null,
                takenAt: photo.takenAt ? String(photo.takenAt) : null,
                componentCode: photo.componentCode ? String(photo.componentCode) : '',
                assetName: String(asset.name || ''),
              });
            }
          }
        }
      }

      // 4. Fetch deficiency count for this asset
      const defResult = await db.execute(sql`
        SELECT COUNT(*) as cnt
        FROM deficiencies d
        JOIN assessments ass ON d.assessmentId = ass.id
        WHERE ass.assetId = ${assetId}
          AND ass.deletedAt IS NULL
      `);
      const defRows = (defResult as any)[0] || defResult;
      const deficiencyCount = Array.isArray(defRows) && defRows.length > 0 ? Number(defRows[0].cnt || 0) : 0;

      // ============================================
      // BUILD REPORT DATA
      // ============================================

      const assetName = String(asset.name || '');
      const crv = Number(asset.replacementValue || 0);
      const currentYear = new Date().getFullYear();
      const yearBuilt = asset.yearBuilt ? Number(asset.yearBuilt) : null;
      const assetAge = yearBuilt ? currentYear - yearBuilt : 0;

      // UNIFORMAT level 1 map
      const uniformatLevel1Map: Record<string, string> = {
        'A': 'A - Substructure', 'B': 'B - Shell', 'C': 'C - Interiors',
        'D': 'D - Services', 'E': 'E - Equipment & Furnishings',
        'F': 'F - Special Construction', 'G': 'G - Building Sitework',
      };

      // Build components array
      const components = assessments.map((ass: any) => {
        const condRating = ass.conditionRating;
        const condLabel = conditionRatingToLabel(condRating);
        const condPct = ass.conditionPercentage ? Number(ass.conditionPercentage) : conditionRatingToPercentage(condRating);
        const repairCost = Number(ass.estimatedRepairCost || ass.repairCost || 0);
        const replacementCost = Number(ass.assessReplacementValue || ass.renewCost || 0);
        const code = ass.componentCode ? String(ass.componentCode) : '';
        const level1Letter = code.charAt(0);

        return {
          id: Number(ass.id),
          assetId: assetId,
          assetName: assetName,
          assetAddress: String(asset.address || ''),
          uniformatCode: code,
          uniformatLevel1: uniformatLevel1Map[level1Letter] || ass.uniformatGroup || level1Letter,
          uniformatLevel2: code.length >= 3 ? code.substring(0, 3) : null,
          uniformatLevel3: code.length >= 5 ? code.substring(0, 5) : null,
          uniformatGroup: ass.uniformatGroup || uniformatLevel1Map[level1Letter] || '',
          componentName: String(ass.componentName || ass.bcName || code),
          componentLocation: ass.componentLocation ? String(ass.componentLocation) : null,
          condition: condLabel,
          conditionPercentage: condPct,
          estimatedServiceLife: ass.estimatedServiceLife ? Number(ass.estimatedServiceLife) : null,
          remainingUsefulLife: ass.remainingUsefulLife ? Number(ass.remainingUsefulLife) : null,
          reviewYear: ass.reviewYear ? Number(ass.reviewYear) : null,
          lastTimeAction: ass.lastTimeAction ? Number(ass.lastTimeAction) : null,
          repairCost: repairCost || null,
          replacementCost: replacementCost || null,
          totalCost: (repairCost + replacementCost) || null,
          actionType: String(ass.recommendedAction || 'monitor'),
          actionYear: ass.actionYear ? Number(ass.actionYear) : null,
          actionDescription: ass.actionDescription ? String(ass.actionDescription) : null,
          priority: priorityToLabel(ass.priorityLevel),
          assessmentDate: ass.assessmentDate ? String(ass.assessmentDate) : new Date().toISOString(),
          assessorName: null,
          observations: ass.observations ? String(ass.observations) : null,
          recommendations: ass.recommendations ? String(ass.recommendations) : null,
          photos: photosByAssessment[Number(ass.id)] || [],
        };
      });

      // Calculate totals
      const totalDMC = components.reduce((sum, c) => sum + (c.repairCost || 0), 0);
      const fciDecimal = crv > 0 ? totalDMC / crv : 0;
      const fciPercentage = fciDecimal * 100;
      const fciRating = getFCIRating(fciDecimal);

      // Average condition
      const condScores = components.map(c => c.conditionPercentage || 0).filter(s => s > 0);
      const avgCondScore = condScores.length > 0 ? condScores.reduce((a, b) => a + b, 0) / condScores.length : 0;
      const avgCondRating = avgCondScore >= 80 ? 'Good' : avgCondScore >= 60 ? 'Fair' : avgCondScore >= 40 ? 'Poor' : 'Critical';

      // Action list (exclude monitor/none)
      const actionList = components
        .filter(c => c.actionType !== 'monitor' && c.actionType !== 'none' && (c.repairCost || 0) > 0)
        .map((c, idx) => ({
          id: c.id,
          itemId: `ACT-${String(idx + 1).padStart(3, '0')}`,
          actionName: c.componentName,
          actionType: c.actionType,
          actionYear: c.actionYear,
          actionCost: c.repairCost,
          assetName: assetName,
          assetId: assetId,
          uniformatCode: c.uniformatCode,
          uniformatGroup: c.uniformatGroup,
          priority: c.priority,
          description: c.actionDescription || c.recommendations,
        }));

      // UNIFORMAT summary
      const uniformatGroups = new Map<string, { code: string; name: string; components: typeof components }>();
      for (const c of components) {
        const groupCode = c.uniformatCode.substring(0, 1);
        const groupName = c.uniformatLevel1;
        if (!uniformatGroups.has(groupCode)) {
          uniformatGroups.set(groupCode, { code: groupCode, name: groupName, components: [] });
        }
        uniformatGroups.get(groupCode)!.components.push(c);
      }

      const uniformatSummary = Array.from(uniformatGroups.entries()).map(([code, group]) => {
        const comps = group.components;
        const totalRepair = comps.reduce((s, c) => s + (c.repairCost || 0), 0);
        const totalReplace = comps.reduce((s, c) => s + (c.replacementCost || 0), 0);
        const condPcts = comps.map(c => c.conditionPercentage || 0).filter(p => p > 0);
        const avgCond = condPcts.length > 0 ? condPcts.reduce((a, b) => a + b, 0) / condPcts.length : 0;
        return {
          groupCode: code,
          groupName: group.name,
          componentCount: comps.length,
          totalRepairCost: totalRepair,
          totalReplacementCost: totalReplace,
          avgConditionPercentage: Math.round(avgCond * 10) / 10,
          conditionDistribution: {
            good: comps.filter(c => c.condition === 'good').length,
            fair: comps.filter(c => c.condition === 'fair').length,
            poor: comps.filter(c => c.condition === 'poor').length,
            failed: comps.filter(c => c.condition === 'not_assessed' || c.condition === 'critical').length,
          },
        };
      }).sort((a, b) => a.groupCode.localeCompare(b.groupCode));

      // Priority matrix
      const priorityCounts = new Map<string, { count: number; totalCost: number }>();
      for (const c of components) {
        const p = c.priority;
        if (!priorityCounts.has(p)) priorityCounts.set(p, { count: 0, totalCost: 0 });
        const entry = priorityCounts.get(p)!;
        entry.count++;
        entry.totalCost += (c.repairCost || 0);
      }
      const totalPriorityCost = Array.from(priorityCounts.values()).reduce((s, e) => s + e.totalCost, 0);
      const priorityMatrix = Array.from(priorityCounts.entries()).map(([priority, data]) => ({
        priority,
        count: data.count,
        totalCost: data.totalCost,
        percentageOfTotal: totalPriorityCost > 0 ? Math.round((data.totalCost / totalPriorityCost) * 1000) / 10 : 0,
      }));

      // Capital forecast
      // When actionYear is null, distribute costs based on priority:
      //   critical → year 0 (immediate)
      //   high → years 1-3 (short term, spread evenly)
      //   medium → years 4-7 (medium term, spread evenly)
      //   low/routine → years 8-12 (long term, spread evenly)
      const planningHorizon = 20;

      // Deterministic distribution: group by priority and spread evenly within time ranges
      const criticalComps = components.filter(c => c.actionYear == null && c.priority === 'critical');
      const highComps = components.filter(c => c.actionYear == null && c.priority === 'high');
      const mediumComps = components.filter(c => c.actionYear == null && c.priority === 'medium');
      const lowComps = components.filter(c => c.actionYear == null && c.priority === 'low');
      const routineComps = components.filter(c => c.actionYear == null && c.priority === 'routine');
      const withYearComps = components.filter(c => c.actionYear != null);

      // Build a year-to-cost map
      const yearCostMap = new Map<number, { immediate: number; shortTerm: number; mediumTerm: number; longTerm: number }>();
      for (let i = 0; i < planningHorizon; i++) {
        yearCostMap.set(currentYear + i, { immediate: 0, shortTerm: 0, mediumTerm: 0, longTerm: 0 });
      }

      // Components with explicit actionYear
      for (const c of withYearComps) {
        const yr = c.actionYear!;
        if (yr >= currentYear && yr < currentYear + planningHorizon) {
          const entry = yearCostMap.get(yr)!;
          const cost = c.repairCost || 0;
          if (yr === currentYear) entry.immediate += cost;
          else if (yr <= currentYear + 3) entry.shortTerm += cost;
          else if (yr <= currentYear + 7) entry.mediumTerm += cost;
          else entry.longTerm += cost;
        }
      }

      // Critical → year 0 (immediate)
      for (const c of criticalComps) {
        const entry = yearCostMap.get(currentYear)!;
        entry.immediate += (c.repairCost || 0);
      }

      // High → spread across years 1-3
      highComps.forEach((c, idx) => {
        const yr = currentYear + 1 + (idx % 3);
        const entry = yearCostMap.get(yr);
        if (entry) entry.shortTerm += (c.repairCost || 0);
      });

      // Medium → spread across years 4-7
      mediumComps.forEach((c, idx) => {
        const yr = currentYear + 4 + (idx % 4);
        const entry = yearCostMap.get(yr);
        if (entry) entry.mediumTerm += (c.repairCost || 0);
      });

      // Low → spread across years 8-12
      lowComps.forEach((c, idx) => {
        const yr = currentYear + 8 + (idx % 5);
        const entry = yearCostMap.get(yr);
        if (entry) entry.longTerm += (c.repairCost || 0);
      });

      // Routine → spread across years 13-19
      routineComps.forEach((c, idx) => {
        const yr = currentYear + 13 + (idx % 7);
        const entry = yearCostMap.get(yr);
        if (entry) entry.longTerm += (c.repairCost || 0);
      });

      const capitalForecast = [];
      let cumulative = 0;
      for (let i = 0; i < planningHorizon; i++) {
        const year = currentYear + i;
        const entry = yearCostMap.get(year)!;
        const totalProjectedCost = entry.immediate + entry.shortTerm + entry.mediumTerm + entry.longTerm;
        cumulative += totalProjectedCost;
        capitalForecast.push({
          year,
          immediateNeeds: entry.immediate,
          shortTermNeeds: entry.shortTerm,
          mediumTermNeeds: entry.mediumTerm,
          longTermNeeds: entry.longTerm,
          totalProjectedCost,
          cumulativeCost: cumulative,
        });
      }

      // Needs breakdown for assetMetrics
      // Use actionYear if available, otherwise classify by priority
      let immediateNeeds = 0;
      let shortTermNeeds = 0;
      let mediumTermNeeds = 0;
      let longTermNeeds = 0;
      for (const c of components) {
        const cost = c.repairCost || 0;
        if (cost === 0) continue;
        if (c.actionYear != null) {
          if (c.actionYear <= currentYear) immediateNeeds += cost;
          else if (c.actionYear <= currentYear + 3) shortTermNeeds += cost;
          else if (c.actionYear <= currentYear + 7) mediumTermNeeds += cost;
          else longTermNeeds += cost;
        } else {
          // Classify by priority when no actionYear
          switch (c.priority) {
            case 'critical': immediateNeeds += cost; break;
            case 'high': shortTermNeeds += cost; break;
            case 'medium': mediumTermNeeds += cost; break;
            case 'low': case 'routine': longTermNeeds += cost; break;
            default: shortTermNeeds += cost; break;
          }
        }
      }
      const rlComps = components.filter(c => c.remainingUsefulLife != null);
      const avgRemainingLife = rlComps.length > 0 ? rlComps.reduce((s, c) => s + (c.remainingUsefulLife || 0), 0) / rlComps.length : 0;

      return {
        asset: {
          id: assetId,
          name: assetName,
          address: asset.address ? String(asset.address) : null,
          yearBuilt,
          squareFootage: asset.squareFootage ? Number(asset.squareFootage) : null,
          numberOfFloors: asset.numberOfFloors ? Number(asset.numberOfFloors) : null,
          constructionType: asset.constructionType ? String(asset.constructionType) : null,
          primaryUse: asset.primaryUse ? String(asset.primaryUse) : null,
          replacementValue: crv,
          projectName: asset.projectName ? String(asset.projectName) : null,
          clientName: asset.clientName ? String(asset.clientName) : null,
        },
        summary: {
          totalAssets: 1,
          totalCurrentReplacementValue: crv,
          totalDeferredMaintenanceCost: totalDMC,
          portfolioFCI: fciPercentage,
          portfolioFCIRating: fciRating,
          averageConditionScore: Math.round(avgCondScore * 10) / 10,
          averageConditionRating: avgCondRating,
          totalDeficiencies: deficiencyCount,
          totalAssessments: assessments.length,
          fundingGap: totalDMC,
          averageAssetAge: assetAge,
        },
        assetMetrics: [{
          assetId,
          assetName,
          address: asset.address ? String(asset.address) : undefined,
          yearBuilt: yearBuilt || undefined,
          grossFloorArea: asset.squareFootage ? Number(asset.squareFootage) : undefined,
          currentReplacementValue: crv,
          deferredMaintenanceCost: totalDMC,
          fci: fciPercentage,
          fciRating,
          conditionScore: Math.round(avgCondScore * 10) / 10,
          conditionRating: avgCondRating,
          assessmentCount: assessments.length,
          deficiencyCount,
          immediateNeeds,
          shortTermNeeds,
          mediumTermNeeds,
          longTermNeeds,
          averageRemainingLife: Math.round(avgRemainingLife * 10) / 10,
          priorityScore: Math.round((1 - (avgCondScore / 100)) * 100),
        }],
        components,
        actionList,
        uniformatSummary,
        capitalForecast,
        priorityMatrix,
      };
    }),
});
