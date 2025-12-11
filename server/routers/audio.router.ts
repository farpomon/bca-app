/**
 * Audio Feedback Router
 * Provides text-to-speech audio feedback for voice recording workflow
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { textToSpeech, AUDIO_MESSAGES } from "../elevenlabs";

export const audioRouter = router({
  /**
   * Generate audio feedback for a predefined message
   */
  getFeedbackAudio: publicProcedure
    .input(
      z.object({
        message: z.enum([
          "RECORDING_STARTED",
          "RECORDING_STOPPED",
          "TRANSCRIPTION_COMPLETE",
          "TRANSCRIPTION_ERROR",
          "MICROPHONE_DENIED",
          "MICROPHONE_READY",
          "ASSESSMENT_SAVED",
          "RECORDING_SAVED_OFFLINE",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const text = AUDIO_MESSAGES[input.message];
      
      try {
        const audioBuffer = await textToSpeech({ text });
        
        // Convert buffer to base64 for transmission
        const base64Audio = audioBuffer.toString("base64");
        
        return {
          success: true,
          audio: base64Audio,
          mimeType: "audio/mpeg",
        };
      } catch (error) {
        console.error("[Audio Feedback] Error generating audio:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Generate custom audio feedback from text
   */
  generateCustomAudio: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(500), // Limit to 500 characters
      })
    )
    .mutation(async ({ input }) => {
      try {
        const audioBuffer = await textToSpeech({ text: input.text });
        
        // Convert buffer to base64 for transmission
        const base64Audio = audioBuffer.toString("base64");
        
        return {
          success: true,
          audio: base64Audio,
          mimeType: "audio/mpeg",
        };
      } catch (error) {
        console.error("[Audio Feedback] Error generating custom audio:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
