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
        energySavingsKwh: input.estimatedEnergySavings?.toString(),
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

  // ============================================================================
  // LEED v5 GRID CARBON INTENSITY
  // ============================================================================

  /**
   * Get grid carbon intensity for a Canadian province
   */
  getGridCarbonIntensity: protectedProcedure
    .input(z.object({
      region: z.string().optional(),
      year: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = sql`SELECT * FROM grid_carbon_intensity WHERE 1=1`;
      
      if (input.region) {
        query = sql`SELECT * FROM grid_carbon_intensity WHERE region = ${input.region}`;
      }
      if (input.year) {
        query = sql`SELECT * FROM grid_carbon_intensity WHERE year = ${input.year}`;
      }
      if (input.region && input.year) {
        query = sql`SELECT * FROM grid_carbon_intensity WHERE region = ${input.region} AND year = ${input.year}`;
      }
      if (!input.region && !input.year) {
        query = sql`SELECT * FROM grid_carbon_intensity ORDER BY avgEmissionFactor ASC`;
      }

      const result = await db.execute(query);
      return Array.isArray(result[0]) ? result[0] : [];
    }),

  // ============================================================================
  // LEED v5 EMBODIED CARBON
  // ============================================================================

  /**
   * Get embodied carbon materials library
   */
  getEmbodiedCarbonMaterials: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query;
      if (input.category) {
        query = sql`SELECT * FROM embodied_carbon_materials WHERE materialCategory = ${input.category} ORDER BY materialName`;
      } else {
        query = sql`SELECT * FROM embodied_carbon_materials ORDER BY materialCategory, materialName`;
      }

      const result = await db.execute(query);
      return Array.isArray(result[0]) ? result[0] : [];
    }),

  /**
   * Record project embodied carbon assessment
   */
  recordEmbodiedCarbonAssessment: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      assessmentDate: z.date(),
      assessmentType: z.enum(['baseline', 'design', 'as_built', 'renovation']),
      gwpModuleA1A3: z.number().optional(),
      gwpModuleA4: z.number().optional(),
      gwpModuleA5: z.number().optional(),
      gwpModuleB1B5: z.number().optional(),
      gwpModuleC1C4: z.number().optional(),
      gwpModuleD: z.number().optional(),
      gwpTotal: z.number(),
      gwpPerSqm: z.number().optional(),
      gwpPerSqft: z.number().optional(),
      materialBreakdown: z.record(z.number()).optional(),
      baselineGwp: z.number().optional(),
      lcaSoftware: z.string().optional(),
      lcaMethodology: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate reduction percentage if baseline provided
      let reductionPercent = null;
      let leedPointsEarned = 0;
      if (input.baselineGwp && input.baselineGwp > 0) {
        reductionPercent = ((input.baselineGwp - input.gwpTotal) / input.baselineGwp) * 100;
        // LEED v5 points calculation
        if (reductionPercent >= 40) leedPointsEarned = 6;
        else if (reductionPercent >= 30) leedPointsEarned = 5;
        else if (reductionPercent >= 20) leedPointsEarned = 4;
        else if (reductionPercent >= 10) leedPointsEarned = 3;
        else if (reductionPercent >= 0) leedPointsEarned = 2;
      }

      await db.execute(sql`
        INSERT INTO project_embodied_carbon 
        (projectId, assetId, assessmentDate, assessmentType, gwpModuleA1A3, gwpModuleA4, gwpModuleA5, 
         gwpModuleB1B5, gwpModuleC1C4, gwpModuleD, gwpTotal, gwpPerSqm, gwpPerSqft, materialBreakdown,
         baselineGwp, reductionPercent, leedPointsEarned, lcaSoftware, lcaMethodology, notes, createdBy)
        VALUES (${input.projectId}, ${input.assetId || null}, ${input.assessmentDate.toISOString()}, 
                ${input.assessmentType}, ${input.gwpModuleA1A3 || null}, ${input.gwpModuleA4 || null}, 
                ${input.gwpModuleA5 || null}, ${input.gwpModuleB1B5 || null}, ${input.gwpModuleC1C4 || null}, 
                ${input.gwpModuleD || null}, ${input.gwpTotal}, ${input.gwpPerSqm || null}, 
                ${input.gwpPerSqft || null}, ${input.materialBreakdown ? JSON.stringify(input.materialBreakdown) : null},
                ${input.baselineGwp || null}, ${reductionPercent}, ${leedPointsEarned}, 
                ${input.lcaSoftware || null}, ${input.lcaMethodology || null}, ${input.notes || null}, ${ctx.user?.id || null})
      `);

      return { 
        success: true, 
        reductionPercent: reductionPercent ? Math.round(reductionPercent * 10) / 10 : null,
        leedPointsEarned,
      };
    }),

  /**
   * Get project embodied carbon assessments
   */
  getProjectEmbodiedCarbon: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query;
      if (input.assetId) {
        query = sql`SELECT * FROM project_embodied_carbon WHERE projectId = ${input.projectId} AND assetId = ${input.assetId} ORDER BY assessmentDate DESC`;
      } else {
        query = sql`SELECT * FROM project_embodied_carbon WHERE projectId = ${input.projectId} ORDER BY assessmentDate DESC`;
      }

      const result = await db.execute(query);
      return Array.isArray(result[0]) ? result[0] : [];
    }),

  // ============================================================================
  // LEED v5 CREDIT TRACKING
  // ============================================================================

  /**
   * Get all LEED v5 credits
   */
  getLeedCredits: protectedProcedure
    .input(z.object({
      category: z.enum(['IP', 'LT', 'SS', 'WE', 'EA', 'MR', 'EQ', 'IN', 'RP']).optional(),
      creditType: z.enum(['prerequisite', 'credit']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = sql`SELECT * FROM leed_credits WHERE 1=1`;
      if (input.category && input.creditType) {
        query = sql`SELECT * FROM leed_credits WHERE category = ${input.category} AND creditType = ${input.creditType} ORDER BY creditCode`;
      } else if (input.category) {
        query = sql`SELECT * FROM leed_credits WHERE category = ${input.category} ORDER BY creditCode`;
      } else if (input.creditType) {
        query = sql`SELECT * FROM leed_credits WHERE creditType = ${input.creditType} ORDER BY creditCode`;
      } else {
        query = sql`SELECT * FROM leed_credits ORDER BY category, creditCode`;
      }

      const result = await db.execute(query);
      return Array.isArray(result[0]) ? result[0] : [];
    }),

  /**
   * Initialize LEED tracking for a project
   */
  initializeProjectLeedTracking: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      targetCertification: z.enum(['certified', 'silver', 'gold', 'platinum']),
      registrationDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all LEED credits
      const creditsResult = await db.execute(sql`SELECT id, creditCode, creditType FROM leed_credits`);
      const credits = Array.isArray(creditsResult[0]) ? creditsResult[0] : [];

      // Create tracking entries for each credit
      for (const credit of credits as any[]) {
        await db.execute(sql`
          INSERT IGNORE INTO project_leed_tracking 
          (projectId, leedVersion, registrationDate, targetCertification, creditId, status)
          VALUES (${input.projectId}, 'v5', ${input.registrationDate?.toISOString() || null}, 
                  ${input.targetCertification}, ${credit.id}, 'not_started')
        `);
      }

      return { success: true, creditsInitialized: credits.length };
    }),

  /**
   * Get project LEED tracking status
   */
  getProjectLeedTracking: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        SELECT plt.*, lc.creditCode, lc.creditName, lc.category, lc.creditType, lc.maxPoints,
               lc.impactDecarbonization, lc.impactQualityOfLife, lc.impactEcologicalConservation
        FROM project_leed_tracking plt
        JOIN leed_credits lc ON plt.creditId = lc.id
        WHERE plt.projectId = ${input.projectId}
        ORDER BY lc.category, lc.creditCode
      `;

      const result = await db.execute(query);
      const tracking = Array.isArray(result[0]) ? result[0] : [];

      // Calculate summary
      let totalPointsTargeted = 0;
      let totalPointsAchieved = 0;
      let prerequisitesMet = 0;
      let prerequisitesTotal = 0;

      for (const t of tracking as any[]) {
        if (t.creditType === 'prerequisite') {
          prerequisitesTotal++;
          if (t.status === 'achieved') prerequisitesMet++;
        } else {
          totalPointsTargeted += t.pointsTargeted || 0;
          totalPointsAchieved += t.pointsAchieved || 0;
        }
      }

      // Determine certification level
      let projectedCertification = 'none';
      if (totalPointsAchieved >= 80) projectedCertification = 'platinum';
      else if (totalPointsAchieved >= 60) projectedCertification = 'gold';
      else if (totalPointsAchieved >= 50) projectedCertification = 'silver';
      else if (totalPointsAchieved >= 40) projectedCertification = 'certified';

      return {
        credits: tracking,
        summary: {
          totalPointsTargeted,
          totalPointsAchieved,
          prerequisitesMet,
          prerequisitesTotal,
          projectedCertification,
        },
      };
    }),

  /**
   * Update LEED credit status for a project
   */
  updateLeedCreditStatus: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      creditId: z.number(),
      status: z.enum(['not_started', 'in_progress', 'submitted', 'achieved', 'denied', 'not_pursuing']),
      pointsTargeted: z.number().optional(),
      pointsAchieved: z.number().optional(),
      selectedPathway: z.string().optional(),
      documentationStatus: z.enum(['not_started', 'in_progress', 'complete', 'submitted']).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.execute(sql`
        UPDATE project_leed_tracking 
        SET status = ${input.status},
            pointsTargeted = COALESCE(${input.pointsTargeted || null}, pointsTargeted),
            pointsAchieved = COALESCE(${input.pointsAchieved || null}, pointsAchieved),
            selectedPathway = COALESCE(${input.selectedPathway || null}, selectedPathway),
            documentationStatus = COALESCE(${input.documentationStatus || null}, documentationStatus),
            notes = COALESCE(${input.notes || null}, notes),
            updatedAt = NOW()
        WHERE projectId = ${input.projectId} AND creditId = ${input.creditId}
      `);

      return { success: true };
    }),

  // ============================================================================
  // LEED v5 REFRIGERANT MANAGEMENT
  // ============================================================================

  /**
   * Record refrigerant equipment
   */
  recordRefrigerantEquipment: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      equipmentName: z.string(),
      equipmentType: z.enum(['hvac', 'heat_pump', 'chiller', 'refrigeration', 'data_center', 'other']),
      refrigerantType: z.string(),
      refrigerantGwp: z.number(),
      chargeAmount: z.number(), // kg
      installDate: z.date().optional(),
      expectedLifespan: z.number().optional(),
      leakDetectionSystem: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate total GWP charge
      const totalGwpCharge = input.chargeAmount * input.refrigerantGwp / 1000; // Convert to tCO2e

      // Determine LEED v5 benchmark based on equipment type
      let gwpBenchmark = 700; // Default for HVAC
      if (input.equipmentType === 'heat_pump') gwpBenchmark = 1400;
      else if (input.equipmentType === 'refrigeration' || input.equipmentType === 'data_center') gwpBenchmark = 300;

      const meetsLeedBenchmark = input.refrigerantGwp <= gwpBenchmark ? 1 : 0;

      await db.execute(sql`
        INSERT INTO refrigerant_inventory 
        (projectId, assetId, equipmentName, equipmentType, refrigerantType, refrigerantGwp, 
         chargeAmount, totalGwpCharge, gwpBenchmark, meetsLeedBenchmark, leakDetectionSystem,
         installDate, expectedLifespan, notes)
        VALUES (${input.projectId}, ${input.assetId || null}, ${input.equipmentName}, 
                ${input.equipmentType}, ${input.refrigerantType}, ${input.refrigerantGwp},
                ${input.chargeAmount}, ${totalGwpCharge}, ${gwpBenchmark}, ${meetsLeedBenchmark},
                ${input.leakDetectionSystem ? 1 : 0}, ${input.installDate?.toISOString() || null},
                ${input.expectedLifespan || null}, ${input.notes || null})
      `);

      return { 
        success: true, 
        totalGwpCharge: Math.round(totalGwpCharge * 100) / 100,
        meetsLeedBenchmark: meetsLeedBenchmark === 1,
        gwpBenchmark,
      };
    }),

  /**
   * Get refrigerant inventory for a project
   */
  getRefrigerantInventory: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query;
      if (input.assetId) {
        query = sql`SELECT * FROM refrigerant_inventory WHERE projectId = ${input.projectId} AND assetId = ${input.assetId}`;
      } else {
        query = sql`SELECT * FROM refrigerant_inventory WHERE projectId = ${input.projectId}`;
      }

      const result = await db.execute(query);
      const inventory = Array.isArray(result[0]) ? result[0] : [];

      // Calculate summary
      let totalGwpCharge = 0;
      let equipmentMeetingBenchmark = 0;
      for (const item of inventory as any[]) {
        totalGwpCharge += parseFloat(item.totalGwpCharge || 0);
        if (item.meetsLeedBenchmark) equipmentMeetingBenchmark++;
      }

      return {
        inventory,
        summary: {
          totalEquipment: inventory.length,
          totalGwpCharge: Math.round(totalGwpCharge * 100) / 100,
          equipmentMeetingBenchmark,
          complianceRate: inventory.length > 0 
            ? Math.round((equipmentMeetingBenchmark / inventory.length) * 100) 
            : 0,
        },
      };
    }),

  // ============================================================================
  // LEED v5 OPERATIONAL CARBON TRACKING
  // ============================================================================

  /**
   * Record operational carbon emissions
   */
  recordOperationalCarbon: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      recordDate: z.date(),
      recordPeriod: z.enum(['monthly', 'quarterly', 'annual']),
      province: z.string().default('Alberta'),
      // Scope 1
      scope1NaturalGas: z.number().optional(), // tCO2e
      scope1Propane: z.number().optional(),
      scope1Diesel: z.number().optional(),
      scope1Refrigerants: z.number().optional(),
      scope1Other: z.number().optional(),
      // Scope 2
      electricityKwh: z.number().optional(),
      scope2DistrictHeating: z.number().optional(),
      scope2DistrictCooling: z.number().optional(),
      scope2Method: z.enum(['location_based', 'market_based']).default('location_based'),
      // Scope 3 (optional)
      scope3Commuting: z.number().optional(),
      scope3Waste: z.number().optional(),
      scope3WaterSupply: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get grid emission factor for the province
      const gridResult = await db.execute(sql`
        SELECT avgEmissionFactor FROM grid_carbon_intensity 
        WHERE region = ${input.province} AND year = 2024 LIMIT 1
      `);
      const gridData = Array.isArray(gridResult[0]) && gridResult[0].length > 0 
        ? (gridResult[0][0] as any) 
        : { avgEmissionFactor: 540 }; // Default to Alberta if not found

      const gridEmissionFactor = parseFloat(gridData.avgEmissionFactor);

      // Calculate Scope 2 electricity emissions
      const scope2Electricity = input.electricityKwh 
        ? (input.electricityKwh * gridEmissionFactor / 1000000) // Convert g to tonnes
        : 0;

      // Calculate totals
      const scope1Total = (input.scope1NaturalGas || 0) + (input.scope1Propane || 0) + 
                          (input.scope1Diesel || 0) + (input.scope1Refrigerants || 0) + 
                          (input.scope1Other || 0);
      const scope2Total = scope2Electricity + (input.scope2DistrictHeating || 0) + 
                          (input.scope2DistrictCooling || 0);
      const scope3Total = (input.scope3Commuting || 0) + (input.scope3Waste || 0) + 
                          (input.scope3WaterSupply || 0);
      const totalEmissions = scope1Total + scope2Total + scope3Total;

      await db.execute(sql`
        INSERT INTO operational_carbon_tracking 
        (projectId, assetId, recordDate, recordPeriod, scope1Natural_gas, scope1Propane, 
         scope1Diesel, scope1Refrigerants, scope1Other, scope1Total, scope2Electricity,
         scope2DistrictHeating, scope2DistrictCooling, scope2Total, scope2Method, gridEmissionFactor,
         scope3Commuting, scope3Waste, scope3WaterSupply, scope3Total, totalEmissions,
         electricityKwh, notes, createdBy)
        VALUES (${input.projectId}, ${input.assetId || null}, ${input.recordDate.toISOString()}, 
                ${input.recordPeriod}, ${input.scope1NaturalGas || null}, ${input.scope1Propane || null},
                ${input.scope1Diesel || null}, ${input.scope1Refrigerants || null}, ${input.scope1Other || null},
                ${scope1Total}, ${scope2Electricity}, ${input.scope2DistrictHeating || null},
                ${input.scope2DistrictCooling || null}, ${scope2Total}, ${input.scope2Method},
                ${gridEmissionFactor}, ${input.scope3Commuting || null}, ${input.scope3Waste || null},
                ${input.scope3WaterSupply || null}, ${scope3Total}, ${totalEmissions},
                ${input.electricityKwh || null}, ${input.notes || null}, ${ctx.user?.id || null})
      `);

      return { 
        success: true,
        emissions: {
          scope1Total: Math.round(scope1Total * 1000) / 1000,
          scope2Total: Math.round(scope2Total * 1000) / 1000,
          scope3Total: Math.round(scope3Total * 1000) / 1000,
          totalEmissions: Math.round(totalEmissions * 1000) / 1000,
        },
        gridEmissionFactor,
      };
    }),

  /**
   * Get operational carbon history for a project
   */
  getOperationalCarbonHistory: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      assetId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query;
      if (input.assetId) {
        query = sql`SELECT * FROM operational_carbon_tracking WHERE projectId = ${input.projectId} AND assetId = ${input.assetId} ORDER BY recordDate DESC`;
      } else {
        query = sql`SELECT * FROM operational_carbon_tracking WHERE projectId = ${input.projectId} ORDER BY recordDate DESC`;
      }

      const result = await db.execute(query);
      const records = Array.isArray(result[0]) ? result[0] : [];

      // Calculate summary
      let totalScope1 = 0, totalScope2 = 0, totalScope3 = 0;
      for (const r of records as any[]) {
        totalScope1 += parseFloat(r.scope1Total || 0);
        totalScope2 += parseFloat(r.scope2Total || 0);
        totalScope3 += parseFloat(r.scope3Total || 0);
      }

      return {
        records,
        summary: {
          totalScope1: Math.round(totalScope1 * 1000) / 1000,
          totalScope2: Math.round(totalScope2 * 1000) / 1000,
          totalScope3: Math.round(totalScope3 * 1000) / 1000,
          totalEmissions: Math.round((totalScope1 + totalScope2 + totalScope3) * 1000) / 1000,
          recordCount: records.length,
        },
      };
    }),

  // ============================================================================
  // LEED v5 BUILDING PERFORMANCE FACTORS
  // ============================================================================

  /**
   * Get building performance factors by type and climate zone
   */
  getBuildingPerformanceFactors: protectedProcedure
    .input(z.object({
      buildingType: z.string().optional(),
      climateZone: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query;
      if (input.buildingType && input.climateZone) {
        query = sql`SELECT * FROM building_performance_factors WHERE buildingType = ${input.buildingType} AND climateZone = ${input.climateZone}`;
      } else if (input.buildingType) {
        query = sql`SELECT * FROM building_performance_factors WHERE buildingType = ${input.buildingType} ORDER BY climateZone`;
      } else if (input.climateZone) {
        query = sql`SELECT * FROM building_performance_factors WHERE climateZone = ${input.climateZone} ORDER BY buildingType`;
      } else {
        query = sql`SELECT * FROM building_performance_factors ORDER BY buildingType, climateZone`;
      }

      const result = await db.execute(query);
      return Array.isArray(result[0]) ? result[0] : [];
    }),

  // ============================================================================
  // AI CARBON REDUCTION RECOMMENDATIONS
  // ============================================================================

  /**
   * Get AI-powered carbon reduction recommendations for a project
   */
  getAICarbonRecommendations: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      province: z.string().default("Alberta"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get project utility data
      const utilityResult = await db.execute(sql`
        SELECT utilityType, SUM(CAST(consumption AS DECIMAL(15,2))) as totalConsumption
        FROM utility_consumption
        WHERE projectId = ${input.projectId}
        GROUP BY utilityType
      `);
      const utilities = Array.isArray(utilityResult[0]) ? utilityResult[0] : [];

      // Get operational carbon data
      const carbonResult = await db.execute(sql`
        SELECT 
          SUM(CAST(scope1Total AS DECIMAL(15,4))) as totalScope1,
          SUM(CAST(scope2Total AS DECIMAL(15,4))) as totalScope2,
          SUM(CAST(totalEmissions AS DECIMAL(15,4))) as totalEmissions
        FROM operational_carbon_tracking
        WHERE projectId = ${input.projectId}
      `);
      const carbonData = Array.isArray(carbonResult[0]) && carbonResult[0].length > 0 
        ? (carbonResult[0][0] as any) 
        : { totalScope1: 0, totalScope2: 0, totalEmissions: 0 };

      // Get green upgrades already planned/completed
      const upgradesResult = await db.execute(sql`
        SELECT upgradeType, status FROM green_upgrades WHERE projectId = ${input.projectId}
      `);
      const existingUpgrades = Array.isArray(upgradesResult[0]) ? upgradesResult[0] : [];
      const existingTypes = new Set((existingUpgrades as any[]).map(u => u.upgradeType));

      // Get grid emission factor for the province
      const gridFactor = leedCalc.CANADIAN_EMISSION_FACTORS.electricity[
        input.province.toLowerCase() as keyof typeof leedCalc.CANADIAN_EMISSION_FACTORS.electricity
      ] || leedCalc.CANADIAN_EMISSION_FACTORS.electricity.national_avg;

      // Generate recommendations based on data
      const recommendations: Array<{
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        category: 'operational' | 'embodied' | 'renewable';
        estimatedSavings: number | null;
        estimatedCost: number | null;
        paybackYears: number | null;
      }> = [];

      // Electricity-based recommendations
      const electricityData = (utilities as any[]).find(u => u.utilityType === 'electricity');
      if (electricityData && parseFloat(electricityData.totalConsumption) > 0) {
        const consumption = parseFloat(electricityData.totalConsumption);
        
        // LED Lighting
        if (!existingTypes.has('lighting')) {
          const savings = consumption * 0.30 * gridFactor / 1000;
          recommendations.push({
            title: "LED Lighting Retrofit",
            description: "Replace existing lighting with LED fixtures to reduce electricity consumption by up to 30%. LEDs also produce less heat, reducing cooling loads.",
            priority: savings > 10 ? 'high' : 'medium',
            category: 'operational',
            estimatedSavings: Math.round(savings * 10) / 10,
            estimatedCost: Math.round(consumption * 0.15),
            paybackYears: Math.round((consumption * 0.15) / (savings * 150) * 10) / 10,
          });
        }

        // Building Automation
        if (!existingTypes.has('building_automation')) {
          const savings = consumption * 0.15 * gridFactor / 1000;
          recommendations.push({
            title: "Building Automation System",
            description: "Install smart building controls to optimize HVAC scheduling, lighting, and equipment operation based on occupancy and weather.",
            priority: 'medium',
            category: 'operational',
            estimatedSavings: Math.round(savings * 10) / 10,
            estimatedCost: Math.round(consumption * 0.25),
            paybackYears: Math.round((consumption * 0.25) / (savings * 150) * 10) / 10,
          });
        }

        // Solar PV (especially for high-carbon grids)
        if (!existingTypes.has('solar') && gridFactor > 200) {
          const savings = consumption * 0.25 * gridFactor / 1000;
          recommendations.push({
            title: "Rooftop Solar PV Installation",
            description: `With ${input.province}'s grid emission factor of ${gridFactor} g CO₂e/kWh, on-site solar generation provides significant carbon reduction benefits.`,
            priority: gridFactor > 400 ? 'high' : 'medium',
            category: 'renewable',
            estimatedSavings: Math.round(savings * 10) / 10,
            estimatedCost: Math.round(consumption * 0.8),
            paybackYears: Math.round((consumption * 0.8) / (savings * 150) * 10) / 10,
          });
        }
      }

      // Natural gas recommendations
      const gasData = (utilities as any[]).find(u => u.utilityType === 'natural_gas');
      if (gasData && parseFloat(gasData.totalConsumption) > 0) {
        const consumption = parseFloat(gasData.totalConsumption);
        
        // High-efficiency boiler
        if (!existingTypes.has('boiler')) {
          const savings = consumption * 0.15 * leedCalc.CANADIAN_EMISSION_FACTORS.natural_gas / 1000;
          recommendations.push({
            title: "High-Efficiency Condensing Boiler",
            description: "Replace aging boilers with 95%+ efficiency condensing units. Modern boilers can reduce natural gas consumption by 15-20%.",
            priority: savings > 5 ? 'high' : 'medium',
            category: 'operational',
            estimatedSavings: Math.round(savings * 10) / 10,
            estimatedCost: Math.round(consumption * 0.5),
            paybackYears: Math.round((consumption * 0.5) / (savings * 150) * 10) / 10,
          });
        }

        // Heat pump conversion
        if (!existingTypes.has('hvac') && gridFactor < 200) {
          const savings = consumption * 0.40 * leedCalc.CANADIAN_EMISSION_FACTORS.natural_gas / 1000;
          recommendations.push({
            title: "Electric Heat Pump Conversion",
            description: `With ${input.province}'s clean electricity grid (${gridFactor} g CO₂e/kWh), converting to electric heat pumps can significantly reduce emissions.`,
            priority: 'high',
            category: 'operational',
            estimatedSavings: Math.round(savings * 10) / 10,
            estimatedCost: Math.round(consumption * 1.2),
            paybackYears: Math.round((consumption * 1.2) / (savings * 150) * 10) / 10,
          });
        }
      }

      // Water recommendations
      const waterData = (utilities as any[]).find(u => u.utilityType === 'water');
      if (waterData && parseFloat(waterData.totalConsumption) > 0) {
        if (!existingTypes.has('water_fixtures')) {
          const consumption = parseFloat(waterData.totalConsumption);
          const savings = consumption * 0.30 * leedCalc.CANADIAN_EMISSION_FACTORS.water / 1000000;
          recommendations.push({
            title: "Low-Flow Water Fixtures",
            description: "Install low-flow faucets, toilets, and showerheads to reduce water consumption by up to 30%. Also reduces water heating energy.",
            priority: 'low',
            category: 'operational',
            estimatedSavings: Math.round(savings * 100) / 100,
            estimatedCost: Math.round(consumption * 0.01),
            paybackYears: Math.round((consumption * 0.01) / (savings * 150) * 10) / 10 || 2,
          });
        }
      }

      // Building envelope recommendations
      if (!existingTypes.has('insulation') && !existingTypes.has('windows')) {
        recommendations.push({
          title: "Building Envelope Improvements",
          description: "Upgrade insulation and windows to reduce heating and cooling loads. Prioritize areas with highest heat loss based on thermal imaging.",
          priority: 'medium',
          category: 'operational',
          estimatedSavings: null,
          estimatedCost: null,
          paybackYears: null,
        });
      }

      // Embodied carbon recommendations
      recommendations.push({
        title: "Low-Carbon Material Specifications",
        description: "For future renovations, specify materials with Environmental Product Declarations (EPDs) and lower Global Warming Potential. Prioritize concrete with supplementary cite materials and recycled steel.",
        priority: 'low',
        category: 'embodied',
        estimatedSavings: null,
        estimatedCost: null,
        paybackYears: null,
      });

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return recommendations;
    }),

  // ============================================================================
  // LEED COMPLIANCE REPORT DATA
  // ============================================================================

  /**
   * Get comprehensive LEED compliance report data for a project
   */
  getLeedComplianceReportData: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get project info
      const projectResult = await db.execute(sql`
        SELECT id, name, address, city, province, yearBuilt, propertyType, constructionType
        FROM projects WHERE id = ${input.projectId}
      `);
      const project = Array.isArray(projectResult[0]) && projectResult[0].length > 0 
        ? (projectResult[0][0] as any) 
        : null;

      if (!project) {
        throw new Error("Project not found");
      }

      // Get LEED tracking data
      const trackingResult = await db.execute(sql`
        SELECT plt.*, lc.creditCode, lc.creditName, lc.category, lc.creditType, lc.maxPoints,
               lc.description, lc.requirements, lc.documentationRequired,
               lc.impactDecarbonization, lc.impactQualityOfLife, lc.impactEcologicalConservation
        FROM project_leed_tracking plt
        JOIN leed_credits lc ON plt.creditId = lc.id
        WHERE plt.projectId = ${input.projectId}
        ORDER BY lc.category, lc.creditCode
      `);
      const tracking = Array.isArray(trackingResult[0]) ? trackingResult[0] : [];

      // Calculate summary by category
      const byCategory: Record<string, {
        achieved: number;
        targeted: number;
        maxPoints: number;
        credits: any[];
        prerequisites: any[];
      }> = {};

      let totalAchieved = 0;
      let totalTargeted = 0;
      let prerequisitesMet = 0;
      let prerequisitesTotal = 0;

      for (const credit of tracking as any[]) {
        const cat = credit.category;
        if (!byCategory[cat]) {
          byCategory[cat] = { achieved: 0, targeted: 0, maxPoints: 0, credits: [], prerequisites: [] };
        }

        if (credit.creditType === 'prerequisite') {
          prerequisitesTotal++;
          if (credit.status === 'achieved') prerequisitesMet++;
          byCategory[cat].prerequisites.push(credit);
        } else {
          byCategory[cat].achieved += credit.pointsAchieved || 0;
          byCategory[cat].targeted += credit.pointsTargeted || 0;
          byCategory[cat].maxPoints += credit.maxPoints || 0;
          byCategory[cat].credits.push(credit);
          totalAchieved += credit.pointsAchieved || 0;
          totalTargeted += credit.pointsTargeted || 0;
        }
      }

      // Determine certification level
      let certificationLevel = 'Not Certified';
      if (totalAchieved >= 80) certificationLevel = 'Platinum';
      else if (totalAchieved >= 60) certificationLevel = 'Gold';
      else if (totalAchieved >= 50) certificationLevel = 'Silver';
      else if (totalAchieved >= 40) certificationLevel = 'Certified';

      // Get documentation status summary
      const docStatusResult = await db.execute(sql`
        SELECT documentationStatus, COUNT(*) as count
        FROM project_leed_tracking
        WHERE projectId = ${input.projectId}
        GROUP BY documentationStatus
      `);
      const docStatus = Array.isArray(docStatusResult[0]) ? docStatusResult[0] : [];

      // Get action items (credits not started or in progress)
      const actionItems = (tracking as any[])
        .filter(c => c.status === 'not_started' || c.status === 'in_progress')
        .filter(c => c.creditType !== 'prerequisite' || c.status !== 'achieved')
        .map(c => ({
          creditCode: c.creditCode,
          creditName: c.creditName,
          category: c.category,
          status: c.status,
          documentationStatus: c.documentationStatus,
          maxPoints: c.maxPoints,
          requirements: c.requirements,
          documentationRequired: c.documentationRequired,
        }));

      return {
        project: {
          id: project.id,
          name: project.name,
          address: project.address,
          city: project.city,
          province: project.province,
          yearBuilt: project.yearBuilt,
          propertyType: project.propertyType,
          constructionType: project.constructionType,
        },
        summary: {
          totalAchieved,
          totalTargeted,
          maxPossible: 110,
          certificationLevel,
          prerequisitesMet,
          prerequisitesTotal,
          allPrerequisitesMet: prerequisitesMet === prerequisitesTotal,
        },
        byCategory,
        documentationStatus: docStatus,
        actionItems,
        generatedAt: new Date().toISOString(),
      };
    }),
});
