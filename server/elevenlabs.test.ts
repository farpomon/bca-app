import { describe, expect, it } from "vitest";
import { checkElevenLabsConnection, getVoices, textToSpeech } from "./elevenlabs";

describe("ElevenLabs Integration", () => {
  it("should have API key configured", () => {
    expect(process.env.ELEVENLABS_API_KEY).toBeDefined();
    expect(process.env.ELEVENLABS_API_KEY).not.toBe("");
  });

  it("should connect to ElevenLabs API", async () => {
    const isConnected = await checkElevenLabsConnection();
    expect(isConnected).toBe(true);
  }, 10000); // 10 second timeout for API call

  it("should fetch available voices", async () => {
    const voices = await getVoices();
    expect(voices).toBeDefined();
    expect(voices.voices).toBeInstanceOf(Array);
    expect(voices.voices.length).toBeGreaterThan(0);
  }, 10000);

  it("should generate speech from text", async () => {
    const audioBuffer = await textToSpeech({
      text: "Testing ElevenLabs integration",
    });
    
    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(0);
    
    // Check if it's a valid audio file (MP3 starts with ID3 or 0xFF 0xFB)
    const header = audioBuffer.slice(0, 3).toString();
    const isValidMp3 = header === "ID3" || (audioBuffer[0] === 0xFF && audioBuffer[1] === 0xFB);
    expect(isValidMp3).toBe(true);
  }, 15000); // 15 second timeout for TTS generation
});
