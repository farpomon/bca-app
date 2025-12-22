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

Task: Analyze this assessment for potential building code compliance issues. Return your analysis in the following JSON format ONLY (no additional text):

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

If the assessment is compliant, return an empty issues array. If you need more information to make a determination, set status to "needs_review" and explain what additional information is needed in the summary.

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or additional text.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a building code compliance expert. Analyze assessments against building codes and provide structured compliance reports. Always respond with valid JSON only, no markdown formatting.",
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
          // Use json_object mode instead of json_schema (Gemini doesn't support json_schema)
          response_format: {
            type: "json_object",
          },
        });

        // Handle response content - can be string or array
        let content: string;
        const messageContent = response.choices[0]?.message?.content;
        
        if (!messageContent) {
          console.error("[Compliance Check] No content in response:", JSON.stringify(response, null, 2));
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI returned empty response' });
        }
        
        if (typeof messageContent === 'string') {
          content = messageContent;
        } else if (Array.isArray(messageContent)) {
          // Extract text from array of content parts
          const textPart = messageContent.find(part => part.type === 'text');
          if (textPart && 'text' in textPart) {
            content = textPart.text;
          } else {
            console.error("[Compliance Check] No text content in array:", JSON.stringify(messageContent, null, 2));
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI response missing text content' });
          }
        } else {
          console.error("[Compliance Check] Unexpected content type:", typeof messageContent);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid AI response format' });
        }

        // Clean up the content - remove markdown code blocks if present
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.slice(7);
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.slice(3);
        }
        if (cleanedContent.endsWith('```')) {
          cleanedContent = cleanedContent.slice(0, -3);
        }
        cleanedContent = cleanedContent.trim();

        let complianceResult;
        try {
          complianceResult = JSON.parse(cleanedContent);
        } catch (parseError) {
          console.error("[Compliance Check] JSON parse error:", parseError, "Content:", cleanedContent);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to parse AI response as JSON' });
        }

        // Validate the response structure
        if (!complianceResult.status || !Array.isArray(complianceResult.issues)) {
          console.error("[Compliance Check] Invalid response structure:", complianceResult);
          // Provide default structure if missing
          complianceResult = {
            status: complianceResult.status || "needs_review",
            issues: complianceResult.issues || [],
            summary: complianceResult.summary || "Unable to determine compliance status. Please review manually.",
          };
        }

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
        if (error instanceof TRPCError) {
          throw error;
        }
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

  /**
   * Check all components in a project for compliance
   * Fetches all assessments for the project and runs compliance checks on each
   */
  checkAllProjectComponents: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project access
      const project = await db.getProjectById(input.projectId, ctx.user.id);
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

      // Fetch all assessments for this project
      const assessments = await db.getAssessmentsByProject(input.projectId);
      
      if (assessments.length === 0) {
        return {
          success: true,
          results: [],
          errors: [],
          summary: {
            total: 0,
            successful: 0,
            failed: 0,
            compliant: 0,
            nonCompliant: 0,
            needsReview: 0,
          },
        };
      }

      const results = [];
      const errors = [];
      let compliantCount = 0;
      let nonCompliantCount = 0;
      let needsReviewCount = 0;

      // Process each assessment
      for (const assessment of assessments) {
        try {
          const result = await (complianceCheckRouter as any).createCaller(ctx).checkAssessmentCompliance({
            assessmentId: assessment.id,
          });
          results.push({ 
            assessmentId: assessment.id,
            componentName: assessment.componentName,
            componentCode: assessment.componentCode,
            ...result 
          });
          
          // Count compliance statuses
          if (result.result.status === 'compliant') compliantCount++;
          else if (result.result.status === 'non_compliant') nonCompliantCount++;
          else if (result.result.status === 'needs_review') needsReviewCount++;
        } catch (error) {
          errors.push({
            assessmentId: assessment.id,
            componentName: assessment.componentName,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        results,
        errors,
        summary: {
          total: assessments.length,
          successful: results.length,
          failed: errors.length,
          compliant: compliantCount,
          nonCompliant: nonCompliantCount,
          needsReview: needsReviewCount,
        },
      };
    }),
});
