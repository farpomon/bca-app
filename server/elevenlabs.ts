/**
 * ElevenLabs Text-to-Speech Integration
 * Provides audio feedback for voice recording workflow
 */

import { ENV } from "./_core/env";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Default voice ID (Rachel - clear, professional female voice)
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
  stability?: number; // 0-1, default 0.5
  similarityBoost?: number; // 0-1, default 0.75
}

/**
 * Convert text to speech using ElevenLabs API
 * Returns audio buffer that can be sent to client
 */
export async function textToSpeech(options: TextToSpeechOptions): Promise<Buffer> {
  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5", // Free tier compatible model
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get list of available voices from ElevenLabs
 */
export async function getVoices() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const url = `${ELEVENLABS_API_URL}/voices`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Check if ElevenLabs API is configured and working
 */
export async function checkElevenLabsConnection(): Promise<boolean> {
  try {
    if (!ELEVENLABS_API_KEY) {
      return false;
    }
    await getVoices();
    return true;
  } catch (error) {
    console.error("[ElevenLabs] Connection check failed:", error);
    return false;
  }
}

// Pre-defined audio feedback messages
export const AUDIO_MESSAGES = {
  RECORDING_STARTED: "Recording started",
  RECORDING_STOPPED: "Recording stopped, transcribing your audio",
  TRANSCRIPTION_COMPLETE: "Transcription complete",
  TRANSCRIPTION_ERROR: "Sorry, transcription failed. Please try again",
  MICROPHONE_DENIED: "Microphone access denied. Please enable microphone permissions in your browser settings",
  MICROPHONE_READY: "Microphone is ready. Tap the button to start recording",
  ASSESSMENT_SAVED: "Assessment saved successfully",
  RECORDING_SAVED_OFFLINE: "Recording saved offline. Will transcribe when connection returns",
} as const;
