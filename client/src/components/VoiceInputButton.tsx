import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({
  onTranscriptionComplete,
  disabled = false,
  className = "",
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const transcribeMutation = trpc.audio.transcribeAudio.useMutation({
    onSuccess: (data) => {
      if (data.success && data.text) {
        onTranscriptionComplete(data.text);
        toast.success("Transcription complete!");
      } else {
        toast.error(data.error || "Failed to transcribe audio");
      }
      setIsTranscribing(false);
    },
    onError: (error) => {
      toast.error(`Transcription failed: ${error.message}`);
      setIsTranscribing(false);
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(",")[1];
          
          setIsTranscribing(true);
          transcribeMutation.mutate({
            audioData: base64Audio,
            language: "en",
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording started...");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Processing recording...");
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      className={className}
    >
      {isTranscribing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Transcribing...
        </>
      ) : isRecording ? (
        <>
          <MicOff className="h-4 w-4 mr-2" />
          Stop Recording
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 mr-2" />
          Voice Input
        </>
      )}
    </Button>
  );
}
