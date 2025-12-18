import { invokeLLM } from "../_core/llm";
import { getProjectContext, getAssetContext, getCompanyContext } from "./chatContext.service";
import { createChatSession, addChatMessage, getSessionMessages, getChatSessionById } from "../db/chatDb";
import type { ChatMessage } from "../../drizzle/schema";

interface ChatRequest {
  userId: number;
  userCompanyId: number | null;
  isAdmin: boolean;
  sessionType: 'project' | 'asset' | 'company';
  contextId?: number; // projectId or assetId
  message: string;
  sessionId?: number; // Continue existing session
}

interface ChatResponse {
  sessionId: number;
  message: string;
  sources?: string[];
}

/**
 * Main AI chat service - handles chat requests with context awareness
 */
export async function processChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const { userId, userCompanyId, isAdmin, sessionType, contextId, message, sessionId } = request;

  // Get or create session
  let currentSessionId = sessionId;
  
  if (!currentSessionId) {
    // Create new session
    currentSessionId = await createChatSession({
      userId,
      sessionType,
      contextId: contextId || null,
      companyId: userCompanyId,
      title: message.substring(0, 100), // Use first part of message as title
    });
  } else {
    // Verify session ownership
    const session = await getChatSessionById(currentSessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Unauthorized access to chat session");
    }
  }

  // Retrieve context based on session type
  let contextData: any = null;
  let systemPrompt = "";

  switch (sessionType) {
    case 'project':
      if (!contextId) throw new Error("Project ID required for project chat");
      contextData = await getProjectContext(contextId, userId, userCompanyId);
      if (!contextData) throw new Error("Project not found or access denied");
      systemPrompt = buildProjectSystemPrompt(contextData);
      break;

    case 'asset':
      if (!contextId) throw new Error("Asset ID required for asset chat");
      contextData = await getAssetContext(contextId, userId, userCompanyId);
      if (!contextData) throw new Error("Asset not found or access denied");
      systemPrompt = buildAssetSystemPrompt(contextData);
      break;

    case 'company':
      if (!userCompanyId) throw new Error("Company context required");
      // Only admins and managers can access company-level chat
      if (!isAdmin) {
        throw new Error("Insufficient permissions for company-level insights");
      }
      contextData = await getCompanyContext(userCompanyId, userId);
      if (!contextData) throw new Error("Company not found");
      systemPrompt = buildCompanySystemPrompt(contextData);
      break;

    default:
      throw new Error("Invalid session type");
  }

  // Get conversation history
  const history = await getSessionMessages(currentSessionId);
  
  // Build messages array for LLM
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (limit to last 10 exchanges to manage token count)
  const recentHistory = history.slice(-20); // Last 20 messages = ~10 exchanges
  recentHistory.forEach((msg) => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  });

  // Add current user message
  messages.push({
    role: 'user',
    content: message,
  });

  // Save user message to database
  await addChatMessage({
    sessionId: currentSessionId,
    role: 'user',
    content: message,
  });

  // Call LLM
  const response = await invokeLLM({ messages });
  
  const assistantMessage = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

  // Save assistant response to database
  await addChatMessage({
    sessionId: currentSessionId,
    role: 'assistant',
    content: assistantMessage,
  });

  return {
    sessionId: currentSessionId,
    message: assistantMessage,
    sources: extractSources(contextData, sessionType),
  };
}

/**
 * Build system prompt for project-level chat
 */
function buildProjectSystemPrompt(context: any): string {
  const { project, assessmentsSummary, deficienciesSummary, costSummary, recentAssessments, criticalDeficiencies } = context;

  return `You are an AI assistant specialized in Building Condition Assessment (BCA) analysis. You are helping analyze project "${project.name}".

**Project Overview:**
- Location: ${project.location || 'Not specified'}
- Status: ${project.status}
- Total Assessments: ${assessmentsSummary.total}
- Average Condition: ${assessmentsSummary.avgCondition}
- Total Deficiencies: ${deficienciesSummary.total}
- Estimated Cost: $${costSummary.totalEstimatedCost.toLocaleString()}

**Condition Distribution:**
${Object.entries(assessmentsSummary.byCondition).map(([cond, count]) => `- ${cond}: ${count}`).join('\n')}

**Deficiency Priorities:**
${Object.entries(deficienciesSummary.byPriority).map(([priority, count]) => `- ${priority}: ${count}`).join('\n')}

**Critical Deficiencies (Immediate Action Required):**
${criticalDeficiencies.length > 0 ? criticalDeficiencies.map((d: any) => `- ${d.title || 'Untitled'}: ${d.description || 'No description'}`).join('\n') : 'None'}

**Recent Assessment Activity:**
${recentAssessments.slice(0, 5).map((a: any) => `- ${a.componentName || 'Unknown component'} (${a.condition}): ${a.observations || 'No observations'}`).join('\n')}

Your role:
1. Provide insights about project health, trends, and risks
2. Answer questions about specific assessments, deficiencies, or costs
3. Suggest prioritization strategies based on condition and budget
4. Explain technical BCA concepts in clear language
5. Recommend next steps for maintenance or repairs

Always base your answers on the data provided above. If asked about something not in the data, clearly state that you don't have that information. Be concise but thorough.`;
}

