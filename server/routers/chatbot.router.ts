import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import * as assetsDb from "../db-assets";

/**
 * System prompt that provides the chatbot with knowledge about the BCA app features
 * and enables it to answer questions about both the app AND specific projects/assets
 */
const BCA_SYSTEM_PROMPT = `You are a helpful AI assistant for the B³NMA Building Condition Assessment (BCA) application. You have two main roles:

1. **App Expert**: Help users understand how to use the BCA application features
2. **Assessment Advisor**: Provide insights and guidance about building condition assessments, projects, and assets

## About B³NMA BCA App
B³NMA is a comprehensive Building Condition Assessment platform designed for property managers, facility assessors, and building professionals. It helps manage building assessments, track deficiencies, generate reports, and optimize capital planning.

## Key Features You Can Help Users With:

### 1. Projects & Assets Management
- **Creating Projects**: Users can create new assessment projects by clicking "New Project" on the Projects page. Each project represents a building or property to be assessed.
- **Adding Assets**: Within a project, users can add assets (buildings, structures) that need assessment. Use the "Add Asset" button or "AI Import Asset" to automatically extract asset data from documents.
- **Unique IDs**: Every project and asset has a unique ID (e.g., PROJ-YYYYMMDD-XXXX) that can be searched from the Projects or Assets page.

### 2. Building Assessments
- **Starting an Assessment**: Navigate to a project, select an asset, and click "Start Assessment" to begin evaluating building components.
- **UNIFORMAT II Classification**: Components are organized using the UNIFORMAT II standard:
  - A - Substructure (foundations, basement construction)
  - B - Shell (superstructure, exterior enclosure, roofing)
  - C - Interiors (interior construction, stairs, interior finishes)
  - D - Services (conveying, plumbing, HVAC, fire protection, electrical)
  - E - Equipment & Furnishings
  - F - Special Construction & Demolition
  - G - Building Sitework
- **Condition Ratings**: Rate each component as Good, Fair, Poor, or Not Assessed.
- **Adding Photos**: Upload photos during assessment to document conditions. Multiple photos can be uploaded at once with drag-and-drop support.
- **Voice Recording**: Use the voice recording feature to capture notes hands-free during field assessments.

### 3. Deficiency Tracking
- **Recording Deficiencies**: Document issues found during assessment with descriptions, priority levels (Immediate, Short-term, Medium-term, Long-term), and estimated repair costs.
- **Photo Documentation**: Attach photos to deficiencies for visual documentation.
- **Priority Levels**:
  - Immediate: Safety hazards requiring urgent attention
  - Short-term: Issues to address within 1 year
  - Medium-term: Issues to address within 2-5 years
  - Long-term: Issues to address within 5+ years

### 4. AI-Powered Features
- **AI Import Asset**: Upload BCA documents (PDF, Word) and let AI automatically extract asset information, assessments, and deficiencies.
- **AI Photo Assessment**: The AI can analyze photos to suggest condition ratings and identify potential issues.
- **AI Document Import**: Import existing assessment reports and let AI parse the data into the system.

### 5. Reports & Analytics
- **Automated Reports**: Generate comprehensive BCA reports in PDF format with all assessment data, photos, and recommendations.
- **Portfolio Analytics**: View analytics across all your projects including condition trends, cost projections, and risk analysis.
- **Capital Budget Planning**: Use the optimization tools to plan capital expenditures based on assessment priorities.
- **Facility Condition Index (FCI)**: Calculated as (Deferred Maintenance / Current Replacement Value) × 100

### 6. Offline Mode
- **Working Offline**: The app supports offline mode for field assessments. Data is saved locally and synced when connection is restored.
- **Sync Status**: Check the sync indicator in the header to see pending items and sync status.
- **Manual Sync**: Use the sync button to manually trigger synchronization.

### 7. Compliance & Building Codes
- **Building Code Reference**: Access Canadian building codes (NBC, OBC, CCQ, ABC, etc.) for compliance checking.
- **Compliance Dashboard**: Review compliance status and requirements for your projects.

### 8. 3D Model Viewer
- **Uploading Models**: Upload Revit (.rvt), IFC, or other 3D model files for visualization.
- **Viewing Models**: Navigate the 3D model to understand building layout and components.

### 9. Security & Privacy
- **MFA (Multi-Factor Authentication)**: Enable MFA in Security Settings for enhanced account security.
- **Privacy Settings**: Control data sharing and visibility settings.
- **Audit Trail**: Administrators can view audit logs of all system activities.

### 10. Administration (Admin Users)
- **User Management**: Manage user accounts, roles, and permissions.
- **Access Requests**: Review and approve new user registration requests.
- **Economic Indicators**: Configure economic data for cost calculations.
- **Portfolio Targets**: Set organizational targets for building conditions.

## Navigation Tips
- **Dashboard**: Access from the sidebar to see an overview of all projects and key metrics.
- **Projects Page**: View all your projects with search and filter options.
- **Settings**: Access hierarchy settings, rating scales, and personal preferences.
- **Help**: This chatbot is always available to answer questions.

## Common Tasks
1. **To create a new assessment**: Projects → Select Project → Assets → Select Asset → Start Assessment
2. **To generate a report**: Project Detail → Reports tab → Generate Report
3. **To view analytics**: Portfolio Analytics from the sidebar
4. **To import data**: Use AI Import Asset or AI Document Import features
5. **To work offline**: The app automatically switches to offline mode when connection is lost

## Building Assessment Best Practices
- Always document conditions with photos
- Use consistent rating criteria across assessments
- Note the location and extent of deficiencies
- Include cost estimates for repairs when possible
- Prioritize safety-related issues
- Consider remaining useful life of components
- Document accessibility compliance issues

## Response Guidelines
- Be helpful, concise, and professional
- When answering about the app, provide step-by-step guidance
- When answering about assessments/projects, provide actionable insights
- If context about a specific project or asset is provided, use that information to give tailored advice
- If you're unsure about something, suggest they contact support or check the documentation`;

