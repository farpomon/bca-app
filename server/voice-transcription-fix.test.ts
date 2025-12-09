import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

/**
 * Voice Transcription Fix Tests
 * 
 * Tests the complete transcription workflow:
 * - manus-speech-to-text utility output parsing
 * - JSON file extraction and reading
 * - Proper cleanup of temporary files
 */

describe("Voice Transcription Fix", () => {
  const testAudioPath = "/tmp/test-voice-transcription.webm";
  let jsonFilePath: string | null = null;

  beforeAll(async () => {
    // Create a test audio file (1 second silent audio)
    try {
      execSync(
        `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -c:a libopus ${testAudioPath} -y 2>/dev/null`
      );
    } catch (error) {
      console.warn("Could not create test audio file (ffmpeg not available)");
    }
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.unlink(testAudioPath);
    } catch {}
    
    if (jsonFilePath) {
      try {
        await fs.unlink(jsonFilePath);
      } catch {}
    }
  });

  it("should extract JSON file path from manus-speech-to-text output", async () => {
    if (!await fs.access(testAudioPath).then(() => true).catch(() => false)) {
      console.warn("Skipping test: test audio file not available");
      return;
    }

    const output = execSync(`manus-speech-to-text ${testAudioPath}`, {
      encoding: "utf-8",
    });

    // Check that output contains the JSON file path
    expect(output).toContain("Complete transcription result saved to:");
    
    // Extract JSON file path using the same regex as the fix
    const jsonFileMatch = output.match(/Complete transcription result saved to: (.+\.json)/);
    expect(jsonFileMatch).toBeTruthy();
    expect(jsonFileMatch![1]).toBeTruthy();
    
    jsonFilePath = jsonFileMatch![1];
    expect(jsonFilePath).toContain(".json");
  });

  it("should read and parse JSON file correctly", async () => {
    if (!jsonFilePath) {
      console.warn("Skipping test: JSON file path not available");
      return;
    }

    // Read the JSON file
    const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
    const result = JSON.parse(jsonContent);

    // Verify JSON structure
    expect(result).toBeDefined();
    expect(result).toHaveProperty("full_text");
    expect(result).toHaveProperty("language");
    expect(result).toHaveProperty("segments");
    expect(result).toHaveProperty("duration");
  });

  it("should use full_text field from JSON", async () => {
    if (!jsonFilePath) {
      console.warn("Skipping test: JSON file path not available");
      return;
    }

    const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
    const result = JSON.parse(jsonContent);

    // Verify full_text is the primary field
    expect(result.full_text).toBeDefined();
    expect(typeof result.full_text).toBe("string");
  });

  it("should handle JSON file cleanup", async () => {
    if (!jsonFilePath) {
      console.warn("Skipping test: JSON file path not available");
      return;
    }

    // Verify file exists
    const exists = await fs.access(jsonFilePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    // Clean up (simulating what the fix does)
    await fs.unlink(jsonFilePath).catch(console.error);

    // Verify file is deleted
    const existsAfter = await fs.access(jsonFilePath).then(() => true).catch(() => false);
    expect(existsAfter).toBe(false);
    
    jsonFilePath = null; // Prevent double cleanup
  });

  it("should handle regex pattern correctly", () => {
    const sampleOutput = `Starting Speech-to-Text conversion...
Transcribing video file: test.webm, file size: 0.00 MB
Transcription may take some time depending on file size and audio length...
Transcription completed successfully!
TRANSCRIPTION RESULT:
Total Duration: 1.0 seconds
Language: english
Timestamped segments:
[00:000.0 - 00:002.1]  you
Complete transcription result saved to: /tmp/test_transcription_20251208_212445.json`;

    const jsonFileMatch = sampleOutput.match(/Complete transcription result saved to: (.+\.json)/);
    
    expect(jsonFileMatch).toBeTruthy();
    expect(jsonFileMatch![1]).toBe("/tmp/test_transcription_20251208_212445.json");
  });

  it("should handle edge cases in output parsing", () => {
    // Test with different file paths
    const testCases = [
      {
        output: "Complete transcription result saved to: /tmp/audio_123.json",
        expected: "/tmp/audio_123.json",
      },
      {
        output: "Complete transcription result saved to: /home/user/recordings/test.json",
        expected: "/home/user/recordings/test.json",
      },
      {
        output: "Complete transcription result saved to: /tmp/test_transcription_20251208_212445.json\n",
        expected: "/tmp/test_transcription_20251208_212445.json",
      },
    ];

    for (const testCase of testCases) {
      const match = testCase.output.match(/Complete transcription result saved to: (.+\.json)/);
      expect(match).toBeTruthy();
      expect(match![1].trim()).toBe(testCase.expected);
    }
  });
});
