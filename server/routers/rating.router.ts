import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  ratingScaleConfigs, 
  assetRatings, 
  projectRatings, 
  ratingHistory,
  assets,
  assessments
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Default letter grade thresholds (academic-style grading)
const DEFAULT_LETTER_GRADE_THRESHOLDS = {
  "A+": { min: 97, max: 100 },
  "A": { min: 93, max: 96.99 },
  "A-": { min: 90, max: 92.99 },
  "B+": { min: 87, max: 89.99 },
  "B": { min: 83, max: 86.99 },
  "B-": { min: 80, max: 82.99 },
  "C+": { min: 77, max: 79.99 },
  "C": { min: 73, max: 76.99 },
  "C-": { min: 70, max: 72.99 },
  "D+": { min: 67, max: 69.99 },
  "D": { min: 63, max: 66.99 },
  "D-": { min: 60, max: 62.99 },
  "F": { min: 0, max: 59.99 }
};

// Default zone thresholds (traffic light style)
const DEFAULT_ZONE_THRESHOLDS = {
  green: { min: 80, max: 100, label: "Excellent", description: "Asset in excellent condition" },
  yellow: { min: 60, max: 79.99, label: "Good", description: "Asset in good condition, minor attention needed" },
  orange: { min: 40, max: 59.99, label: "Fair", description: "Asset needs attention, plan for repairs" },
  red: { min: 0, max: 39.99, label: "Poor", description: "Critical condition, immediate action required" }
};

// FCI-specific thresholds (lower is better for FCI)
const FCI_LETTER_GRADE_THRESHOLDS = {
  "A+": { min: 0, max: 2 },
  "A": { min: 2.01, max: 5 },
  "A-": { min: 5.01, max: 8 },
  "B+": { min: 8.01, max: 12 },
  "B": { min: 12.01, max: 15 },
  "B-": { min: 15.01, max: 20 },
  "C+": { min: 20.01, max: 25 },
  "C": { min: 25.01, max: 30 },
  "C-": { min: 30.01, max: 35 },
  "D+": { min: 35.01, max: 40 },
  "D": { min: 40.01, max: 50 },
  "D-": { min: 50.01, max: 60 },
  "F": { min: 60.01, max: 100 }
};

const FCI_ZONE_THRESHOLDS = {
  green: { min: 0, max: 5, label: "Excellent", description: "Facility in excellent condition" },
  yellow: { min: 5.01, max: 10, label: "Good", description: "Facility in good condition" },
  orange: { min: 10.01, max: 30, label: "Fair", description: "Facility needs attention" },
  red: { min: 30.01, max: 100, label: "Poor", description: "Critical - major repairs needed" }
};

// Helper functions
function calculateLetterGrade(score: number, thresholds: Record<string, { min: number; max: number }>, isInverted = false): string {
  // For inverted scales (like FCI where lower is better), we need to check differently
  for (const [grade, range] of Object.entries(thresholds)) {
    if (isInverted) {
      if (score >= range.min && score <= range.max) {
        return grade;
      }
    } else {
      if (score >= range.min && score <= range.max) {
        return grade;
      }
    }
  }
  return isInverted ? "F" : "F";
}

function calculateZone(score: number, thresholds: Record<string, { min: number; max: number }>, isInverted = false): "green" | "yellow" | "orange" | "red" {
  for (const [zone, range] of Object.entries(thresholds)) {
    if (score >= range.min && score <= range.max) {
      return zone as "green" | "yellow" | "orange" | "red";
    }
  }
  return isInverted ? "red" : "red";
}

// Zod schemas
const letterGradeThresholdsSchema = z.record(z.string(), z.object({
  min: z.number(),
  max: z.number()
}));

const zoneThresholdsSchema = z.record(z.string(), z.object({
  min: z.number(),
  max: z.number(),
  label: z.string().optional(),
  description: z.string().optional()
}));

