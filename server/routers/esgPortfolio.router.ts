import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

// Letter grade descriptors
const GRADE_DESCRIPTORS: Record<string, string> = {
  "A+": "Exceptional",
  "A": "Excellent",
  "A-": "Very Good",
  "B+": "Good",
  "B": "Above Average",
  "B-": "Satisfactory",
  "C+": "Fair",
  "C": "Average",
  "C-": "Below Average",
  "D+": "Needs Improvement",
  "D": "Poor",
  "D-": "Critical",
  "F": "Failing"
};

// Default thresholds
const DEFAULT_LETTER_GRADES = {
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

const DEFAULT_ZONES = {
  excellent: { min: 80, max: 100, label: "Excellent" },
  good: { min: 60, max: 79.99, label: "Good" },
  fair: { min: 40, max: 59.99, label: "Fair" },
  poor: { min: 0, max: 39.99, label: "Poor" }
};

// Helper functions
function calculateLetterGrade(score: number, thresholds: Record<string, { min: number; max: number }>): string {
  for (const [grade, range] of Object.entries(thresholds)) {
    if (score >= range.min && score <= range.max) {
      return grade;
    }
  }
  return "F";
}

function calculateZone(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function generateInputSnapshotId(data: any): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex').substring(0, 16);
}

export const esgPortfolioRouter = router({
  // Get all rating thresholds
  getThresholds: protectedProcedure
    .input(z.object({
      thresholdType: z.enum(['letter_grade', 'zone', 'fci_letter_grade', 'fci_zone']).optional(),
      activeOnly: z.boolean().default(true)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query;
      if (input.thresholdType) {
        query = sql`
          SELECT * FROM esg_rating_thresholds 
          WHERE thresholdType = ${input.thresholdType}
          ${input.activeOnly ? sql`AND isActive = 1` : sql``}
          ORDER BY version DESC
        `;
      } else {
        query = sql`
          SELECT * FROM esg_rating_thresholds 
          ${input.activeOnly ? sql`WHERE isActive = 1` : sql``}
          ORDER BY thresholdType, version DESC
        `;
      }

      const result = await db.execute(query);
      const rows = Array.isArray(result[0]) ? result[0] : [];
      
      return rows.map((row: any) => ({
        ...row,
        thresholds: JSON.parse(row.thresholds)
      }));
    }),

  // Create new threshold version
  createThresholdVersion: protectedProcedure
    .input(z.object({
      thresholdType: z.enum(['letter_grade', 'zone', 'fci_letter_grade', 'fci_zone']),
      name: z.string(),
      description: z.string().optional(),
      thresholds: z.record(z.any()),
      setAsDefault: z.boolean().default(false)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current max version for this type
      const versionResult = await db.execute(sql`
        SELECT MAX(version) as maxVersion FROM esg_rating_thresholds 
        WHERE thresholdType = ${input.thresholdType}
      `);
      const maxVersion = (versionResult[0] as any[])[0]?.maxVersion || 0;
      const newVersion = maxVersion + 1;

      // If setting as default, unset other defaults
      if (input.setAsDefault) {
        await db.execute(sql`
          UPDATE esg_rating_thresholds 
          SET isDefault = 0 
          WHERE thresholdType = ${input.thresholdType}
        `);
      }

      await db.execute(sql`
        INSERT INTO esg_rating_thresholds 
        (version, name, description, thresholdType, thresholds, isDefault, isActive, createdBy)
        VALUES (
          ${newVersion}, 
          ${input.name}, 
          ${input.description || null}, 
          ${input.thresholdType}, 
          ${JSON.stringify(input.thresholds)},
          ${input.setAsDefault ? 1 : 0},
          1,
          ${ctx.user?.id || null}
        )
      `);

      return { success: true, version: newVersion };
    }),

  // Get portfolio ESG summary
  getPortfolioESGSummary: protectedProcedure
    .input(z.object({
      portfolioId: z.number().optional(),
      portfolioName: z.string().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the latest portfolio rating
      let query;
      if (input.portfolioId) {
        query = sql`
          SELECT * FROM portfolio_esg_ratings 
          WHERE portfolioId = ${input.portfolioId}
          ORDER BY calculationDate DESC LIMIT 1
        `;
      } else {
        query = sql`
          SELECT * FROM portfolio_esg_ratings 
          WHERE portfolioId IS NULL
          ORDER BY calculationDate DESC LIMIT 1
        `;
      }

      const result = await db.execute(query);
      const ratings = Array.isArray(result[0]) ? result[0] : [];
      
      if (ratings.length === 0) {
        return null;
      }

      const rating = ratings[0] as any;
      return {
        ...rating,
        zoneDistribution: JSON.parse(rating.zoneDistribution)
      };
    }),

  // Calculate portfolio ESG ratings
  calculatePortfolioRatings: protectedProcedure
    .input(z.object({
      portfolioId: z.number().optional(),
      portfolioName: z.string().optional(),
      projectIds: z.array(z.number()).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get projects to rate
      let projectsQuery;
      if (input.projectIds && input.projectIds.length > 0) {
        projectsQuery = sql`SELECT id, name FROM projects WHERE id IN (${sql.join(input.projectIds.map(id => sql`${id}`), sql`, `)})`;
      } else {
        projectsQuery = sql`SELECT id, name FROM projects`;
      }

      const projectsResult = await db.execute(projectsQuery);
      const projects = Array.isArray(projectsResult[0]) ? projectsResult[0] : [];

      if (projects.length === 0) {
        return { success: false, message: "No projects found" };
      }

      // Get active thresholds
      const thresholdsResult = await db.execute(sql`
        SELECT * FROM esg_rating_thresholds WHERE isDefault = 1 AND isActive = 1
      `);
      const thresholds = Array.isArray(thresholdsResult[0]) ? thresholdsResult[0] : [];
      const letterGradeThreshold = thresholds.find((t: any) => t.thresholdType === 'letter_grade');
      const thresholdsVersionId = letterGradeThreshold?.id || null;

      // Calculate ESG scores for each project
      const projectRatings: Array<{
        projectId: number;
        projectName: string;
        esgScore: number;
        esgGrade: string;
        esgZone: string;
        needsAttention: boolean;
        attentionReasons: string[];
      }> = [];

      const zoneDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
      let totalScore = 0;
      let ratedCount = 0;
      let needsAttentionCount = 0;

      for (const project of projects as any[]) {
        // Get ESG scores for this project
        const scoresResult = await db.execute(sql`
          SELECT compositeScore, energyScore, waterScore, wasteScore, emissionsScore
          FROM esg_scores
          WHERE projectId = ${project.id}
          ORDER BY scoreDate DESC
          LIMIT 1
        `);
        const scores = Array.isArray(scoresResult[0]) ? scoresResult[0] : [];

        let esgScore = 50; // Default score if no data
        let energyScore = null;
        let waterScore = null;
        let wasteScore = null;
        let emissionsScore = null;

        if (scores.length > 0) {
          const score = scores[0] as any;
          esgScore = parseFloat(score.compositeScore) || 50;
          energyScore = score.energyScore ? parseFloat(score.energyScore) : null;
          waterScore = score.waterScore ? parseFloat(score.waterScore) : null;
          wasteScore = score.wasteScore ? parseFloat(score.wasteScore) : null;
          emissionsScore = score.emissionsScore ? parseFloat(score.emissionsScore) : null;
        }

        // Clamp score to 0-100
        esgScore = Math.max(0, Math.min(100, esgScore));

        const esgGrade = calculateLetterGrade(esgScore, DEFAULT_LETTER_GRADES);
        const esgZone = calculateZone(esgScore);

        // Determine if needs attention
        const attentionReasons: string[] = [];
        if (esgZone === "poor") {
          attentionReasons.push("Overall ESG score is in Poor zone");
        }
        if (esgZone === "fair") {
          attentionReasons.push("Overall ESG score is in Fair zone");
        }
        if (energyScore !== null && energyScore < 60) {
          attentionReasons.push("Energy efficiency score below threshold");
        }
        if (waterScore !== null && waterScore < 60) {
          attentionReasons.push("Water conservation score below threshold");
        }
        if (wasteScore !== null && wasteScore < 60) {
          attentionReasons.push("Waste management score below threshold");
        }
        if (emissionsScore !== null && emissionsScore < 60) {
          attentionReasons.push("Carbon emissions score below threshold");
        }

        const needsAttention = attentionReasons.length > 0;

        // Store project rating
        await db.execute(sql`
          INSERT INTO project_esg_ratings 
          (projectId, calculationDate, esgScore, esgGrade, esgZone, energyScore, waterScore, wasteScore, emissionsScore, needsAttention, attentionReasons, thresholdsVersionId, calculatedBy)
          VALUES (
            ${project.id},
            NOW(),
            ${esgScore.toFixed(2)},
            ${esgGrade},
            ${esgZone},
            ${energyScore?.toFixed(2) || null},
            ${waterScore?.toFixed(2) || null},
            ${wasteScore?.toFixed(2) || null},
            ${emissionsScore?.toFixed(2) || null},
            ${needsAttention ? 1 : 0},
            ${attentionReasons.length > 0 ? JSON.stringify(attentionReasons) : null},
            ${thresholdsVersionId},
            ${ctx.user?.id || null}
          )
        `);

        projectRatings.push({
          projectId: project.id,
          projectName: project.name,
          esgScore,
          esgGrade,
          esgZone,
          needsAttention,
          attentionReasons
        });

        zoneDistribution[esgZone]++;
        totalScore += esgScore;
        ratedCount++;
        if (needsAttention) needsAttentionCount++;
      }

      // Calculate portfolio-level metrics
      const portfolioScore = ratedCount > 0 ? totalScore / ratedCount : 0;
      const portfolioGrade = calculateLetterGrade(portfolioScore, DEFAULT_LETTER_GRADES);
      const portfolioZone = calculateZone(portfolioScore);

      // Generate input snapshot ID for reproducibility
      const inputSnapshotId = generateInputSnapshotId({
        projectIds: (projects as any[]).map((p: any) => p.id),
        timestamp: new Date().toISOString()
      });

      // Store portfolio rating
      await db.execute(sql`
        INSERT INTO portfolio_esg_ratings 
        (portfolioId, portfolioName, calculationDate, portfolioScore, portfolioGrade, portfolioZone, 
         projectsRated, projectsTotal, greenZoneCount, needsAttentionCount, zoneDistribution, 
         thresholdsVersionId, inputSnapshotId, calculatedBy)
        VALUES (
          ${input.portfolioId || null},
          ${input.portfolioName || 'All Projects'},
          NOW(),
          ${portfolioScore.toFixed(2)},
          ${portfolioGrade},
          ${portfolioZone},
          ${ratedCount},
          ${projects.length},
          ${zoneDistribution.excellent},
          ${needsAttentionCount},
          ${JSON.stringify(zoneDistribution)},
          ${thresholdsVersionId},
          ${inputSnapshotId},
          ${ctx.user?.id || null}
        )
      `);

      return {
        success: true,
        portfolio: {
          score: portfolioScore,
          grade: portfolioGrade,
          gradeDescriptor: GRADE_DESCRIPTORS[portfolioGrade],
          zone: portfolioZone,
          projectsRated: ratedCount,
          projectsTotal: projects.length,
          greenZoneCount: zoneDistribution.excellent,
          needsAttentionCount,
          zoneDistribution
        },
        projectRatings,
        calculatedAt: new Date().toISOString(),
        thresholdsVersionId,
        inputSnapshotId
      };
    }),

  // Get project ESG ratings list
  getProjectESGRatings: protectedProcedure
    .input(z.object({
      portfolioId: z.number().optional(),
      zone: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
      needsAttention: z.boolean().optional(),
      sortBy: z.enum(['score', 'grade', 'date']).default('score'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      limit: z.number().default(100)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get latest rating for each project
      let query = sql`
        SELECT per.*, p.name as projectName
        FROM project_esg_ratings per
        INNER JOIN (
          SELECT projectId, MAX(calculationDate) as maxDate
          FROM project_esg_ratings
          GROUP BY projectId
        ) latest ON per.projectId = latest.projectId AND per.calculationDate = latest.maxDate
        LEFT JOIN projects p ON per.projectId = p.id
        WHERE 1=1
      `;

      if (input.zone) {
        query = sql`${query} AND per.esgZone = ${input.zone}`;
      }
      if (input.needsAttention !== undefined) {
        query = sql`${query} AND per.needsAttention = ${input.needsAttention ? 1 : 0}`;
      }

      // Add sorting
      if (input.sortBy === 'score') {
        query = sql`${query} ORDER BY per.esgScore ${input.sortOrder === 'desc' ? sql`DESC` : sql`ASC`}`;
      } else if (input.sortBy === 'grade') {
        query = sql`${query} ORDER BY per.esgGrade ${input.sortOrder === 'desc' ? sql`DESC` : sql`ASC`}`;
      } else {
        query = sql`${query} ORDER BY per.calculationDate ${input.sortOrder === 'desc' ? sql`DESC` : sql`ASC`}`;
      }

      query = sql`${query} LIMIT ${input.limit}`;

      const result = await db.execute(query);
      const ratings = Array.isArray(result[0]) ? result[0] : [];

      return ratings.map((r: any) => ({
        ...r,
        attentionReasons: r.attentionReasons ? JSON.parse(r.attentionReasons) : [],
        gradeDescriptor: GRADE_DESCRIPTORS[r.esgGrade] || ""
      }));
    }),

  // Get ESG metrics for a project
  getProjectESGMetrics: protectedProcedure
    .input(z.object({
      projectId: z.number()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get latest metrics with trends
      const metricsResult = await db.execute(sql`
        SELECT * FROM esg_metrics_history
        WHERE projectId = ${input.projectId}
        ORDER BY metricDate DESC
      `);
      const allMetrics = Array.isArray(metricsResult[0]) ? metricsResult[0] : [];

      // Group by metric type and get latest
      const metricTypes = ['energy_efficiency', 'water_conservation', 'waste_management', 'carbon_emissions'];
      const latestMetrics: Record<string, any> = {};

      for (const type of metricTypes) {
        const typeMetrics = (allMetrics as any[]).filter(m => m.metricType === type);
        if (typeMetrics.length > 0) {
          const latest = typeMetrics[0];
          latestMetrics[type] = {
            ...latest,
            gradeDescriptor: GRADE_DESCRIPTORS[latest.grade] || ""
          };
        }
      }

      return {
        metrics: latestMetrics,
        history: allMetrics
      };
    }),

  // Record ESG metric
  recordESGMetric: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      metricType: z.enum(['energy_efficiency', 'water_conservation', 'waste_management', 'carbon_emissions']),
      score: z.number(),
      rawValue: z.number().optional(),
      unit: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous score for trend calculation
      const prevResult = await db.execute(sql`
        SELECT score FROM esg_metrics_history
        WHERE projectId = ${input.projectId} AND metricType = ${input.metricType}
        ORDER BY metricDate DESC LIMIT 1
      `);
      const prevMetrics = Array.isArray(prevResult[0]) ? prevResult[0] : [];
      const previousScore = prevMetrics.length > 0 ? parseFloat((prevMetrics[0] as any).score) : null;

      // Calculate trend
      let trendPercent = null;
      let trendDirection: 'up' | 'down' | 'stable' = 'stable';
      if (previousScore !== null) {
        trendPercent = ((input.score - previousScore) / previousScore) * 100;
        if (trendPercent > 1) trendDirection = 'up';
        else if (trendPercent < -1) trendDirection = 'down';
      }

      const score = Math.max(0, Math.min(100, input.score));
      const grade = calculateLetterGrade(score, DEFAULT_LETTER_GRADES);

      await db.execute(sql`
        INSERT INTO esg_metrics_history 
        (projectId, metricType, metricDate, score, grade, gradeDescriptor, rawValue, unit, previousScore, trendPercent, trendDirection)
        VALUES (
          ${input.projectId},
          ${input.metricType},
          NOW(),
          ${score.toFixed(2)},
          ${grade},
          ${GRADE_DESCRIPTORS[grade]},
          ${input.rawValue || null},
          ${input.unit || null},
          ${previousScore?.toFixed(2) || null},
          ${trendPercent?.toFixed(2) || null},
          ${trendDirection}
        )
      `);

      return {
        success: true,
        score,
        grade,
        gradeDescriptor: GRADE_DESCRIPTORS[grade],
        trendPercent,
        trendDirection
      };
    }),

  // Get Canadian grid carbon data
  getGridCarbonData: protectedProcedure
    .input(z.object({
      provinceCode: z.string().optional(),
      year: z.number().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query;
      if (input.provinceCode) {
        query = sql`
          SELECT * FROM canadian_grid_carbon_data 
          WHERE provinceCode = ${input.provinceCode} AND isActive = 1
          ORDER BY dataYear DESC LIMIT 1
        `;
      } else {
        query = sql`
          SELECT * FROM canadian_grid_carbon_data 
          WHERE isActive = 1
          ORDER BY provinceCode, dataYear DESC
        `;
      }

      const result = await db.execute(query);
      return Array.isArray(result[0]) ? result[0] : [];
    }),

  // Get grade descriptors
  getGradeDescriptors: protectedProcedure.query(() => {
    return GRADE_DESCRIPTORS;
  }),

  // Get default thresholds
  getDefaultThresholds: protectedProcedure.query(() => {
    return {
      letterGrades: DEFAULT_LETTER_GRADES,
      zones: DEFAULT_ZONES,
      gradeDescriptors: GRADE_DESCRIPTORS
    };
  })
});
