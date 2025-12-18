import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { processChatMessage } from "../services/aiChat.service";
import { getUserChatSessions, getChatSessionById, getSessionMessages, deleteChatSession } from "../db/chatDb";

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
        userCompanyId: ctx.user.companyId,
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
});