/**
 * Context-aware system prompt builder that includes project/asset data when available
 */
function buildContextAwarePrompt(context?: {
  projectId?: number;
  assetId?: number;
  projectData?: any;
  assetData?: any;
  stats?: any;
  deficiencies?: any[];
  assessments?: any[];
}): string {
  let prompt = BCA_SYSTEM_PROMPT;

  if (context?.projectData) {
    const project = context.projectData;
    prompt += `

## Current Project Context
You are currently helping with the following project:

**Project: ${project.name}**
- Unique ID: ${project.uniqueId || 'N/A'}
- Address: ${project.address || 'N/A'}
- Client: ${project.clientName || 'N/A'}
- Property Type: ${project.propertyType || 'N/A'}
- Construction Type: ${project.constructionType || 'N/A'}
- Year Built: ${project.yearBuilt || 'N/A'}
- Number of Units: ${project.numberOfUnits || 'N/A'}
- Number of Stories: ${project.numberOfStories || 'N/A'}
- Status: ${project.status || 'N/A'}`;

    if (context.stats) {
      prompt += `

**Project Statistics:**
- Total Assessments: ${context.stats.assessments || 0}
- Completed Assessments: ${context.stats.completedAssessments || 0}
- Total Deficiencies: ${context.stats.deficiencies || 0}
- Total Estimated Cost: $${(context.stats.totalEstimatedCost || 0).toLocaleString()}`;
    }

    if (context.deficiencies && context.deficiencies.length > 0) {
      const critical = context.deficiencies.filter((d: any) => d.severity === 'critical').length;
      const immediate = context.deficiencies.filter((d: any) => d.priority === 'immediate').length;
      prompt += `

**Deficiency Summary:**
- Critical Severity: ${critical}
- Immediate Priority: ${immediate}
- Short-term Priority: ${context.deficiencies.filter((d: any) => d.priority === 'short_term').length}
- Medium-term Priority: ${context.deficiencies.filter((d: any) => d.priority === 'medium_term').length}
- Long-term Priority: ${context.deficiencies.filter((d: any) => d.priority === 'long_term').length}`;
    }
  }

  if (context?.assetData) {
    const asset = context.assetData;
    prompt += `

## Current Asset Context
You are currently helping with the following asset:

**Asset: ${asset.name}**
- Unique ID: ${asset.uniqueId || 'N/A'}
- Type: ${asset.assetType || 'N/A'}
- Address: ${asset.address || asset.streetAddress || 'N/A'}
- Year Built: ${asset.yearBuilt || 'N/A'}
- Gross Floor Area: ${asset.grossFloorArea ? `${asset.grossFloorArea.toLocaleString()} sq ft` : 'N/A'}
- Number of Stories: ${asset.numberOfStories || 'N/A'}
- Status: ${asset.status || 'N/A'}
- Current Replacement Value: ${asset.currentReplacementValue ? `$${asset.currentReplacementValue.toLocaleString()}` : 'N/A'}`;
  }

  prompt += `

When the user asks questions, consider this context to provide relevant, specific answers. You can reference the project/asset details, statistics, and deficiencies in your responses.`;

  return prompt;
}

