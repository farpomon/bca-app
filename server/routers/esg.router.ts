import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as esgDb from "../db/esg.db";
import * as emissionsCalc from "../services/emissionsCalculator.service";
import * as esgScoring from "../services/esgScoring.service";

export const esgRouter = router({
  // Utility consumption tracking
  recordUtilityData: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      recordDate: z.date(),
      utilityType: z.enum(["electricity", "natural_gas", "water", "steam", "chilled_water"]),
      consumption: z.string(), // decimal as string
      unit: z.string(),
      cost: z.string().optional(),
      source: z.string().optional(),
      isRenewable: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await esgDb.recordUtilityConsumption(input);
      return { success: true };
    }),

  getUtilityConsumption: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return esgDb.getUtilityConsumption(input.projectId, input.startDate, input.endDate);
    }),

  // Waste tracking
  recordWaste: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      recordDate: z.date(),
      wasteType: z.enum(["general", "recycling", "compost", "hazardous", "construction"]),
      weight: z.string(), // decimal as string
      unit: z.string(),
      disposalMethod: z.string().optional(),
      cost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await esgDb.recordWaste(input);
      return { success: true };
    }),

  getWasteTracking: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return esgDb.getWasteTracking(input.projectId, input.startDate, input.endDate);
    }),

  // Carbon footprint calculation
  calculateCarbonFootprint: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      // Get utility and waste data
      const utilityData = await esgDb.getUtilityConsumption(input.projectId, input.startDate, input.endDate);
      const wasteData = await esgDb.getWasteTracking(input.projectId, input.startDate, input.endDate);
      
      // Transform data for calculation
      const utilities = utilityData.map(u => ({
        type: u.utilityType,
        consumption: parseFloat(u.consumption),
        unit: u.unit,
        isRenewable: u.isRenewable || false,
      }));
      
      const waste = wasteData.map(w => ({
        type: w.wasteType,
        weight: parseFloat(w.weight),
        unit: w.unit,
      }));
      
      // Calculate water consumption
      const waterConsumption = utilityData
        .filter(u => u.utilityType === "water")
        .reduce((sum, u) => sum + parseFloat(u.consumption), 0);
      
      // Calculate carbon footprint
      const footprint = await emissionsCalc.calculateFacilityCarbonFootprint(
        input.projectId,
        utilities,
        waste,
        waterConsumption
      );
      
      // Store emissions data
      for (const emission of footprint.breakdown) {
        await esgDb.recordEmissions({
          projectId: input.projectId,
          recordDate: footprint.calculationDate,
          scope: emission.scope,
          emissionSource: emission.source,
          co2Equivalent: emission.co2Equivalent.toString(),
          calculationMethod: `EPA Emission Factor: ${emission.emissionFactor}`,
        });
      }
      
      return footprint;
    }),

  getEmissionsData: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return esgDb.getEmissionsData(input.projectId, input.startDate, input.endDate);
    }),

  // ESG scoring
  calculateESGScore: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      buildingSquareFeet: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      // Get data for scoring period
      const utilityData = await esgDb.getUtilityConsumption(input.projectId, input.startDate, input.endDate);
      const wasteData = await esgDb.getWasteTracking(input.projectId, input.startDate, input.endDate);
      const emissionsData = await esgDb.getEmissionsData(input.projectId, input.startDate, input.endDate);
      
      // Calculate totals
      const energyConsumption = utilityData
        .filter(u => u.utilityType === "electricity")
        .reduce((sum, u) => sum + parseFloat(u.consumption), 0);
      
      const renewableEnergy = utilityData
        .filter(u => u.utilityType === "electricity" && u.isRenewable)
        .reduce((sum, u) => sum + parseFloat(u.consumption), 0);
      
      const renewablePercentage = energyConsumption > 0 ? (renewableEnergy / energyConsumption) * 100 : 0;
      
      const waterConsumption = utilityData
        .filter(u => u.utilityType === "water")
        .reduce((sum, u) => sum + parseFloat(u.consumption), 0);
      
      const totalWaste = wasteData.reduce((sum, w) => sum + parseFloat(w.weight), 0);
      const recycled = wasteData
        .filter(w => w.wasteType === "recycling")
        .reduce((sum, w) => sum + parseFloat(w.weight), 0);
      const composted = wasteData
        .filter(w => w.wasteType === "compost")
        .reduce((sum, w) => sum + parseFloat(w.weight), 0);
      
      const totalEmissions = emissionsData.reduce((sum, e) => sum + parseFloat(e.co2Equivalent), 0);
      
      // Calculate scores
      const scores = esgScoring.calculateESGScore(
        energyConsumption,
        waterConsumption,
        totalWaste,
        recycled,
        composted,
        totalEmissions,
        input.buildingSquareFeet,
        renewablePercentage
      );
      
      // Store scores
      await esgDb.recordESGScore({
        projectId: input.projectId,
        scoreDate: new Date().toISOString(),
        energyScore: scores.energyScore.toString(),
        waterScore: scores.waterScore.toString(),
        wasteScore: scores.wasteScore.toString(),
        emissionsScore: scores.emissionsScore.toString(),
        compositeScore: scores.compositeScore.toString(),
      });
      
      return scores;
    }),

  getESGScores: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      return esgDb.getESGScores(input.projectId);
    }),

  // Sustainability goals
  createGoal: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      goalType: z.enum(["energy_reduction", "water_reduction", "waste_reduction", "carbon_reduction", "renewable_energy"]),
      baselineValue: z.string(),
      baselineYear: z.number(),
      targetValue: z.string(),
      targetYear: z.number(),
      unit: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await esgDb.createGoal(input);
      return { success: true };
    }),

  getGoals: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return esgDb.getGoals(input.projectId);
    }),

  updateGoalStatus: protectedProcedure
    .input(z.object({
      goalId: z.number(),
      status: z.enum(["active", "achieved", "missed", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      await esgDb.updateGoalStatus(input.goalId, input.status);
      return { success: true };
    }),

  // Green upgrades
  recordGreenUpgrade: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      upgradeName: z.string(),
      upgradeType: z.enum(["hvac", "lighting", "insulation", "windows", "solar", "geothermal", "water_fixtures", "building_automation"]),
      installDate: z.date().optional(),
      cost: z.string(),
      estimatedAnnualSavings: z.string().optional(),
      energySavingsKWh: z.string().optional(),
      waterSavingsGallons: z.string().optional(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]).default("planned"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Calculate CO2 reduction if savings provided
      let co2Reduction = 0;
      if (input.energySavingsKWh || input.waterSavingsGallons) {
        co2Reduction = emissionsCalc.calculateEmissionsReduction(
          parseFloat(input.energySavingsKWh || "0"),
          parseFloat(input.waterSavingsGallons || "0")
        );
      }
      
      // Calculate payback period
      let paybackPeriod = null;
      if (input.estimatedAnnualSavings && parseFloat(input.estimatedAnnualSavings) > 0) {
        paybackPeriod = (parseFloat(input.cost) / parseFloat(input.estimatedAnnualSavings)).toString();
      }
      
      await esgDb.recordGreenUpgrade({
        ...input,
        co2ReductionMT: co2Reduction > 0 ? co2Reduction.toString() : undefined,
        paybackPeriod,
      });
      
      return { success: true, co2Reduction, paybackPeriod };
    }),

  getGreenUpgrades: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      return esgDb.getGreenUpgrades(input.projectId);
    }),

  updateGreenUpgrade: protectedProcedure
    .input(z.object({
      upgradeId: z.number(),
      actualAnnualSavings: z.string().optional(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { upgradeId, ...data } = input;
      await esgDb.updateGreenUpgrade(upgradeId, data);
      return { success: true };
    }),
});
