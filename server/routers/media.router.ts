import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

export const mediaRouter = router({
  /**
   * Transcribe audio using manus-speech-to-text utility
   */
  transcribeAudio: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { audioUrl, language } = input;
      
      console.log("[Transcription] Starting transcription for:", audioUrl);
      
      try {
        // Download audio file to temp location
        const tempDir = "/tmp";
        const fileName = `audio-${Date.now()}.webm`;
        const tempFilePath = path.join(tempDir, fileName);
        
        console.log("[Transcription] Downloading audio to:", tempFilePath);
        
        // Download file
        const response = await fetch(audioUrl);
        if (!response.ok) {
          console.error("[Transcription] Download failed:", response.status, response.statusText);
          throw new Error(`Failed to download audio file: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log("[Transcription] Audio file size:", buffer.length, "bytes");
        
        await fs.writeFile(tempFilePath, buffer);
        console.log("[Transcription] Audio file saved successfully");
        
        // Call manus-speech-to-text utility
        const languageFlag = language ? `--language ${language}` : "";
        const command = `manus-speech-to-text ${languageFlag} ${tempFilePath}`;
        
        console.log("[Transcription] Executing command:", command);
        const { stdout, stderr } = await execAsync(command);
        console.log("[Transcription] Command completed");
        
        if (stderr && !stderr.includes("Warning")) {
          console.error("Transcription stderr:", stderr);
        }
        
        // manus-speech-to-text saves JSON to a file, extract the path from stdout
        const jsonFileMatch = stdout.match(/Complete transcription result saved to: (.+\.json)/);
        if (!jsonFileMatch) {
          console.error("[Transcription] Could not find JSON path in output:", stdout.substring(0, 500));
          throw new Error("Could not find JSON output file path in transcription output");
        }
        
        const jsonFilePath = jsonFileMatch[1];
        console.log("[Transcription] Reading JSON from:", jsonFilePath);
        
        const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
        const result = JSON.parse(jsonContent);
        console.log("[Transcription] Transcription successful, text length:", result.full_text?.length || result.text?.length || 0);
        
        // Clean up JSON file
        await fs.unlink(jsonFilePath).catch(console.error);
        
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(console.error);
        
        return {
          text: result.full_text || result.text || "",
          language: result.language || language || "en",
          segments: result.segments || [],
        };
        
      } catch (error) {
        console.error("[Transcription] Error occurred:", error);
        if (error instanceof Error) {
          console.error("[Transcription] Error stack:", error.stack);
        }
        throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),
});
