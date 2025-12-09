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
      
      try {
        // Download audio file to temp location
        const tempDir = "/tmp";
        const fileName = `audio-${Date.now()}.webm`;
        const tempFilePath = path.join(tempDir, fileName);
        
        // Download file
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error("Failed to download audio file");
        }
        
        const arrayBuffer = await response.arrayBuffer();
        await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
        
        // Call manus-speech-to-text utility
        const languageFlag = language ? `--language ${language}` : "";
        const command = `manus-speech-to-text ${languageFlag} ${tempFilePath}`;
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes("Warning")) {
          console.error("Transcription stderr:", stderr);
        }
        
        // manus-speech-to-text saves JSON to a file, extract the path from stdout
        const jsonFileMatch = stdout.match(/Complete transcription result saved to: (.+\.json)/);
        if (!jsonFileMatch) {
          throw new Error("Could not find JSON output file path in transcription output");
        }
        
        const jsonFilePath = jsonFileMatch[1];
        const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
        const result = JSON.parse(jsonContent);
        
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
        console.error("Transcription error:", error);
        throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),
});
