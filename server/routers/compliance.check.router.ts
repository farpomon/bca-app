import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Building Code Compliance Checking Router
 * AI-powered analysis of assessments against selected building codes
 * 
 * Note: Due to LLM limitations on large PDF files (>1000 pages), we use a text-based
 * approach that leverages the AI's knowledge of building codes rather than parsing
 * the actual PDF documents. This provides faster and more reliable compliance checks.
 */

// Building code knowledge base - key requirements by code
const BUILDING_CODE_KNOWLEDGE: Record<string, {
  title: string;
  jurisdiction: string;
  keyRequirements: string;
}> = {
  "BCBC_2024": {
    title: "British Columbia Building Code 2024",
    jurisdiction: "British Columbia, Canada",
    keyRequirements: `
Key requirements of the British Columbia Building Code 2024:

STRUCTURAL REQUIREMENTS:
- Part 4: Structural Design - buildings must meet seismic design requirements for BC's high seismic zones
- Snow loads vary by region (typically 1.0-3.0 kPa)
- Wind loads based on 1-in-50 year return period
- Foundation design must account for soil conditions and frost depth

FIRE SAFETY:
- Part 3: Fire Protection, Occupant Safety and Accessibility
- Fire separations required between dwelling units (minimum 1-hour rating)
- Smoke alarms required in all sleeping areas and on each floor
- Carbon monoxide detectors required near sleeping areas
- Emergency lighting and exit signage for larger buildings
- Sprinkler systems required for buildings over 3 stories

BUILDING ENVELOPE:
- Part 5: Environmental Separation
- Minimum insulation values: R-22 walls, R-40 attic, R-10 basement walls
- Air barrier continuity required
- Vapor barrier on warm side of insulation
- Rain screen wall assemblies recommended in coastal areas
- Energy efficiency requirements per BC Energy Step Code

PLUMBING:
- Part 7: Plumbing Services
- Backflow prevention required
- Water heater temperature limits (60°C storage, 49°C delivery)
- Drainage slopes and venting requirements
- Cross-connection control

HVAC:
- Part 6: Heating, Ventilating and Air-conditioning
- Minimum ventilation rates per ASHRAE 62.1
- Heat recovery ventilators (HRV) required in new construction
- Combustion air requirements for fuel-burning appliances
- Duct sealing and insulation requirements

ELECTRICAL:
- Part 8: Electrical (references Canadian Electrical Code)
- Arc-fault circuit interrupters (AFCI) in bedrooms
- Ground-fault circuit interrupters (GFCI) in wet locations
- Minimum service capacity requirements
- Emergency power for life safety systems

ACCESSIBILITY:
- Barrier-free design requirements for public buildings
- Accessible routes and entrances
- Accessible washrooms in public buildings
- Visual and audible alarms

ENERGY EFFICIENCY:
- BC Energy Step Code compliance required
- Airtightness testing requirements
- High-performance windows (U-value requirements)
- Renewable energy ready provisions
`
  },
  "bcbc-2024": {
    title: "British Columbia Building Code 2024",
    jurisdiction: "British Columbia, Canada",
    keyRequirements: `
Key requirements of the British Columbia Building Code 2024:

STRUCTURAL REQUIREMENTS:
- Part 4: Structural Design - buildings must meet seismic design requirements for BC's high seismic zones
- Snow loads vary by region (typically 1.0-3.0 kPa)
- Wind loads based on 1-in-50 year return period
- Foundation design must account for soil conditions and frost depth

FIRE SAFETY:
- Part 3: Fire Protection, Occupant Safety and Accessibility
- Fire separations required between dwelling units (minimum 1-hour rating)
- Smoke alarms required in all sleeping areas and on each floor
- Carbon monoxide detectors required near sleeping areas
- Emergency lighting and exit signage for larger buildings
- Sprinkler systems required for buildings over 3 stories

BUILDING ENVELOPE:
- Part 5: Environmental Separation
- Minimum insulation values: R-22 walls, R-40 attic, R-10 basement walls
- Air barrier continuity required
- Vapor barrier on warm side of insulation
- Rain screen wall assemblies recommended in coastal areas
- Energy efficiency requirements per BC Energy Step Code

PLUMBING:
- Part 7: Plumbing Services
- Backflow prevention required
- Water heater temperature limits (60°C storage, 49°C delivery)
- Drainage slopes and venting requirements
- Cross-connection control

HVAC:
- Part 6: Heating, Ventilating and Air-conditioning
- Minimum ventilation rates per ASHRAE 62.1
- Heat recovery ventilators (HRV) required in new construction
- Combustion air requirements for fuel-burning appliances
- Duct sealing and insulation requirements

ELECTRICAL:
- Part 8: Electrical (references Canadian Electrical Code)
- Arc-fault circuit interrupters (AFCI) in bedrooms
- Ground-fault circuit interrupters (GFCI) in wet locations
- Minimum service capacity requirements
- Emergency power for life safety systems

ACCESSIBILITY:
- Barrier-free design requirements for public buildings
- Accessible routes and entrances
- Accessible washrooms in public buildings
- Visual and audible alarms

ENERGY EFFICIENCY:
- BC Energy Step Code compliance required
- Airtightness testing requirements
- High-performance windows (U-value requirements)
- Renewable energy ready provisions
`
  },
  "IBC_2024": {
    title: "International Building Code 2024",
    jurisdiction: "International / United States",
    keyRequirements: `
Key requirements of the International Building Code 2024:

STRUCTURAL REQUIREMENTS:
- Chapter 16: Structural Design - load combinations and design criteria
- Seismic design categories based on site class and mapped accelerations
- Wind design per ASCE 7
- Snow load requirements based on ground snow load maps

FIRE SAFETY:
- Chapter 7: Fire and Smoke Protection Features
- Fire-resistance ratings based on construction type and occupancy
- Fire barriers, fire partitions, and smoke barriers
- Opening protectives (fire doors, fire windows)
- Chapter 9: Fire Protection Systems (sprinklers, alarms, standpipes)

MEANS OF EGRESS:
- Chapter 10: Means of Egress
- Exit access, exits, and exit discharge requirements
- Occupant load calculations
- Exit width and capacity
- Travel distance limitations
- Emergency lighting and exit signs

ACCESSIBILITY:
- Chapter 11: Accessibility
- ICC A117.1 compliance required
- Accessible routes and entrances
- Accessible parking and restrooms
- Signage requirements

BUILDING ENVELOPE:
- Chapter 14: Exterior Walls
- Weather protection requirements
- Vapor retarders
- Flashing and drainage

INTERIOR ENVIRONMENT:
- Chapter 12: Interior Environment
- Ventilation requirements
- Lighting requirements
- Sound transmission requirements

ENERGY EFFICIENCY:
- References IECC for energy requirements
- Building envelope insulation
- HVAC efficiency requirements
- Lighting power density limits
`
  },
  "NBC_2020": {
    title: "National Building Code of Canada 2020",
    jurisdiction: "Canada",
    keyRequirements: `
Key requirements of the National Building Code of Canada 2020:

STRUCTURAL REQUIREMENTS:
- Part 4: Structural Design
- Seismic design for Canadian seismic hazard zones
- Snow, wind, and rain loads based on climatic data
- Foundation design requirements

FIRE SAFETY:
- Part 3: Fire Protection, Occupant Safety and Accessibility
- Fire separations and fire-resistance ratings
- Smoke control and containment
- Fire alarm and detection systems
- Sprinkler system requirements

BUILDING ENVELOPE:
- Part 5: Environmental Separation
- Air barrier systems
- Vapor barriers
- Thermal insulation requirements
- Rain penetration control

HVAC:
- Part 6: Heating, Ventilating and Air Conditioning
- Ventilation requirements
- Combustion air supply
- Chimneys and venting

PLUMBING:
- Part 7: Plumbing Services
- Water supply systems
- Drainage systems
- Venting requirements

ACCESSIBILITY:
- Barrier-free path of travel
- Accessible parking
- Accessible washrooms
- Visual and tactile requirements

ENERGY EFFICIENCY:
- Part 9.36: Energy Efficiency
- Building envelope requirements
- HVAC efficiency
- Service water heating
`
  },
  "OBC_2024": {
    title: "Ontario Building Code 2024",
    jurisdiction: "Ontario, Canada",
    keyRequirements: `
Key requirements of the Ontario Building Code 2024:

STRUCTURAL REQUIREMENTS:
- Part 4: Structural Design
- Ontario-specific climatic loads
- Seismic design requirements
- Foundation design for Ontario soil conditions

FIRE SAFETY:
- Part 3: Fire Protection, Occupant Safety and Accessibility
- Fire separations between units
- Smoke alarms in all dwelling units
- Carbon monoxide detectors required
- Sprinkler requirements for larger buildings

BUILDING ENVELOPE:
- Part 5: Environmental Separation
- SB-12 Energy Efficiency requirements
- Air barrier and vapor barrier requirements
- Insulation minimums for Ontario climate zones

PLUMBING:
- Part 7: Plumbing Services
- Ontario-specific plumbing requirements
- Water conservation measures
- Backflow prevention

HVAC:
- Part 6: HVAC
- Ventilation requirements
- Energy recovery requirements
- Combustion air provisions

ACCESSIBILITY:
- Enhanced accessibility requirements
- Barrier-free design
- Accessible dwelling units in multi-unit buildings

ENERGY EFFICIENCY:
- SB-12 compliance required
- Higher insulation values than NBC
- Airtightness requirements
- Energy modeling options
`
  },
  "NBC_2023_AB": {
    title: "National Building Code – 2023 Alberta Edition",
    jurisdiction: "Alberta, Canada",
    keyRequirements: `
Key requirements of the National Building Code – 2023 Alberta Edition:

STRUCTURAL REQUIREMENTS:
- Part 4: Structural Design
- Alberta-specific climatic loads (snow, wind)
- Seismic design for Alberta zones
- Foundation design for Alberta soil and frost conditions

FIRE SAFETY:
- Part 3: Fire Protection
- Fire separations and ratings
- Smoke alarms and CO detectors
- Fire suppression systems
- Emergency egress requirements

BUILDING ENVELOPE:
- Part 5: Environmental Separation
- Alberta-specific insulation requirements
- Air and vapor barrier systems
- Rain and moisture control

HVAC:
- Part 6: HVAC Systems
- Ventilation for Alberta climate
- Heating system requirements
- Combustion air provisions

PLUMBING:
- Part 7: Plumbing
- Cold climate plumbing requirements
- Freeze protection
- Drainage and venting

ACCESSIBILITY:
- Barrier-free requirements
- Accessible routes
- Accessible facilities

ENERGY EFFICIENCY:
- Alberta-specific energy requirements
- Tiered energy performance options
- Building envelope standards
`
  },
  "NBC_2025_PROPOSED": {
    title: "National Building Code of Canada 2025 (Proposed)",
    jurisdiction: "Canada",
    keyRequirements: `
Key requirements of the National Building Code of Canada 2025 (Proposed):

Note: This is a proposed code and requirements may change before final adoption.

STRUCTURAL REQUIREMENTS:
- Updated seismic hazard maps
- Climate change considerations for loads
- Enhanced resilience requirements

FIRE SAFETY:
- Updated fire safety provisions
- Enhanced smoke control
- Improved egress requirements

BUILDING ENVELOPE:
- Higher energy efficiency targets
- Net-zero ready provisions
- Enhanced moisture management

HVAC:
- Improved ventilation standards
- Heat recovery requirements
- Electrification provisions

ACCESSIBILITY:
- Enhanced accessibility requirements
- Universal design principles
- Improved wayfinding

ENERGY EFFICIENCY:
- Tiered energy performance
- Net-zero energy ready buildings
- Embodied carbon considerations
- Renewable energy integration
`
  }
};

