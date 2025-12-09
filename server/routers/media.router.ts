import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { TRPCError } from "@trpc/server";

export const mediaRouter = router({
  /**
   * Transcribe audio using the built-in Manus transcription API
   */
  transcribeAudio: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { audioUrl, language, prompt } = input;
      
      console.log("[Transcription] Starting transcription for:", audioUrl);
      
      try {
        const result = await transcribeAudio({
          audioUrl,
          language,
          prompt,
        });
        
        // Check if it's an error response
        if ('error' in result) {
          console.error("[Transcription] Error:", result.error);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error,
            cause: result,
          });
        }
        
        console.log("[Transcription] Success, text length:", result.text?.length || 0);
        
        return {
          text: result.text || "",
          language: result.language || language || "en",
          segments: result.segments || [],
        };
        
      } catch (error) {
        console.error("[Transcription] Error occurred:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
