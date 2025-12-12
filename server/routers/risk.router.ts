import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createRiskAssessment,
  getRiskAssessmentById,
  getRiskAssessmentByAssessmentId,
  listRiskAssessments,
  updateRiskAssessment,
  deleteRiskAssessment,
  createPofFactors,
  getPofFactorsByRiskAssessmentId,
  updatePofFactors,
  createCofFactors,
  getCofFactorsByRiskAssessmentId,
  updateCofFactors,
  createCriticalEquipment,
  getCriticalEquipmentByAssessmentId,
  listCriticalEquipment,
  updateCriticalEquipment,
  deleteCriticalEquipment,
  createMitigationAction,
  getMitigationActionsByRiskAssessmentId,
  updateMitigationAction,
  deleteMitigationAction,
  getPortfolioRiskMetrics,
} from "../db/risk.db";
import { calculatePoF, type PofInputs } from "../services/pofCalculator.service";
import { calculateCoF, type CofInputs } from "../services/cofCalculator.service";
import { calculateRiskScore, getRiskMatrix } from "../services/riskMatrix.service";

export const riskRouter = router({
  /**
   * Assess component risk (calculate PoF, CoF, and risk score)
   */
  assessComponent: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        pofInputs: z.object({
          age: z.number().optional(),
          expectedUsefulLife: z.number().optional(),
          conditionIndex: z.number().optional(),
          defectSeverity: z.enum(["none", "minor", "moderate", "major", "critical"]).optional(),
          maintenanceFrequency: z.enum(["none", "reactive", "scheduled", "preventive", "predictive"]).optional(),
          deferredMaintenanceYears: z.number().optional(),
          operatingEnvironment: z.enum(["controlled", "normal", "harsh", "extreme"]).optional(),
          utilizationRate: z.number().optional(),
          equipmentType: z.string().optional(),
        }),
        cofInputs: z.object({
          safetyImpact: z.number().optional(),
          safetyNotes: z.string().optional(),
          operationalImpact: z.number().optional(),
          downtimeDays: z.number().optional(),
          affectedSystems: z.array(z.string()).optional(),
          operationalNotes: z.string().optional(),
          financialImpact: z.number().optional(),
          repairCost: z.number().optional(),
          revenueLoss: z.number().optional(),
          penaltyCost: z.number().optional(),
          financialNotes: z.string().optional(),
          environmentalImpact: z.number().optional(),
          environmentalNotes: z.string().optional(),
          reputationalImpact: z.number().optional(),
          reputationalNotes: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate PoF
      const pofResult = calculatePoF(input.pofInputs as PofInputs);
      
      // Calculate CoF
      const cofResult = calculateCoF(input.cofInputs as CofInputs);
      
      // Calculate risk score
      const riskResult = calculateRiskScore(pofResult.pof, cofResult.cof);
      
      // Create risk assessment
      const riskAssessmentId = await createRiskAssessment({
        assessmentId: input.assessmentId,
        pof: pofResult.pof.toString(),
        pofJustification: pofResult.justification,
        cof: cofResult.cof.toString(),
        cofJustification: cofResult.justification,
        riskScore: riskResult.riskScore.toString(),
        riskLevel: riskResult.riskLevel,
        assessedBy: ctx.user.id,
        status: "draft",
      });
      
      // Create PoF factors
      await createPofFactors({
        riskAssessmentId,
        age: input.pofInputs.age,
        expectedUsefulLife: input.pofInputs.expectedUsefulLife,
        remainingLifePercent: pofResult.remainingLifePercent.toString(),
        conditionIndex: input.pofInputs.conditionIndex?.toString(),
        defectSeverity: input.pofInputs.defectSeverity,
        maintenanceFrequency: input.pofInputs.maintenanceFrequency,
        deferredMaintenanceYears: input.pofInputs.deferredMaintenanceYears,
        operatingEnvironment: input.pofInputs.operatingEnvironment,
        utilizationRate: input.pofInputs.utilizationRate?.toString(),
        equipmentType: input.pofInputs.equipmentType,
      });
      
      // Create CoF factors
      await createCofFactors({
        riskAssessmentId,
        safetyImpact: (input.cofInputs.safetyImpact || 1).toString(),
        safetyNotes: input.cofInputs.safetyNotes,
        operationalImpact: (input.cofInputs.operationalImpact || 1).toString(),
        downtimeDays: input.cofInputs.downtimeDays?.toString(),
        affectedSystems: input.cofInputs.affectedSystems ? JSON.stringify(input.cofInputs.affectedSystems) : null,
        operationalNotes: input.cofInputs.operationalNotes,
        financialImpact: (input.cofInputs.financialImpact || 1).toString(),
        repairCost: input.cofInputs.repairCost?.toString(),
        revenueLoss: input.cofInputs.revenueLoss?.toString(),
        penaltyCost: input.cofInputs.penaltyCost?.toString(),
        financialNotes: input.cofInputs.financialNotes,
        environmentalImpact: (input.cofInputs.environmentalImpact || 1).toString(),
        environmentalNotes: input.cofInputs.environmentalNotes,
        reputationalImpact: (input.cofInputs.reputationalImpact || 1).toString(),
        reputationalNotes: input.cofInputs.reputationalNotes,
      });
      
      return {
        riskAssessmentId,
        pof: pofResult,
        cof: cofResult,
        risk: riskResult,
      };
    }),

  /**
   * Get risk assessment by ID
   */
  getAssessment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const assessment = await getRiskAssessmentById(input.id);
      if (!assessment) return null;
      
      const pofFactorsData = await getPofFactorsByRiskAssessmentId(input.id);
      const cofFactorsData = await getCofFactorsByRiskAssessmentId(input.id);
      const mitigations = await getMitigationActionsByRiskAssessmentId(input.id);
      
      return {
        ...assessment,
        pofFactors: pofFactorsData,
        cofFactors: cofFactorsData,
        mitigations,
      };
    }),

  /**
   * Get risk assessment by assessment ID
   */
  getByAssessmentId: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const assessment = await getRiskAssessmentByAssessmentId(input.assessmentId);
      if (!assessment) return null;
      
      const pofFactorsData = await getPofFactorsByRiskAssessmentId(assessment.id);
      const cofFactorsData = await getCofFactorsByRiskAssessmentId(assessment.id);
      const mitigations = await getMitigationActionsByRiskAssessmentId(assessment.id);
      
      return {
        ...assessment,
        pofFactors: pofFactorsData,
        cofFactors: cofFactorsData,
        mitigations,
      };
    }),

  /**
   * List all risk assessments
   */
  listAssessments: protectedProcedure
    .input(
      z.object({
        riskLevel: z.string().optional(),
        status: z.string().optional(),
        projectId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await listRiskAssessments(input);
    }),

  /**
   * Update risk assessment status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "approved", "archived"]),
        reviewedBy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateRiskAssessment(input.id, {
        status: input.status,
        reviewedBy: input.reviewedBy,
        reviewedAt: input.status === "approved" ? new Date() : undefined,
      });
      
      return { success: true };
    }),

  /**
   * Delete risk assessment
   */
  deleteAssessment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteRiskAssessment(input.id);
      return { success: true };
    }),

  /**
   * Get risk matrix
   */
  getRiskMatrix: protectedProcedure.query(async () => {
    return getRiskMatrix();
  }),

  /**
   * Get critical equipment list
   */
  getCriticalEquipment: protectedProcedure
    .input(z.object({ criticalityLevel: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await listCriticalEquipment(input?.criticalityLevel);
    }),

  /**
   * Update equipment criticality
   */
  updateCriticality: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        criticalityLevel: z.enum(["critical", "important", "standard"]),
        criticalityJustification: z.string().optional(),
        isSafetyRelated: z.boolean().optional(),
        isMissionCritical: z.boolean().optional(),
        isHighValue: z.boolean().optional(),
        hasRedundancy: z.boolean().optional(),
        mitigationStrategies: z.array(z.string()).optional(),
        contingencyPlan: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if critical equipment entry exists
      const existing = await getCriticalEquipmentByAssessmentId(input.assessmentId);
      
      const data = {
        assessmentId: input.assessmentId,
        criticalityLevel: input.criticalityLevel,
        criticalityJustification: input.criticalityJustification,
        isSafetyRelated: input.isSafetyRelated ? 1 : 0,
        isMissionCritical: input.isMissionCritical ? 1 : 0,
        isHighValue: input.isHighValue ? 1 : 0,
        hasRedundancy: input.hasRedundancy ? 1 : 0,
        mitigationStrategies: input.mitigationStrategies ? JSON.stringify(input.mitigationStrategies) : null,
        contingencyPlan: input.contingencyPlan,
        designatedBy: ctx.user.id,
      };
      
      if (existing) {
        await updateCriticalEquipment(input.assessmentId, data);
      } else {
        await createCriticalEquipment(data);
      }
      
      return { success: true };
    }),

  /**
   * Create mitigation action
   */
  createMitigation: protectedProcedure
    .input(
      z.object({
        riskAssessmentId: z.number(),
        action: z.string(),
        actionType: z.enum(["inspection", "maintenance", "repair", "replacement", "monitoring", "procedure_change", "training"]),
        priority: z.enum(["immediate", "high", "medium", "low"]),
        assignedTo: z.number().optional(),
        dueDate: z.date().optional(),
        estimatedCost: z.number().optional(),
        expectedRiskReduction: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createMitigationAction({
        riskAssessmentId: input.riskAssessmentId,
        action: input.action,
        actionType: input.actionType,
        priority: input.priority,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate?.toISOString(),
        estimatedCost: input.estimatedCost?.toString(),
        expectedRiskReduction: input.expectedRiskReduction?.toString(),
        notes: input.notes,
      });
      
      return { id };
    }),

  /**
   * Update mitigation action
   */
  updateMitigation: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
        completedDate: z.date().optional(),
        actualCost: z.number().optional(),
        actualRiskReduction: z.number().optional(),
        effectiveness: z.enum(["not_effective", "partially_effective", "effective", "highly_effective"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateMitigationAction(input.id, {
        status: input.status,
        completedDate: input.completedDate?.toISOString(),
        actualCost: input.actualCost?.toString(),
        actualRiskReduction: input.actualRiskReduction?.toString(),
        effectiveness: input.effectiveness,
        notes: input.notes,
      });
      
      return { success: true };
    }),

  /**
   * Delete mitigation action
   */
  deleteMitigation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMitigationAction(input.id);
      return { success: true };
    }),

  /**
   * Get portfolio risk metrics
   */
  getPortfolioMetrics: protectedProcedure.query(async () => {
    return await getPortfolioRiskMetrics();
  }),
});
