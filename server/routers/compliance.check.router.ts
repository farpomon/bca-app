import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Building Code Compliance Checking Router
 * AI-powered analysis of assessments against selected building codes
 */

export const complianceCheckRouter: ReturnType<typeof router> = router({
  /**
   * Check a single assessment for building code compliance
   */
  checkAssessmentCompliance: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch assessment with project and building code
      const assessment = await db.getAssessmentById(input.assessmentId);
      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      const project = await db.getProjectById(assessment.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or access denied",
        });
      }

      // Check if project has a building code selected
      if (!project.buildingCodeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Project does not have a building code selected. Please select a building code in project settings.",
        });
      }

      const buildingCode = await db.getBuildingCodeById(project.buildingCodeId);
      if (!buildingCode || !buildingCode.documentUrl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Building code document not found",
        });
      }

      // Prepare assessment context for AI
      const assessmentContext = {
        componentCode: assessment.componentCode,
        componentName: assessment.componentName,
        observations: assessment.observations || "No observations recorded",
        condition: assessment.condition,
        conditionPercentage: assessment.conditionPercentage,
        reviewYear: assessment.reviewYear,
        projectInfo: {
          name: project.name,
          propertyType: project.propertyType,
          constructionType: project.constructionType,
          yearBuilt: project.yearBuilt,
          numberOfStories: project.numberOfStories,
        },
      };

      // Call LLM with building code PDF context
      const prompt = `You are a building code compliance expert. Analyze the following building assessment against the provided building code document.

Building Code: ${buildingCode.title}
Jurisdiction: ${buildingCode.jurisdiction}

Assessment Details:
- Component: ${assessmentContext.componentName} (${assessmentContext.componentCode})
- Condition: ${assessmentContext.condition} (${assessmentContext.conditionPercentage}%)
- Observations: ${assessmentContext.observations}
- Review Year: ${assessmentContext.reviewYear}

Project Context:
- Property Type: ${assessmentContext.projectInfo.propertyType || "Not specified"}
- Construction Type: ${assessmentContext.projectInfo.constructionType || "Not specified"}
- Year Built: ${assessmentContext.projectInfo.yearBuilt || "Not specified"}
- Number of Stories: ${assessmentContext.projectInfo.numberOfStories || "Not specified"}

Task: Analyze this assessment for potential building code compliance issues. Return your analysis in the following JSON format:

{
  "status": "compliant" | "non_compliant" | "needs_review",
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "codeSection": "Specific code section reference (e.g., 'NBC 2020 Section 9.3.2.1')",
      "description": "Clear description of the compliance issue",
      "recommendation": "Specific action to address the issue"
    }
  ],
  "summary": "Brief overall compliance summary"
}

If the assessment is compliant, return an empty issues array. If you need more information to make a determination, set status to "needs_review" and explain what additional information is needed in the summary.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a building code compliance expert. Analyze assessments against building codes and provide structured compliance reports in JSON format.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "file_url",
                  file_url: {
                    url: buildingCode.documentUrl,
                    mime_type: "application/pdf",
                  },
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "compliance_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["compliant", "non_compliant", "needs_review"],
                    description: "Overall compliance status",
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                        codeSection: {
                          type: "string",
                          description: "Specific building code section reference",
                        },
                        description: {
                          type: "string",
                          description: "Description of the compliance issue",
                        },
                        recommendation: {
                          type: "string",
                          description: "Recommended action to address the issue",
                        },
                      },
                      required: ["severity", "codeSection", "description", "recommendation"],
                      additionalProperties: false,
                    },
                  },
                  summary: {
                    type: "string",
                    description: "Overall compliance summary",
                  },
                },
                required: ["status", "issues", "summary"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid AI response' });
        }
        const complianceResult = JSON.parse(content);

        // Update assessment with compliance results
        await db.updateAssessmentCompliance(input.assessmentId, {
          complianceStatus: complianceResult.status,
          complianceIssues: JSON.stringify(complianceResult.issues),
          complianceRecommendations: complianceResult.summary,
          complianceCheckedAt: new Date().toISOString(),
          complianceCheckedBy: ctx.user.id,
        });

        return {
          success: true,
          result: complianceResult,
          buildingCode: {
            title: buildingCode.title,
            code: buildingCode.code,
          },
        };
      } catch (error) {
        console.error("[Compliance Check] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to perform compliance check. Please try again.",
        });
      }
    }),

  /**
   * Bulk check multiple assessments for compliance
   */
  bulkCheckCompliance: protectedProcedure
    .input(z.object({
      assessmentIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      const errors = [];

      for (const assessmentId of input.assessmentIds) {
        try {
          const result = await (complianceCheckRouter as any).createCaller(ctx).checkAssessmentCompliance({
            assessmentId,
          });
          results.push({ assessmentId, ...result });
        } catch (error) {
          errors.push({
            assessmentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        results,
        errors,
        summary: {
          total: input.assessmentIds.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    }),
});