/**
 * Build system prompt for asset-level chat
 */
function buildAssetSystemPrompt(context: any): string {
  const { asset, assessments, deficiencies, photos, conditionHistory } = context;

  return `You are an AI assistant specialized in Building Condition Assessment (BCA) analysis. You are helping analyze asset "${asset.name || 'Unnamed Asset'}".

**Asset Details:**
- Type: ${asset.assetType || 'Not specified'}
- Location: ${asset.location || 'Not specified'}
- Total Assessments: ${assessments.length}
- Total Deficiencies: ${deficiencies.length}
- Photos Available: ${photos.length}

**Condition History:**
${conditionHistory.slice(0, 10).map((h: any) => `- ${h.date}: ${h.condition} ${h.notes ? `(${h.notes.substring(0, 100)})` : ''}`).join('\n')}

**Recent Deficiencies:**
${deficiencies.slice(0, 5).map((d: any) => `- [${d.priority}] ${d.title || 'Untitled'}: ${d.description || 'No description'}`).join('\n')}

**Assessment Summary:**
${assessments.slice(0, 3).map((a: any) => `- ${a.inspectionDate}: Condition ${a.condition}, Cost: $${a.estimatedCost || 0}`).join('\n')}

Your role:
1. Analyze the asset's condition trends over time
2. Identify deterioration patterns or improvement
3. Explain deficiencies and their implications
4. Suggest maintenance strategies
5. Answer questions about specific inspections or observations

Always base your answers on the data provided above. Be specific and reference dates, conditions, and costs when relevant.`;
}

/**
 * Build system prompt for company-level chat
 */
function buildCompanySystemPrompt(context: any): string {
  const { company, projectsSummary, portfolioHealth, recentActivity } = context;

  return `You are an AI assistant specialized in Building Condition Assessment (BCA) portfolio analysis. You are helping analyze the portfolio for "${company.name}".

**Company Portfolio Overview:**
- Total Projects: ${projectsSummary.total}
- Portfolio Average Condition: ${portfolioHealth.avgCondition}
- Total Deficiencies Across Portfolio: ${portfolioHealth.totalDeficiencies}
- Total Estimated Costs: $${portfolioHealth.totalCost.toLocaleString()}

**Projects by Status:**
${Object.entries(projectsSummary.byStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

**Recent Activity:**
${recentActivity.slice(0, 10).map((a: any) => `- ${a.projectName}: ${a.assessment.componentName || 'Component'} assessed as ${a.assessment.condition}`).join('\n')}

Your role:
1. Provide high-level portfolio insights and trends
2. Identify projects requiring immediate attention
3. Compare performance across projects
4. Suggest budget allocation strategies
5. Highlight portfolio-wide risks and opportunities

Always base your answers on the aggregated data provided above. Think strategically about portfolio management and capital planning.`;
}

/**
 * Extract data sources for citation
 */
function extractSources(contextData: any, sessionType: string): string[] {
  const sources: string[] = [];
  
  switch (sessionType) {
    case 'project':
      sources.push(`Project: ${contextData.project.name}`);
      sources.push(`${contextData.assessmentsSummary.total} assessments`);
      sources.push(`${contextData.deficienciesSummary.total} deficiencies`);
      break;
    case 'asset':
      sources.push(`Asset: ${contextData.asset.name || 'Unnamed'}`);
      sources.push(`${contextData.assessments.length} assessments`);
      sources.push(`${contextData.deficiencies.length} deficiencies`);
      break;
    case 'company':
      sources.push(`Company: ${contextData.company.name}`);
      sources.push(`${contextData.projectsSummary.total} projects`);
      break;
  }
  
  return sources;
}
