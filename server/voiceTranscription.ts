import { ENV } from "./_core/env";

/**
 * Transcribe audio using ElevenLabs Speech-to-Text API
 * @param audioBuffer - Audio file buffer (webm, mp3, wav, etc.)
 * @param language - Optional language code (e.g., 'en', 'fr')
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  language?: string
): Promise<string> {
  const apiKey = ENV.elevenLabsApiKey;

  if (!apiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  try {
    // Create form data with audio file
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
    formData.append("audio", audioBlob, "recording.webm");

    if (language) {
      formData.append("language", language);
    }

    // Call ElevenLabs Speech-to-Text API
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // ElevenLabs returns { text: "transcribed text" }
    if (result && typeof result.text === "string") {
      return result.text;
    }

    throw new Error("Invalid response format from ElevenLabs API");
  } catch (error) {
    console.error("Voice transcription error:", error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