export const ratingRouter = router({
  // Get default rating scales
  getDefaultScales: protectedProcedure
    .query(async () => {
      return {
        letterGrades: {
          standard: DEFAULT_LETTER_GRADE_THRESHOLDS,
          fci: FCI_LETTER_GRADE_THRESHOLDS
        },
        zones: {
          standard: DEFAULT_ZONE_THRESHOLDS,
          fci: FCI_ZONE_THRESHOLDS
        }
      };
    }),

  // Get company's rating scale configurations
  getScaleConfigs: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      scaleType: z.enum(['fci', 'condition', 'esg', 'overall', 'custom']).optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(ratingScaleConfigs);
      
      const conditions = [];
      if (input.companyId !== undefined) {
        conditions.push(eq(ratingScaleConfigs.companyId, input.companyId));
      }
      if (input.scaleType) {
        conditions.push(eq(ratingScaleConfigs.scaleType, input.scaleType));
      }
      conditions.push(eq(ratingScaleConfigs.isActive, 1));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const results = await query;
      
      return results.map(config => ({
        ...config,
        letterGradeThresholds: JSON.parse(config.letterGradeThresholds),
        zoneThresholds: JSON.parse(config.zoneThresholds)
      }));
    }),

  // Create or update a rating scale configuration
  upsertScaleConfig: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      companyId: z.number().optional(),
      scaleType: z.enum(['fci', 'condition', 'esg', 'overall', 'custom']),
      name: z.string(),
      description: z.string().optional(),
      letterGradeThresholds: letterGradeThresholdsSchema,
      zoneThresholds: zoneThresholdsSchema,
      isDefault: z.boolean().default(false)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const data = {
        companyId: input.companyId,
        scaleType: input.scaleType,
        name: input.name,
        description: input.description,
        letterGradeThresholds: JSON.stringify(input.letterGradeThresholds),
        zoneThresholds: JSON.stringify(input.zoneThresholds),
        isDefault: input.isDefault ? 1 : 0,
        createdBy: ctx.user?.id
      };

      if (input.id) {
        await db.update(ratingScaleConfigs)
          .set(data)
          .where(eq(ratingScaleConfigs.id, input.id));
        return { id: input.id, success: true };
      } else {
        const result = await db.insert(ratingScaleConfigs).values(data);
        return { id: result[0].insertId, success: true };
      }
    }),

  // Calculate rating for a single score
  calculateRating: protectedProcedure
    .input(z.object({
      score: z.number(),
      scaleType: z.enum(['fci', 'condition', 'esg', 'overall', 'custom']),
      companyId: z.number().optional(),
      scaleConfigId: z.number().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let letterThresholds = DEFAULT_LETTER_GRADE_THRESHOLDS;
      let zoneThresholds = DEFAULT_ZONE_THRESHOLDS;
      let isInverted = false;

      // Use FCI-specific thresholds for FCI scale type
      if (input.scaleType === 'fci') {
        letterThresholds = FCI_LETTER_GRADE_THRESHOLDS;
        zoneThresholds = FCI_ZONE_THRESHOLDS;
        isInverted = true;
      }

      // Try to get custom scale config if specified
      if (input.scaleConfigId) {
        const [config] = await db.select()
          .from(ratingScaleConfigs)
          .where(eq(ratingScaleConfigs.id, input.scaleConfigId))
          .limit(1);
        
        if (config) {
          letterThresholds = JSON.parse(config.letterGradeThresholds);
          zoneThresholds = JSON.parse(config.zoneThresholds);
        }
      } else if (input.companyId) {
        // Try to get company's default scale for this type
        const [config] = await db.select()
          .from(ratingScaleConfigs)
          .where(and(
            eq(ratingScaleConfigs.companyId, input.companyId),
            eq(ratingScaleConfigs.scaleType, input.scaleType),
            eq(ratingScaleConfigs.isDefault, 1),
            eq(ratingScaleConfigs.isActive, 1)
          ))
          .limit(1);
        
        if (config) {
          letterThresholds = JSON.parse(config.letterGradeThresholds);
          zoneThresholds = JSON.parse(config.zoneThresholds);
        }
      }

      const letterGrade = calculateLetterGrade(input.score, letterThresholds, isInverted);
      const zone = calculateZone(input.score, zoneThresholds, isInverted);
      const zoneInfo = zoneThresholds[zone] || DEFAULT_ZONE_THRESHOLDS[zone];

      return {
        score: input.score,
        letterGrade,
        zone,
        zoneLabel: zoneInfo?.label || zone,
        zoneDescription: zoneInfo?.description || ""
      };
    }),

  // Calculate and store asset rating
  calculateAssetRating: protectedProcedure
    .input(z.object({
      assetId: z.number(),
      projectId: z.number(),
      companyId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all assessments for this asset
      const assetAssessments = await db.select()
        .from(assessments)
        .where(eq(assessments.assetId, input.assetId));

      if (assetAssessments.length === 0) {
        return { success: false, message: "No assessments found for this asset" };
      }

      // Calculate average condition score
      const conditionScores = assetAssessments
        .filter(a => a.conditionScore !== null)
        .map(a => a.conditionScore as number);
      
      const avgConditionScore = conditionScores.length > 0
        ? conditionScores.reduce((a, b) => a + b, 0) / conditionScores.length
        : null;

      // Calculate FCI score (if available)
      const fciScores = assetAssessments
        .filter(a => a.fciScore !== null)
        .map(a => a.fciScore as number);
      
      const avgFciScore = fciScores.length > 0
        ? fciScores.reduce((a, b) => a + b, 0) / fciScores.length
        : null;

      // Calculate ratings
      const conditionRating = avgConditionScore !== null
        ? {
            grade: calculateLetterGrade(avgConditionScore, DEFAULT_LETTER_GRADE_THRESHOLDS),
            zone: calculateZone(avgConditionScore, DEFAULT_ZONE_THRESHOLDS)
          }
        : null;

      const fciRating = avgFciScore !== null
        ? {
            grade: calculateLetterGrade(avgFciScore, FCI_LETTER_GRADE_THRESHOLDS, true),
            zone: calculateZone(avgFciScore, FCI_ZONE_THRESHOLDS, true)
          }
        : null;

      // Calculate overall score (weighted average)
      let overallScore = null;
      if (avgConditionScore !== null && avgFciScore !== null) {
        // Convert FCI to 0-100 scale (inverted) and average with condition
        const normalizedFci = Math.max(0, 100 - avgFciScore);
        overallScore = (avgConditionScore * 0.6 + normalizedFci * 0.4);
      } else if (avgConditionScore !== null) {
        overallScore = avgConditionScore;
      } else if (avgFciScore !== null) {
        overallScore = Math.max(0, 100 - avgFciScore);
      }

      const overallRating = overallScore !== null
        ? {
            grade: calculateLetterGrade(overallScore, DEFAULT_LETTER_GRADE_THRESHOLDS),
            zone: calculateZone(overallScore, DEFAULT_ZONE_THRESHOLDS)
          }
        : null;

      // Check for existing rating
      const [existingRating] = await db.select()
        .from(assetRatings)
        .where(eq(assetRatings.assetId, input.assetId))
        .limit(1);

      const ratingData = {
        assetId: input.assetId,
        projectId: input.projectId,
        overallScore: overallScore?.toFixed(2) || null,
        overallGrade: overallRating?.grade || null,
        overallZone: overallRating?.zone || null,
        fciScore: avgFciScore?.toFixed(2) || null,
        fciGrade: fciRating?.grade || null,
        fciZone: fciRating?.zone || null,
        conditionScore: avgConditionScore?.toFixed(2) || null,
        conditionGrade: conditionRating?.grade || null,
        conditionZone: conditionRating?.zone || null,
        calculatedBy: ctx.user?.id,
        lastCalculatedAt: new Date().toISOString()
      };

      if (existingRating) {
        await db.update(assetRatings)
          .set(ratingData)
          .where(eq(assetRatings.id, existingRating.id));

        // Record history if score changed
        if (existingRating.overallScore !== ratingData.overallScore) {
          await db.insert(ratingHistory).values({
            entityType: 'asset',
            entityId: input.assetId,
            ratingType: 'overall',
            score: ratingData.overallScore || "0",
            letterGrade: ratingData.overallGrade,
            zone: ratingData.overallZone,
            previousScore: existingRating.overallScore,
            previousGrade: existingRating.overallGrade,
            changeReason: 'Recalculated from assessments',
            recordedBy: ctx.user?.id
          });
        }
      } else {
        await db.insert(assetRatings).values(ratingData);
        
        // Record initial history
        if (ratingData.overallScore) {
          await db.insert(ratingHistory).values({
            entityType: 'asset',
            entityId: input.assetId,
            ratingType: 'overall',
            score: ratingData.overallScore,
            letterGrade: ratingData.overallGrade,
            zone: ratingData.overallZone,
            changeReason: 'Initial rating calculation',
            recordedBy: ctx.user?.id
          });
        }
      }

      return {
        success: true,
        rating: {
          overall: overallRating ? { score: overallScore, ...overallRating } : null,
          fci: fciRating ? { score: avgFciScore, ...fciRating } : null,
          condition: conditionRating ? { score: avgConditionScore, ...conditionRating } : null
        }
      };
    }),

  // Get asset rating
  getAssetRating: protectedProcedure
    .input(z.object({
      assetId: z.number()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [rating] = await db.select()
        .from(assetRatings)
        .where(eq(assetRatings.assetId, input.assetId))
        .limit(1);

      if (!rating) return null;

      return {
        ...rating,
        componentBreakdown: rating.componentBreakdown ? JSON.parse(rating.componentBreakdown) : null
      };
    }),

  // Calculate and store project rating (portfolio-level)
  calculateProjectRating: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      companyId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all asset ratings for this project
      const projectAssetRatings = await db.select()
        .from(assetRatings)
        .where(eq(assetRatings.projectId, input.projectId));

      // Get total asset count
      const projectAssets = await db.select()
        .from(assets)
        .where(eq(assets.projectId, input.projectId));

      const totalAssets = projectAssets.length;
      const assessedAssets = projectAssetRatings.length;

      if (assessedAssets === 0) {
        return { success: false, message: "No rated assets found for this project" };
      }

      // Calculate averages
      const overallScores = projectAssetRatings
        .filter(r => r.overallScore !== null)
        .map(r => parseFloat(r.overallScore as string));
      
      const fciScores = projectAssetRatings
        .filter(r => r.fciScore !== null)
        .map(r => parseFloat(r.fciScore as string));
      
      const conditionScores = projectAssetRatings
        .filter(r => r.conditionScore !== null)
        .map(r => parseFloat(r.conditionScore as string));

      const avgOverall = overallScores.length > 0
        ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length
        : null;
      
      const avgFci = fciScores.length > 0
        ? fciScores.reduce((a, b) => a + b, 0) / fciScores.length
        : null;
      
      const avgCondition = conditionScores.length > 0
        ? conditionScores.reduce((a, b) => a + b, 0) / conditionScores.length
        : null;

      // Calculate zone distribution
      const zoneDistribution = {
        green: projectAssetRatings.filter(r => r.overallZone === 'green').length,
        yellow: projectAssetRatings.filter(r => r.overallZone === 'yellow').length,
        orange: projectAssetRatings.filter(r => r.overallZone === 'orange').length,
        red: projectAssetRatings.filter(r => r.overallZone === 'red').length
      };

      // Calculate grade distribution
      const gradeDistribution: Record<string, number> = {};
      for (const rating of projectAssetRatings) {
        if (rating.overallGrade) {
          const baseGrade = rating.overallGrade.charAt(0); // Get A, B, C, D, or F
          gradeDistribution[baseGrade] = (gradeDistribution[baseGrade] || 0) + 1;
        }
      }

      // Calculate portfolio rating
      const portfolioRating = avgOverall !== null
        ? {
            grade: calculateLetterGrade(avgOverall, DEFAULT_LETTER_GRADE_THRESHOLDS),
            zone: calculateZone(avgOverall, DEFAULT_ZONE_THRESHOLDS)
          }
        : null;

      // Check for existing project rating
      const [existingRating] = await db.select()
        .from(projectRatings)
        .where(eq(projectRatings.projectId, input.projectId))
        .limit(1);

      const ratingData = {
        projectId: input.projectId,
        portfolioScore: avgOverall?.toFixed(2) || null,
        portfolioGrade: portfolioRating?.grade || null,
        portfolioZone: portfolioRating?.zone || null,
        avgFciScore: avgFci?.toFixed(2) || null,
        avgConditionScore: avgCondition?.toFixed(2) || null,
        zoneDistribution: JSON.stringify(zoneDistribution),
        gradeDistribution: JSON.stringify(gradeDistribution),
        totalAssets,
        assessedAssets,
        lastCalculatedAt: new Date().toISOString()
      };

      if (existingRating) {
        await db.update(projectRatings)
          .set(ratingData)
          .where(eq(projectRatings.id, existingRating.id));

        // Record history if score changed
        if (existingRating.portfolioScore !== ratingData.portfolioScore && ratingData.portfolioScore) {
          await db.insert(ratingHistory).values({
            entityType: 'project',
            entityId: input.projectId,
            ratingType: 'overall',
            score: ratingData.portfolioScore,
            letterGrade: ratingData.portfolioGrade,
            zone: ratingData.portfolioZone,
            previousScore: existingRating.portfolioScore,
            previousGrade: existingRating.portfolioGrade,
            changeReason: 'Recalculated from asset ratings',
            recordedBy: ctx.user?.id
          });
        }
      } else {
        await db.insert(projectRatings).values(ratingData);
        
        // Record initial history
        if (ratingData.portfolioScore) {
          await db.insert(ratingHistory).values({
            entityType: 'project',
            entityId: input.projectId,
            ratingType: 'overall',
            score: ratingData.portfolioScore,
            letterGrade: ratingData.portfolioGrade,
            zone: ratingData.portfolioZone,
            changeReason: 'Initial portfolio rating calculation',
            recordedBy: ctx.user?.id
          });
        }
      }

      return {
        success: true,
        rating: {
          portfolioScore: avgOverall,
          portfolioGrade: portfolioRating?.grade,
          portfolioZone: portfolioRating?.zone,
          avgFciScore: avgFci,
          avgConditionScore: avgCondition,
          zoneDistribution,
          gradeDistribution,
          totalAssets,
          assessedAssets
        }
      };
    }),

  // Get project rating
  getProjectRating: protectedProcedure
    .input(z.object({
      projectId: z.number()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [rating] = await db.select()
        .from(projectRatings)
        .where(eq(projectRatings.projectId, input.projectId))
        .limit(1);

      if (!rating) return null;

      return {
        ...rating,
        zoneDistribution: rating.zoneDistribution ? JSON.parse(rating.zoneDistribution) : null,
        gradeDistribution: rating.gradeDistribution ? JSON.parse(rating.gradeDistribution) : null
      };
    }),

  // Get rating history for an entity
  getRatingHistory: protectedProcedure
    .input(z.object({
      entityType: z.enum(['asset', 'project']),
      entityId: z.number(),
      ratingType: z.enum(['overall', 'fci', 'condition', 'esg']).optional(),
      limit: z.number().default(50)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(ratingHistory.entityType, input.entityType),
        eq(ratingHistory.entityId, input.entityId)
      ];

      if (input.ratingType) {
        conditions.push(eq(ratingHistory.ratingType, input.ratingType));
      }

      const history = await db.select()
        .from(ratingHistory)
        .where(and(...conditions))
        .orderBy(desc(ratingHistory.recordedAt))
        .limit(input.limit);

      return history;
    }),

  // Get portfolio summary (all projects)
  getPortfolioSummary: protectedProcedure
    .input(z.object({
      companyId: z.number().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allProjectRatings = await db.select().from(projectRatings);

      if (allProjectRatings.length === 0) {
        return {
          totalProjects: 0,
          ratedProjects: 0,
          avgPortfolioScore: null,
          overallGrade: null,
          overallZone: null,
          zoneDistribution: { green: 0, yellow: 0, orange: 0, red: 0 },
          gradeDistribution: {}
        };
      }

      // Calculate overall portfolio metrics
      const scores = allProjectRatings
        .filter(r => r.portfolioScore !== null)
        .map(r => parseFloat(r.portfolioScore as string));

      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

      // Aggregate zone distribution
      const zoneDistribution = { green: 0, yellow: 0, orange: 0, red: 0 };
      for (const rating of allProjectRatings) {
        if (rating.portfolioZone) {
          zoneDistribution[rating.portfolioZone]++;
        }
      }

      // Aggregate grade distribution
      const gradeDistribution: Record<string, number> = {};
      for (const rating of allProjectRatings) {
        if (rating.portfolioGrade) {
          const baseGrade = rating.portfolioGrade.charAt(0);
          gradeDistribution[baseGrade] = (gradeDistribution[baseGrade] || 0) + 1;
        }
      }

      const overallRating = avgScore !== null
        ? {
            grade: calculateLetterGrade(avgScore, DEFAULT_LETTER_GRADE_THRESHOLDS),
            zone: calculateZone(avgScore, DEFAULT_ZONE_THRESHOLDS)
          }
        : null;

      return {
        totalProjects: allProjectRatings.length,
        ratedProjects: scores.length,
        avgPortfolioScore: avgScore,
        overallGrade: overallRating?.grade || null,
        overallZone: overallRating?.zone || null,
        zoneDistribution,
        gradeDistribution
      };
    }),

  // Batch calculate ratings for all assets in a project
  batchCalculateAssetRatings: protectedProcedure
    .input(z.object({
      projectId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all assets for this project
      const projectAssets = await db.select()
        .from(assets)
        .where(eq(assets.projectId, input.projectId));

      const results = [];
      for (const asset of projectAssets) {
        try {
          // Get assessments for this asset
          const assetAssessments = await db.select()
            .from(assessments)
            .where(eq(assessments.assetId, asset.id));

          if (assetAssessments.length === 0) {
            results.push({ assetId: asset.id, success: false, message: "No assessments" });
            continue;
          }

          // Calculate scores
          const conditionScores = assetAssessments
            .filter(a => a.conditionScore !== null)
            .map(a => a.conditionScore as number);
          
          const avgConditionScore = conditionScores.length > 0
            ? conditionScores.reduce((a, b) => a + b, 0) / conditionScores.length
            : null;

          const fciScores = assetAssessments
            .filter(a => a.fciScore !== null)
            .map(a => a.fciScore as number);
          
          const avgFciScore = fciScores.length > 0
            ? fciScores.reduce((a, b) => a + b, 0) / fciScores.length
            : null;

          let overallScore = null;
          if (avgConditionScore !== null && avgFciScore !== null) {
            const normalizedFci = Math.max(0, 100 - avgFciScore);
            overallScore = (avgConditionScore * 0.6 + normalizedFci * 0.4);
          } else if (avgConditionScore !== null) {
            overallScore = avgConditionScore;
          } else if (avgFciScore !== null) {
            overallScore = Math.max(0, 100 - avgFciScore);
          }

          const conditionRating = avgConditionScore !== null
            ? {
                grade: calculateLetterGrade(avgConditionScore, DEFAULT_LETTER_GRADE_THRESHOLDS),
                zone: calculateZone(avgConditionScore, DEFAULT_ZONE_THRESHOLDS)
              }
            : null;

          const fciRating = avgFciScore !== null
            ? {
                grade: calculateLetterGrade(avgFciScore, FCI_LETTER_GRADE_THRESHOLDS, true),
                zone: calculateZone(avgFciScore, FCI_ZONE_THRESHOLDS, true)
              }
            : null;

          const overallRating = overallScore !== null
            ? {
                grade: calculateLetterGrade(overallScore, DEFAULT_LETTER_GRADE_THRESHOLDS),
                zone: calculateZone(overallScore, DEFAULT_ZONE_THRESHOLDS)
              }
            : null;

          // Upsert rating
          const [existingRating] = await db.select()
            .from(assetRatings)
            .where(eq(assetRatings.assetId, asset.id))
            .limit(1);

          const ratingData = {
            assetId: asset.id,
            projectId: input.projectId,
            overallScore: overallScore?.toFixed(2) || null,
            overallGrade: overallRating?.grade || null,
            overallZone: overallRating?.zone || null,
            fciScore: avgFciScore?.toFixed(2) || null,
            fciGrade: fciRating?.grade || null,
            fciZone: fciRating?.zone || null,
            conditionScore: avgConditionScore?.toFixed(2) || null,
            conditionGrade: conditionRating?.grade || null,
            conditionZone: conditionRating?.zone || null,
            calculatedBy: ctx.user?.id,
            lastCalculatedAt: new Date().toISOString()
          };

          if (existingRating) {
            await db.update(assetRatings)
              .set(ratingData)
              .where(eq(assetRatings.id, existingRating.id));
          } else {
            await db.insert(assetRatings).values(ratingData);
          }

          results.push({ 
            assetId: asset.id, 
            success: true, 
            rating: {
              overall: overallRating ? { score: overallScore, ...overallRating } : null,
              fci: fciRating ? { score: avgFciScore, ...fciRating } : null,
              condition: conditionRating ? { score: avgConditionScore, ...conditionRating } : null
            }
          });
        } catch (error) {
          results.push({ assetId: asset.id, success: false, message: String(error) });
        }
      }

      return {
        success: true,
        totalAssets: projectAssets.length,
        processedAssets: results.filter(r => r.success).length,
        results
      };
    })
});
