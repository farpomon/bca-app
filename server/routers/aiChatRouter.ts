import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { processChatMessage } from "../services/aiChat.service";
import { getUserChatSessions, getChatSessionById, getSessionMessages, deleteChatSession } from "../db/chatDb";
import { getProjectContext, getAssetContext, getCompanyContext } from "../services/chatContext.service";
import { generateProjectQuestions, generateAssetQuestions, generateCompanyQuestions } from "../services/suggestedQuestions.service";

export const aiChatRouter = router({
  /**
   * Send a chat message and get AI response
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionType: z.enum(['project', 'asset', 'company']),
        contextId: z.number().optional(), // projectId or assetId
        message: z.string().min(1).max(5000),
        sessionId: z.number().optional(), // Continue existing session
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { sessionType, contextId, message, sessionId } = input;

      const response = await processChatMessage({
        userId: ctx.user.id,
        userCompanyId: ctx.user.company ? Number(ctx.user.company) : null,
        isAdmin: ctx.user.role === 'admin' || ctx.user.role === 'project_manager',
        sessionType,
        contextId,
        message,
        sessionId,
      });

      return response;
    }),

  /**
   * Get all chat sessions for current user
   */
  getSessions: protectedProcedure
    .input(
      z.object({
        sessionType: z.enum(['project', 'asset', 'company']).optional(),
        contextId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const sessions = await getUserChatSessions(
        ctx.user.id,
        input.sessionType,
        input.contextId
      );

      return sessions;
    }),

  /**
   * Get a specific chat session with messages
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getChatSessionById(input.sessionId);

      if (!session) {
        throw new Error("Session not found");
      }

      // Verify ownership
      if (session.userId !== ctx.user.id) {
        throw new Error("Unauthorized access to chat session");
      }

      const messages = await getSessionMessages(input.sessionId);

      return {
        session,
        messages,
      };
    }),

  /**
   * Delete a chat session
   */
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getChatSessionById(input.sessionId);

      if (!session) {
        throw new Error("Session not found");
      }

      // Verify ownership
      if (session.userId !== ctx.user.id) {
        throw new Error("Unauthorized access to chat session");
      }

      await deleteChatSession(input.sessionId);

      return { success: true };
    }),

  /**
   * Get suggested questions based on available data
   */
  getSuggestedQuestions: protectedProcedure
    .input(
      z.object({
        sessionType: z.enum(['project', 'asset', 'company']),
        contextId: z.number().optional(), // projectId or assetId
      })
    )
    .query(async ({ input, ctx }) => {
      const { sessionType, contextId } = input;

      // Get context data to determine what questions are relevant
      if (sessionType === 'project' && contextId) {
        const context = await getProjectContext(
          contextId,
          ctx.user.id,
          ctx.user.company ? Number(ctx.user.company) : null
        );

        if (!context) {
          return { questions: [] };
        }

        const questions = generateProjectQuestions(context);
        return { questions };
      }

      if (sessionType === 'asset' && contextId) {
        const context = await getAssetContext(
          contextId,
          ctx.user.id,
          ctx.user.company ? Number(ctx.user.company) : null
        );

        if (!context) {
          return { questions: [] };
        }

        const questions = generateAssetQuestions(context);
        return { questions };
      }

      if (sessionType === 'company' && ctx.user.company) {
        const companyId = Number(ctx.user.company);
        const context = await getCompanyContext(
          companyId,
          ctx.user.id
        );

        if (!context) {
          return { questions: [] };
        }

        const questions = generateCompanyQuestions(context);
        return { questions };
      }

      return { questions: [] };
    }),
});
