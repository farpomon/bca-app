import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as esgDb from "../db/esg.db";
import * as leedCalc from "../services/leedEsgCalculator.service";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * LEED-Based ESG Router
 * Provides sustainability tracking, GHG calculations, and environmental impact scoring
 * Based on LEED v4.1/v5 standards for Edmonton's climate commitments
 */

export const esgLeedRouter = router({
  // ============================================================================
  // UTILITY CONSUMPTION TRACKING
  // ============================================================================

  /**
   * Record utility consumption data for a facility
   */
  recordUtilityData: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      recordDate: z.date(),
      utilityType: z.enum(["electricity", "natural_gas", "water", "diesel", "propane"]),
      consumption: z.number(),
      unit: z.string(), // kWh, m³, GJ, L
      cost: z.number().optional(),
      isRenewable: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await esgDb.recordUtilityConsumption({
        projectId: input.projectId,
        recordDate: input.recordDate.toISOString(),
        utilityType: input.utilityType as any,
        consumption: input.consumption.toString(),
        unit: input.unit,
        cost: input.cost?.toString(),
        isRenewable: input.isRenewable ? 1 : 0,
        notes: input.notes,
      });
      return { success: true };
    }),

  /**
   * Get utility consumption history for a facility
   */
  getUtilityHistory: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      utilityType: z.enum(["electricity", "natural_gas", "water", "diesel", "propane"]).optional(),
    }))
    .query(async ({ input }) => {
      const data = await esgDb.getUtilityConsumption(input.projectId, input.startDate, input.endDate);
      
      if (input.utilityType) {
        return data.filter(d => d.utilityType === input.utilityType);
      }
      return data;
    }),

  // ============================================================================
  // LEED-BASED SUSTAINABILITY SCORING
  // ============================================================================

  /**
   * Calculate LEED-based sustainability score for a facility
   */
  calculateLEEDScore: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      buildingType: z.string().default("default"),
      grossFloorArea: z.number(), // m²
      province: z.string().default("alberta"),
      renewablePercentage: z.number().default(0),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      // Get utility data for the period
      const utilityData = await esgDb.getUtilityConsumption(input.projectId, input.startDate, input.endDate);
      
      // Transform to LEED calculator format
      const utilities: leedCalc.UtilityInput[] = utilityData.map(u => ({
        type: u.utilityType as leedCalc.UtilityInput['type'],
        consumption: parseFloat(u.consumption),
        unit: u.unit,
        isRenewable: u.isRenewable === 1,
        period: 'annual' as const, // Assume annual data
      }));

      const facility: leedCalc.FacilityProfile = {
        projectId: input.projectId,
        assetId: input.assetId,
        buildingType: input.buildingType,
        grossFloorArea: input.grossFloorArea,
        province: input.province,
      };

      const scores = leedCalc.calculateLEEDScore(facility, utilities, input.renewablePercentage);
      const recommendations = leedCalc.getSustainabilityRecommendations(scores);

      return {
        ...scores,
        recommendations,
        dataPoints: utilityData.length,
        calculatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get benchmark data for comparison
   */
  getBenchmarks: protectedProcedure
    .input(z.object({
      buildingType: z.string().default("default"),
    }))
    .query(({ input }) => {
      const energyBenchmarks = leedCalc.LEED_ENERGY_BENCHMARKS[input.buildingType.toLowerCase() as keyof typeof leedCalc.LEED_ENERGY_BENCHMARKS] 
        || leedCalc.LEED_ENERGY_BENCHMARKS.default;
      const waterBenchmarks = leedCalc.LEED_WATER_BENCHMARKS[input.buildingType.toLowerCase() as keyof typeof leedCalc.LEED_WATER_BENCHMARKS] 
        || leedCalc.LEED_WATER_BENCHMARKS.default;

      return {
        energy: energyBenchmarks,
        water: waterBenchmarks,
        ghg: leedCalc.GHG_INTENSITY_BENCHMARKS,
        buildingTypes: Object.keys(leedCalc.LEED_ENERGY_BENCHMARKS),
      };
    }),

  // ============================================================================
  // GHG EMISSIONS TRACKING
  // ============================================================================

  /**
   * Calculate GHG emissions for a facility
   */
  calculateGHGEmissions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      province: z.string().default("alberta"),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const utilityData = await esgDb.getUtilityConsumption(input.projectId, input.startDate, input.endDate);
      
      const utilities: leedCalc.UtilityInput[] = utilityData.map(u => ({
        type: u.utilityType as leedCalc.UtilityInput['type'],
        consumption: parseFloat(u.consumption),
        unit: u.unit,
        isRenewable: u.isRenewable === 1,
        period: 'annual' as const,
      }));

      const totalEmissions = leedCalc.calculateGHGEmissions(utilities, input.province);

      // Calculate by source
      const emissionsBySource: Record<string, number> = {};
      for (const utility of utilities) {
        const singleUtility = [utility];
        const emissions = leedCalc.calculateGHGEmissions(singleUtility, input.province);
        emissionsBySource[utility.type] = (emissionsBySource[utility.type] || 0) + emissions;
      }

      return {
        totalEmissions: Math.round(totalEmissions * 100) / 100,
        emissionsBySource,
        province: input.province,
        emissionFactor: leedCalc.CANADIAN_EMISSION_FACTORS.electricity[input.province.toLowerCase() as keyof typeof leedCalc.CANADIAN_EMISSION_FACTORS.electricity] 
          || leedCalc.CANADIAN_EMISSION_FACTORS.electricity.national_avg,
        unit: 'tonnes CO2e/year',
      };
    }),

  /**
   * Get Canadian emission factors
   */
  getEmissionFactors: protectedProcedure.query(() => {
    return {
      electricity: leedCalc.CANADIAN_EMISSION_FACTORS.electricity,
      naturalGas: {
        perM3: leedCalc.CANADIAN_EMISSION_FACTORS.natural_gas,
        perGJ: leedCalc.CANADIAN_EMISSION_FACTORS.natural_gas_gj,
      },
      diesel: leedCalc.CANADIAN_EMISSION_FACTORS.diesel,
      propane: leedCalc.CANADIAN_EMISSION_FACTORS.propane,
      water: leedCalc.CANADIAN_EMISSION_FACTORS.water,
    };
  }),

  // ============================================================================
  // PROJECT ENVIRONMENTAL IMPACT
  // ============================================================================

  /**
   * Calculate environmental impact score for a project/upgrade
   * Used for prioritization scoring
   */
  calculateProjectImpact: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectType: z.string(), // lighting, hvac, boiler, windows, etc.
      estimatedEnergySavings: z.number().optional(), // kWh/year
      estimatedWaterSavings: z.number().optional(), // L/year
      estimatedGHGReduction: z.number().optional(), // tonnes CO2e/year
      projectCost: z.number().optional(),
      province: z.string().default("alberta"),
    }))
    .mutation(async ({ input }) => {
      const impact: Partial<leedCalc.ProjectEnvironmentalImpact> = {
        projectId: input.projectId,
        projectType: input.projectType,
        estimatedEnergySavings: input.estimatedEnergySavings,
        estimatedWaterSavings: input.estimatedWaterSavings,
        estimatedGHGReduction: input.estimatedGHGReduction,
      };

      const environmentalImpactScore = leedCalc.calculateEnvironmentalImpactScore(impact, input.province);

      // Calculate cost savings and payback
      const electricityFactor = leedCalc.CANADIAN_EMISSION_FACTORS.electricity[input.province.toLowerCase() as keyof typeof leedCalc.CANADIAN_EMISSION_FACTORS.electricity] 
        || leedCalc.CANADIAN_EMISSION_FACTORS.electricity.national_avg;

      const ghgFromEnergy = ((input.estimatedEnergySavings || 0) * electricityFactor) / 1000;
      const ghgFromWater = ((input.estimatedWaterSavings || 0) / 1000 * leedCalc.CANADIAN_EMISSION_FACTORS.water) / 1000;
      const totalGHGReduction = ghgFromEnergy + ghgFromWater + (input.estimatedGHGReduction || 0);

      // Estimate cost savings (Alberta rates)
      const estimatedCostSavings = (input.estimatedEnergySavings || 0) * 0.15 + (input.estimatedWaterSavings || 0) * 0.003;
      const paybackPeriod = input.projectCost && estimatedCostSavings > 0 
        ? input.projectCost / estimatedCostSavings 
        : null;

      return {
        environmentalImpactScore,
        totalGHGReduction: Math.round(totalGHGReduction * 100) / 100,
        estimatedCostSavings: Math.round(estimatedCostSavings),
        paybackPeriod: paybackPeriod ? Math.round(paybackPeriod * 10) / 10 : null,
      };
    }),

  /**
   * Estimate savings for common upgrade types
   */
  estimateProjectSavings: protectedProcedure
    .input(z.object({
      projectType: z.string(),
      currentEnergyConsumption: z.number().optional(), // kWh/year
      currentWaterConsumption: z.number().optional(), // L/year
      province: z.string().default("alberta"),
    }))
    .query(({ input }) => {
      const savings = leedCalc.calculateProjectSavings(
        input.projectType,
        { 
          energy: input.currentEnergyConsumption, 
          water: input.currentWaterConsumption 
        },
        input.province
      );

      return {
        ...savings,
        projectType: input.projectType,
        savingsPercentage: {
          energy: getSavingsPercentage(input.projectType, 'energy'),
          water: getSavingsPercentage(input.projectType, 'water'),
        },
      };
    }),

  // ============================================================================
  // SUSTAINABILITY GOALS & TARGETS
  // ============================================================================

  /**
   * Create a sustainability goal
   */
  createSustainabilityGoal: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      goalType: z.enum(["energy_reduction", "water_reduction", "ghg_reduction", "renewable_energy", "waste_diversion"]),
      baselineValue: z.number(),
      baselineYear: z.number(),
      targetValue: z.number(),
      targetYear: z.number(),
      unit: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await esgDb.createGoal({
        projectId: input.projectId,
        goalType: input.goalType as any,
        baselineValue: input.baselineValue.toString(),
        baselineYear: input.baselineYear,
        targetValue: input.targetValue.toString(),
        targetYear: input.targetYear,
        unit: input.unit,
        description: input.description,
      });
      return { success: true };
    }),

  /**
   * Get sustainability goals with progress tracking
   */
  getSustainabilityGoals: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const goals = await esgDb.getGoals(input.projectId);
      
      // Calculate progress for each goal
      return goals.map(goal => {
        const baseline = parseFloat(goal.baselineValue);
        const target = parseFloat(goal.targetValue);
        const currentYear = new Date().getFullYear();
        const yearsElapsed = currentYear - goal.baselineYear;
        const totalYears = goal.targetYear - goal.baselineYear;
        
        // Linear progress expectation
        const expectedProgress = totalYears > 0 ? (yearsElapsed / totalYears) * 100 : 0;
        
        return {
          ...goal,
          expectedProgress: Math.min(100, expectedProgress),
          yearsRemaining: Math.max(0, goal.targetYear - currentYear),
          reductionRequired: baseline - target,
          reductionPercentage: baseline > 0 ? ((baseline - target) / baseline) * 100 : 0,
        };
      });
    }),

  /**
   * Update goal status
   */
  updateGoalStatus: protectedProcedure
    .input(z.object({
      goalId: z.number(),
      status: z.enum(["active", "achieved", "missed", "cancelled"]),
      currentValue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await esgDb.updateGoalStatus(input.goalId, input.status);
      return { success: true };
    }),

  // ============================================================================
  // GREEN UPGRADES TRACKING
  // ============================================================================

  /**
   * Record a green upgrade/project
   */
  recordGreenUpgrade: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      upgradeName: z.string(),
      upgradeType: z.enum(["lighting", "hvac", "boiler", "windows", "insulation", "solar", "water_fixtures", "building_automation", "roof", "other"]),
      installDate: z.date().optional(),
      cost: z.number(),
      estimatedAnnualSavings: z.number().optional(),
      estimatedEnergySavings: z.number().optional(), // kWh/year
      estimatedWaterSavings: z.number().optional(), // L/year
      estimatedGHGReduction: z.number().optional(), // tonnes CO2e/year
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]).default("planned"),
      notes: z.string().optional(),
      province: z.string().default("alberta"),
    }))
    .mutation(async ({ input }) => {
      // Calculate environmental impact score
      const impact: Partial<leedCalc.ProjectEnvironmentalImpact> = {
        projectId: input.projectId,
        projectType: input.upgradeType,
        estimatedEnergySavings: input.estimatedEnergySavings,
        estimatedWaterSavings: input.estimatedWaterSavings,
        estimatedGHGReduction: input.estimatedGHGReduction,
      };
      
      const environmentalImpactScore = leedCalc.calculateEnvironmentalImpactScore(impact, input.province);

      // Calculate CO2 reduction if not provided
      let co2Reduction = input.estimatedGHGReduction || 0;
      if (!co2Reduction && (input.estimatedEnergySavings || input.estimatedWaterSavings)) {
        const electricityFactor = leedCalc.CANADIAN_EMISSION_FACTORS.electricity[input.province.toLowerCase() as keyof typeof leedCalc.CANADIAN_EMISSION_FACTORS.electricity] 
          || leedCalc.CANADIAN_EMISSION_FACTORS.electricity.national_avg;
        co2Reduction = ((input.estimatedEnergySavings || 0) * electricityFactor + 
          (input.estimatedWaterSavings || 0) / 1000 * leedCalc.CANADIAN_EMISSION_FACTORS.water) / 1000;
      }

      // Calculate payback period
      let paybackPeriod = null;
      if (input.estimatedAnnualSavings && input.estimatedAnnualSavings > 0) {
        paybackPeriod = input.cost / input.estimatedAnnualSavings;
      }

      await esgDb.recordGreenUpgrade({
        projectId: input.projectId,
        upgradeName: input.upgradeName,
        upgradeType: input.upgradeType as any,
        installDate: input.installDate?.toISOString(),
        cost: input.cost.toString(),
        estimatedAnnualSavings: input.estimatedAnnualSavings?.toString(),
        energySavingsKWh: input.estimatedEnergySavings?.toString(),
        waterSavingsGallons: input.estimatedWaterSavings ? (input.estimatedWaterSavings * 0.264172).toString() : undefined, // Convert L to gallons
        co2ReductionMt: co2Reduction > 0 ? co2Reduction.toString() : undefined,
        paybackPeriod: paybackPeriod?.toString(),
        status: input.status,
        notes: input.notes,
      });

      return { 
        success: true, 
        environmentalImpactScore,
        co2Reduction: Math.round(co2Reduction * 100) / 100,
        paybackPeriod: paybackPeriod ? Math.round(paybackPeriod * 10) / 10 : null,
      };
    }),

  /**
   * Get green upgrades for a project
   */
  getGreenUpgrades: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
    }))
    .query(async ({ input }) => {
      const upgrades = await esgDb.getGreenUpgrades(input.projectId);
      
      if (input.status) {
        return upgrades.filter(u => u.status === input.status);
      }
      return upgrades;
    }),

  /**
   * Update green upgrade status
   */
  updateGreenUpgrade: protectedProcedure
    .input(z.object({
      upgradeId: z.number(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
      actualAnnualSavings: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { upgradeId, actualAnnualSavings, ...rest } = input;
      await esgDb.updateGreenUpgrade(upgradeId, {
        ...rest,
        actualAnnualSavings: actualAnnualSavings?.toString(),
      });
      return { success: true };
    }),

  // ============================================================================
  // CARBON FOOTPRINT REPORTING
  // ============================================================================

  /**
   * Get carbon footprint summary for a portfolio
   */
  getPortfolioCarbonFootprint: protectedProcedure
    .input(z.object({
      province: z.string().default("alberta"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all projects with utility data
      const result = await db.execute(sql`
        SELECT 
          p.id as projectId,
          p.name as projectName,
          SUM(CASE WHEN uc.utilityType = 'electricity' THEN CAST(uc.consumption AS DECIMAL(15,2)) ELSE 0 END) as totalElectricity,
          SUM(CASE WHEN uc.utilityType = 'natural_gas' THEN CAST(uc.consumption AS DECIMAL(15,2)) ELSE 0 END) as totalGas,
          SUM(CASE WHEN uc.utilityType = 'water' THEN CAST(uc.consumption AS DECIMAL(15,2)) ELSE 0 END) as totalWater
        FROM projects p
        LEFT JOIN utility_consumption uc ON p.id = uc.projectId
        GROUP BY p.id, p.name
        HAVING totalElectricity > 0 OR totalGas > 0 OR totalWater > 0
      `);

      const projects = Array.isArray(result[0]) ? result[0] : [];
      const electricityFactor = leedCalc.CANADIAN_EMISSION_FACTORS.electricity[input.province.toLowerCase() as keyof typeof leedCalc.CANADIAN_EMISSION_FACTORS.electricity] 
        || leedCalc.CANADIAN_EMISSION_FACTORS.electricity.national_avg;

      let totalPortfolioEmissions = 0;
      const projectEmissions = projects.map((p: any) => {
        const electricityEmissions = (parseFloat(p.totalElectricity || '0') * electricityFactor) / 1000;
        const gasEmissions = (parseFloat(p.totalGas || '0') * leedCalc.CANADIAN_EMISSION_FACTORS.natural_gas) / 1000;
        const waterEmissions = (parseFloat(p.totalWater || '0') * leedCalc.CANADIAN_EMISSION_FACTORS.water) / 1000;
        const total = electricityEmissions + gasEmissions + waterEmissions;
        
        totalPortfolioEmissions += total;

        return {
          projectId: p.projectId,
          projectName: p.projectName,
          emissions: {
            electricity: Math.round(electricityEmissions * 100) / 100,
            gas: Math.round(gasEmissions * 100) / 100,
            water: Math.round(waterEmissions * 100) / 100,
            total: Math.round(total * 100) / 100,
          },
        };
      });

      return {
        totalPortfolioEmissions: Math.round(totalPortfolioEmissions * 100) / 100,
        projectCount: projects.length,
        projectEmissions,
        unit: 'tonnes CO2e/year',
        province: input.province,
      };
    }),

  /**
   * Get sustainability dashboard summary
   */
  getDashboardSummary: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get aggregate utility data
      let utilityQuery;
      if (input.projectId) {
        utilityQuery = sql`
          SELECT 
            utilityType,
            SUM(CAST(consumption AS DECIMAL(15,2))) as totalConsumption,
            SUM(CAST(cost AS DECIMAL(15,2))) as totalCost,
            COUNT(*) as recordCount
          FROM utility_consumption
          WHERE projectId = ${input.projectId}
          GROUP BY utilityType
        `;
      } else {
        utilityQuery = sql`
          SELECT 
            utilityType,
            SUM(CAST(consumption AS DECIMAL(15,2))) as totalConsumption,
            SUM(CAST(cost AS DECIMAL(15,2))) as totalCost,
            COUNT(*) as recordCount
          FROM utility_consumption
          GROUP BY utilityType
        `;
      }

      const utilityResult = await db.execute(utilityQuery);
      const utilities = Array.isArray(utilityResult[0]) ? utilityResult[0] : [];

      // Get green upgrades summary
      let upgradesQuery;
      if (input.projectId) {
        upgradesQuery = sql`
          SELECT 
            status,
            COUNT(*) as count,
            SUM(CAST(cost AS DECIMAL(15,2))) as totalCost,
            SUM(CAST(COALESCE(estimatedAnnualSavings, 0) AS DECIMAL(15,2))) as totalSavings,
            SUM(CAST(COALESCE(co2ReductionMt, 0) AS DECIMAL(15,4))) as totalCO2Reduction
          FROM green_upgrades
          WHERE projectId = ${input.projectId}
          GROUP BY status
        `;
      } else {
        upgradesQuery = sql`
          SELECT 
            status,
            COUNT(*) as count,
            SUM(CAST(cost AS DECIMAL(15,2))) as totalCost,
            SUM(CAST(COALESCE(estimatedAnnualSavings, 0) AS DECIMAL(15,2))) as totalSavings,
            SUM(CAST(COALESCE(co2ReductionMt, 0) AS DECIMAL(15,4))) as totalCO2Reduction
          FROM green_upgrades
          GROUP BY status
        `;
      }

      const upgradesResult = await db.execute(upgradesQuery);
      const upgrades = Array.isArray(upgradesResult[0]) ? upgradesResult[0] : [];

      // Get goals summary
      let goalsQuery;
      if (input.projectId) {
        goalsQuery = sql`
          SELECT 
            status,
            goalType,
            COUNT(*) as count
          FROM sustainability_goals
          WHERE projectId = ${input.projectId}
          GROUP BY status, goalType
        `;
      } else {
        goalsQuery = sql`
          SELECT 
            status,
            goalType,
            COUNT(*) as count
          FROM sustainability_goals
          GROUP BY status, goalType
        `;
      }

      const goalsResult = await db.execute(goalsQuery);
      const goals = Array.isArray(goalsResult[0]) ? goalsResult[0] : [];

      return {
        utilities: utilities.map((u: any) => ({
          type: u.utilityType,
          totalConsumption: parseFloat(u.totalConsumption || '0'),
          totalCost: parseFloat(u.totalCost || '0'),
          recordCount: u.recordCount,
        })),
        greenUpgrades: {
          byStatus: upgrades.map((u: any) => ({
            status: u.status,
            count: u.count,
            totalCost: parseFloat(u.totalCost || '0'),
            totalSavings: parseFloat(u.totalSavings || '0'),
            totalCO2Reduction: parseFloat(u.totalCO2Reduction || '0'),
          })),
        },
        goals: goals.map((g: any) => ({
          status: g.status,
          goalType: g.goalType,
          count: g.count,
        })),
      };
    }),
});

// Helper function to get savings percentage by project type
function getSavingsPercentage(projectType: string, category: 'energy' | 'water'): number {
  const savingsMap: Record<string, { energy: number; water: number }> = {
    lighting: { energy: 30, water: 0 },
    hvac: { energy: 20, water: 0 },
    boiler: { energy: 15, water: 0 },
    windows: { energy: 10, water: 0 },
    insulation: { energy: 15, water: 0 },
    solar: { energy: 25, water: 0 },
    water_fixtures: { energy: 0, water: 30 },
    building_automation: { energy: 15, water: 10 },
    roof: { energy: 8, water: 0 },
  };

  return savingsMap[projectType.toLowerCase()]?.[category] || 10;
}