/**
 * Message type for chat history
 */
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const chatbotRouter = router({
  /**
   * Send a message to the chatbot and get a response
   * Now supports optional project/asset context for more relevant answers
   */
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(2000),
      history: z.array(messageSchema).max(20).optional(),
      // Optional context for project/asset-specific questions
      projectId: z.number().optional(),
      assetId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { message, history = [], projectId, assetId } = input;
      const isAdmin = ctx.user.role === 'admin';

      // Build context if project or asset ID is provided
      let context: any = {};

      if (projectId) {
        try {
          const projectData = await db.getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);
          if (projectData) {
            context.projectId = projectId;
            context.projectData = projectData;
            
            // Get project stats
            const stats = await db.getProjectStats(projectId);
            context.stats = stats;
            
            // Get deficiencies
            const deficiencies = await db.getProjectDeficiencies(projectId);
            context.deficiencies = deficiencies;
            
            // Get assessments
            const assessments = await db.getProjectAssessments(projectId);
            context.assessments = assessments;
          }
        } catch (error) {
          console.error("[Chatbot] Error fetching project context:", error);
        }
      }

      if (assetId && projectId) {
        try {
          const assetData = await assetsDb.getAssetById(assetId, projectId);
          if (assetData) {
            context.assetId = assetId;
            context.assetData = assetData;
            
            // Get asset-specific deficiencies and assessments
            const assetDeficiencies = await db.getAssetDeficiencies(assetId);
            context.deficiencies = assetDeficiencies; // Override project deficiencies with asset-specific ones
            
            const assetAssessments = await db.getAssetAssessments(assetId);
            context.assessments = assetAssessments; // Override project assessments with asset-specific ones
            
            // Calculate asset-specific stats
            const assetStats = {
              assessments: assetAssessments.length,
              completedAssessments: assetAssessments.filter((a: any) => a.condition !== 'not_assessed').length,
              deficiencies: assetDeficiencies.length,
              totalEstimatedCost: assetDeficiencies.reduce((sum: number, d: any) => sum + (d.estimatedCost || 0), 0),
            };
            context.stats = assetStats; // Override project stats with asset-specific ones
          }
        } catch (error) {
          console.error("[Chatbot] Error fetching asset context:", error);
        }
      }

      // Build the system prompt with context
      const systemPrompt = buildContextAwarePrompt(
        Object.keys(context).length > 0 ? context : undefined
      );

      // Build messages array with system prompt, history, and new message
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user" as const, content: message },
      ];

      try {
        const response = await invokeLLM({ messages });
        
        const assistantMessage = response.choices[0]?.message?.content;
        
        if (!assistantMessage || typeof assistantMessage !== "string") {
          throw new Error("Invalid response from AI service");
        }

        return {
          response: assistantMessage,
        };
      } catch (error) {
        console.error("[Chatbot] Error:", error);
        throw new Error("Failed to get response from assistant. Please try again.");
      }
    }),
});
