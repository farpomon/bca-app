/**
 * Audio Feedback Hook
 * Provides audio feedback using ElevenLabs TTS
 */

import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";

type FeedbackMessage =
  | "RECORDING_STARTED"
  | "RECORDING_STOPPED"
  | "TRANSCRIPTION_COMPLETE"
  | "TRANSCRIPTION_ERROR"
  | "MICROPHONE_DENIED"
  | "MICROPHONE_READY"
  | "ASSESSMENT_SAVED"
  | "RECORDING_SAVED_OFFLINE";

export function useAudioFeedback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    // Check localStorage for user preference
    const saved = localStorage.getItem("audioFeedbackEnabled");
    return saved === null ? true : saved === "true"; // Default to enabled
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const getFeedbackMutation = trpc.audio.getFeedbackAudio.useMutation();

  /**
   * Play audio feedback for a predefined message
   */
  const playFeedback = useCallback(
    async (message: FeedbackMessage) => {
      if (!isEnabled) return;

      try {
        setIsPlaying(true);

        const result = await getFeedbackMutation.mutateAsync({ message });

        if (result.success && result.audio) {
          // Convert base64 to blob
          const binaryString = atob(result.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: result.mimeType });
          const url = URL.createObjectURL(blob);

          // Create and play audio
          if (audioRef.current) {
            audioRef.current.pause();
            URL.revokeObjectURL(audioRef.current.src);
          }

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(url);
          };

          audio.onerror = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(url);
            console.error("[Audio Feedback] Error playing audio");
          };

          await audio.play();
        }
      } catch (error) {
        console.error("[Audio Feedback] Error:", error);
        setIsPlaying(false);
      }
    },
    [isEnabled, getFeedbackMutation]
  );

  /**
   * Toggle audio feedback on/off
   */
  const toggleAudioFeedback = useCallback(() => {
    setIsEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("audioFeedbackEnabled", String(newValue));
      return newValue;
    });
  }, []);

  /**
   * Stop currently playing audio
   */
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return {
    playFeedback,
    isPlaying,
    isEnabled,
    toggleAudioFeedback,
    stopAudio,
  };
}
