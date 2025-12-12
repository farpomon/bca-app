/**
 * Audio Feedback Router
 * Provides text-to-speech audio feedback for voice recording workflow
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { textToSpeech, AUDIO_MESSAGES } from "../elevenlabs";

/**
 * Strip HTML tags from text before sending to TTS
 * Removes all HTML tags and decodes common HTML entities
 */
function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Decode ampersand
    .replace(/&lt;/g, '<') // Decode less than
    .replace(/&gt;/g, '>') // Decode greater than
    .replace(/&quot;/g, '"') // Decode quote
    .replace(/&#39;/g, "'") // Decode apostrophe
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim(); // Remove leading/trailing whitespace
}

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
      const text = stripHtmlTags(AUDIO_MESSAGES[input.message]);
      
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
        const cleanText = stripHtmlTags(input.text);
        const audioBuffer = await textToSpeech({ text: cleanText });
        
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

  /**
   * Enhance transcribed text with AI using building assessment best practices
   */
  enhanceTranscription: publicProcedure
    .input(
      z.object({
        originalText: z.string().min(1),
        fieldType: z.enum(["observations", "recommendations"]),
      })
    )
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      
      // Strip HTML tags from input before processing
      const cleanText = stripHtmlTags(input.originalText);
      
      const systemPrompt = input.fieldType === "observations"
        ? `You are a professional building condition assessor. Rewrite the following observation notes to be clear, professional, and follow industry best practices. Use proper technical terminology from UNIFORMAT II standards. Keep the meaning intact but improve clarity, grammar, and professional tone. Be concise and specific.`
        : `You are a professional building condition assessor. Rewrite the following recommendations to be actionable, professional, and follow industry best practices. Use proper technical terminology. Prioritize safety and compliance. Be specific about required actions and timeframes where applicable.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: cleanText },
          ],
        });

        const enhancedText = response.choices[0]?.message?.content || input.originalText;

        return {
          success: true,
          originalText: cleanText, // Return cleaned version
          enhancedText,
        };
      } catch (error) {
        console.error("[AI Enhancement] Error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          originalText: cleanText,
          enhancedText: cleanText, // Fallback to cleaned version
        };
      }
    }),
});
