import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({ onTranscriptionComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionState, setPermissionState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const transcribeMutation = trpc.media.transcribeAudio.useMutation();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setPermissionState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState("granted");
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // Auto-transcribe when recording stops
        handleTranscribe(blob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      setPermissionState("denied");
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error(
          "Microphone access denied. Please enable microphone permissions in your browser settings and try again.",
          { duration: 5000 }
        );
      } else if (error.name === "NotFoundError") {
        toast.error("No microphone found. Please connect a microphone and try again.");
      } else {
        toast.error("Could not access microphone. Please check permissions and try again.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Check file size (16MB limit)
      const fileSizeMB = blob.size / (1024 * 1024);
      if (fileSizeMB > 16) {
        toast.error("Audio file too large (max 16MB). Please record a shorter clip.");
        setIsProcessing(false);
        return;
      }
      
      // Upload to S3 first
      const formData = new FormData();
      formData.append("file", blob, `voice-${Date.now()}.webm`);
      
      const uploadResponse = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio");
      }
      
      const { url } = await uploadResponse.json();
      
      // Transcribe using manus-speech-to-text
      const result = await transcribeMutation.mutateAsync({ audioUrl: url });
      
      setTranscribedText(result.text);
      toast.success("Transcription complete!");
      
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (transcribedText) {
      onTranscriptionComplete(transcribedText);
      handleReset();
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    setTranscribedText("");
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Voice Recording</h3>
        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            Recording: {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {permissionState === "denied" && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm font-medium text-destructive mb-2">Microphone Access Denied</p>
          <p className="text-xs text-muted-foreground mb-3">
            To use voice recording, please enable microphone permissions:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Click the lock/info icon in your browser's address bar</li>
            <li>Find "Microphone" in the permissions list</li>
            <li>Change the setting to "Allow"</li>
            <li>Refresh the page and try again</li>
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        {!isRecording && !audioBlob && permissionState !== "denied" && (
          <Button 
            onClick={startRecording} 
            variant="default" 
            className="gap-2"
            disabled={permissionState === "requesting"}
          >
            {permissionState === "requesting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting Permission...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Recording
              </>
            )}
          </Button>
        )}
        
        {isRecording && (
          <Button onClick={stopRecording} variant="destructive" className="gap-2">
            <Square className="w-4 h-4" />
            Stop Recording
          </Button>
        )}
        
        {audioBlob && !isProcessing && !transcribedText && (
          <Button onClick={() => handleTranscribe(audioBlob)} variant="default" className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Transcribing...
          </Button>
        )}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing audio...
        </div>
      )}

      {transcribedText && (
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">Transcribed Text:</p>
            <textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              className="w-full min-h-[100px] p-2 text-sm bg-background border rounded resize-none"
              placeholder="Edit transcription if needed..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleConfirm} variant="default" className="gap-2">
              <Check className="w-4 h-4" />
              Use This Text
            </Button>
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <X className="w-4 h-4" />
              Discard
            </Button>
            {onCancel && (
              <Button onClick={onCancel} variant="ghost">
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
