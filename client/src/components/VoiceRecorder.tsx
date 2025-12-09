import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Check, X, AlertCircle, CheckCircle2, RefreshCw, History } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { saveRecording } from "@/lib/voiceRecordingHistory";
import { RecordingHistory } from "./RecordingHistory";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel?: () => void;
  context?: string; // e.g., "Assessment", "Project Notes"
}

export function VoiceRecorder({ onTranscriptionComplete, onCancel, context = "Assessment" }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionState, setPermissionState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [micTested, setMicTested] = useState(false);
  const [browserType, setBrowserType] = useState<"chrome" | "firefox" | "safari" | "edge" | "other">("other");
  const [showHistory, setShowHistory] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const transcribeMutation = trpc.media.transcribeAudio.useMutation();

  useEffect(() => {
    // Detect browser
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg")) {
      setBrowserType("chrome");
    } else if (ua.includes("Firefox")) {
      setBrowserType("firefox");
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
      setBrowserType("safari");
    } else if (ua.includes("Edg")) {
      setBrowserType("edge");
    }
  }, []);

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

  const testMicrophone = async () => {
    try {
      setPermissionState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState("granted");
      setMicTested(true);
      stream.getTracks().forEach(track => track.stop());
      toast.success("Microphone access granted! Ready to record.");
    } catch (error: any) {
      console.error("Error testing microphone:", error);
      setPermissionState("denied");
      setMicTested(true);
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error(
          "Microphone access denied. Please enable microphone permissions in your browser settings.",
          { duration: 5000 }
        );
      } else if (error.name === "NotFoundError") {
        toast.error("No microphone found. Please connect a microphone and try again.");
      } else {
        toast.error("Could not access microphone. Please check permissions and try again.");
      }
    }
  };

  const retryPermission = () => {
    setPermissionState("idle");
    setMicTested(false);
    testMicrophone();
  };

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
      setRecordingStartTime(Date.now());
      
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
      
      // Save to history
      const duration = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : undefined;
      saveRecording(result.text, duration, context);
      
      toast.success("Transcription complete and saved to history!");
      
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

  const getBrowserInstructions = () => {
    const instructions = {
      chrome: [
        "Click the lock icon (🔒) in the address bar",
        "Find 'Microphone' and select 'Allow'",
        "Click 'Try Again' below"
      ],
      firefox: [
        "Click the microphone icon in the address bar",
        "Select 'Allow' for microphone access",
        "Click 'Try Again' below"
      ],
      safari: [
        "Go to Safari → Settings → Websites → Microphone",
        "Find this website and select 'Allow'",
        "Click 'Try Again' below"
      ],
      edge: [
        "Click the lock icon in the address bar",
        "Find 'Microphone' and select 'Allow'",
        "Click 'Try Again' below"
      ],
      other: [
        "Click the lock/info icon in your browser's address bar",
        "Find 'Microphone' in the permissions list",
        "Change the setting to 'Allow'",
        "Click 'Try Again' below"
      ]
    };

    const steps = instructions[browserType];
    
    return (
      <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
        {steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ul>
    );
  };

  const handleSelectFromHistory = (text: string) => {
    setTranscribedText(text);
    setShowHistory(false);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Voice Recording</h3>
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              Recording: {formatTime(recordingTime)}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            {showHistory ? "Hide" : "Show"} History
          </Button>
        </div>
      </div>

      {/* Microphone Status Badge - Only show if granted */}
      {micTested && permissionState === "granted" && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Microphone Ready
          </Badge>
        </div>
      )}

      {permissionState === "denied" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-amber-900">Microphone Permission Needed</p>
              <p className="text-xs text-amber-800">
                To use voice recording, please enable microphone access:
              </p>
              {getBrowserInstructions()}
            </div>
          </div>
          <Button 
            onClick={retryPermission} 
            variant="default" 
            size="sm"
            className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <RefreshCw className="w-3 h-3" />
            Grant Microphone Access
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {!micTested && permissionState === "idle" && (
          <Button 
            onClick={testMicrophone} 
            variant="default" 
            className="gap-2 w-full sm:w-auto"
            size="lg"
          >
            <Mic className="w-4 h-4" />
            Enable Microphone
          </Button>
        )}
        
        {!isRecording && !audioBlob && permissionState !== "denied" && micTested && (
          <Button 
            onClick={startRecording} 
            variant="default" 
            className="gap-2 w-full sm:w-auto"
            size="lg"
            disabled={permissionState === "requesting"}
          >
            {permissionState === "requesting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting...
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
          <Button onClick={stopRecording} variant="destructive" className="gap-2 w-full sm:w-auto" size="lg">
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

      {/* Recording History Panel */}
      {showHistory && (
        <div className="border-t pt-4">
          <RecordingHistory
            onSelectRecording={handleSelectFromHistory}
            context={context}
          />
        </div>
      )}
    </div>
  );
}