// Default knowledge for unknown codes
const DEFAULT_CODE_KNOWLEDGE = `
General building code compliance considerations:

STRUCTURAL:
- Adequate load-bearing capacity
- Proper foundation design
- Seismic and wind resistance

FIRE SAFETY:
- Fire separations between units
- Smoke and fire detection
- Adequate means of egress
- Fire suppression where required

BUILDING ENVELOPE:
- Weather protection
- Thermal insulation
- Air and vapor barriers
- Moisture management

MECHANICAL SYSTEMS:
- Adequate ventilation
- Safe heating systems
- Proper plumbing

ELECTRICAL:
- Safe wiring practices
- Adequate service capacity
- Ground fault protection

ACCESSIBILITY:
- Barrier-free access where required
- Accessible facilities
`;

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
      if (!buildingCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Building code not found",
        });
      }

      // Get building code knowledge from our knowledge base
      const codeKnowledge = BUILDING_CODE_KNOWLEDGE[buildingCode.code] || {
        title: buildingCode.title,
        jurisdiction: buildingCode.jurisdiction || "Unknown",
        keyRequirements: DEFAULT_CODE_KNOWLEDGE
      };

      // Prepare assessment context for AI
      const assessmentContext = {
        componentCode: assessment.componentCode,
        componentName: assessment.componentName,
        componentLocation: assessment.componentLocation || "Not specified",
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

      // Build the compliance check prompt with embedded code knowledge
      const prompt = `You are a building code compliance expert. Analyze the following building assessment against the ${codeKnowledge.title}.

BUILDING CODE REFERENCE:
${codeKnowledge.keyRequirements}

ASSESSMENT DETAILS:
- Component: ${assessmentContext.componentName} (Code: ${assessmentContext.componentCode})
- Location: ${assessmentContext.componentLocation}
- Condition: ${assessmentContext.condition} (${assessmentContext.conditionPercentage}%)
- Observations: ${assessmentContext.observations}
- Review Year: ${assessmentContext.reviewYear}

PROJECT CONTEXT:
- Project Name: ${assessmentContext.projectInfo.name}
- Property Type: ${assessmentContext.projectInfo.propertyType || "Not specified"}
- Construction Type: ${assessmentContext.projectInfo.constructionType || "Not specified"}
- Year Built: ${assessmentContext.projectInfo.yearBuilt || "Not specified"}
- Number of Stories: ${assessmentContext.projectInfo.numberOfStories || "Not specified"}

TASK: Based on the building code requirements above and the assessment details, analyze this component for potential compliance issues. Consider:
1. Does the component meet the relevant code requirements?
2. Are there any safety concerns based on the condition?
3. Are there any code violations evident from the observations?
4. What recommendations would improve compliance?

Return your analysis in the following JSON format ONLY (no additional text or markdown):

{
  "status": "compliant" | "non_compliant" | "needs_review",
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "codeSection": "Specific code section reference",
      "description": "Clear description of the compliance issue",
      "recommendation": "Specific action to address the issue"
    }
  ],
  "summary": "Brief overall compliance summary (2-3 sentences)"
}

IMPORTANT GUIDELINES:
- If the component appears to meet code requirements based on the information provided, set status to "compliant" with an empty issues array
- If there are clear violations or safety concerns, set status to "non_compliant" and list the issues
- If more information is needed to make a determination, set status to "needs_review" and explain in the summary
- Be specific about code sections when identifying issues
- Provide actionable recommendations`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a building code compliance expert with deep knowledge of Canadian and international building codes. Analyze assessments and provide structured compliance reports. Always respond with valid JSON only, no markdown formatting or code blocks.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: {
            type: "json_object",
          },
        });

        // Check for API error response
        if ((response as any).error) {
          const errorResponse = response as any;
          console.error("[Compliance Check] API Error:", errorResponse.error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `AI service error: ${errorResponse.error.message || "Unknown error"}`,
          });
        }

        // Handle response content - can be string or array
        let content: string;
        const messageContent = response.choices?.[0]?.message?.content;
        
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
