import { useState, useEffect, useCallback } from "react";
import {
  initDB,
  queueRecording,
  getPendingRecordings,
  getAllRecordings,
  updateRecordingStatus,
  deleteRecording,
  getQueueStats,
  type QueuedRecording,
} from "@/lib/offlineRecordingQueue";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { saveRecording } from "@/lib/voiceRecordingHistory";

export function useOfflineRecordingQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedRecordings, setQueuedRecordings] = useState<QueuedRecording[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, failed: 0 });
  
  const transcribeMutation = trpc.media.transcribeAudio.useMutation();

  // Initialize DB and load recordings
  useEffect(() => {
    initDB().then(() => {
      refreshQueue();
    });
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored. Uploading queued recordings...");
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info("You're offline. Recordings will be queued for upload.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshQueue = useCallback(async () => {
    try {
      const recordings = await getAllRecordings();
      setQueuedRecordings(recordings);
      
      const queueStats = await getQueueStats();
      setStats(queueStats);
    } catch (error) {
      console.error("Error refreshing queue:", error);
    }
  }, []);

  const addToQueue = useCallback(async (blob: Blob, context: string) => {
    try {
      const id = await queueRecording(blob, context);
      await refreshQueue();
      
      if (isOnline) {
        // If online, try to upload immediately
        processQueue();
      } else {
        toast.info("Recording saved offline. Will upload when connection returns.");
      }
      
      return id;
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast.error("Failed to save recording offline");
      throw error;
    }
  }, [isOnline, refreshQueue]);

  const uploadRecording = useCallback(async (recording: QueuedRecording): Promise<string> => {
    try {
      await updateRecordingStatus(recording.id, "uploading");
      
      // Upload to S3 via API
      const fileName = `voice-${recording.timestamp}.webm`;
      const formData = new FormData();
      formData.append("file", recording.blob, fileName);
      
      const uploadResponse = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio");
      }
      
      const { url } = await uploadResponse.json();
      
      // Transcribe the uploaded audio
      const result = await transcribeMutation.mutateAsync({ audioUrl: url });
      
      // Save to history
      const duration = (Date.now() - recording.timestamp) / 1000;
      saveRecording(result.text, duration, recording.context);
      
      return result.text;
    } catch (error) {
      await updateRecordingStatus(recording.id, "failed", error instanceof Error ? error.message : "Upload failed");
      throw error;
    }
  }, [transcribeMutation]);

  const processQueue = useCallback(async () => {
    if (isProcessingQueue || !isOnline) return;

    setIsProcessingQueue(true);
    
    try {
      const pending = await getPendingRecordings();
      
      if (pending.length === 0) {
        setIsProcessingQueue(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const recording of pending) {
        try {
          await uploadRecording(recording);
          await deleteRecording(recording.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to upload recording ${recording.id}:`, error);
          failCount++;
          
          // Stop after 3 consecutive failures
          if (failCount >= 3) {
            break;
          }
        }
      }

      await refreshQueue();

      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} queued recording(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to upload ${failCount} recording(s). Will retry later.`);
      }
    } catch (error) {
      console.error("Error processing queue:", error);
    } finally {
      setIsProcessingQueue(false);
    }
  }, [isOnline, isProcessingQueue, uploadRecording, refreshQueue]);

  const retryFailed = useCallback(async () => {
    const failed = queuedRecordings.filter(r => r.status === "failed");
    
    for (const recording of failed) {
      await updateRecordingStatus(recording.id, "pending");
    }
    
    await refreshQueue();
    
    if (isOnline) {
      processQueue();
    }
  }, [queuedRecordings, isOnline, refreshQueue, processQueue]);

  const clearQueue = useCallback(async () => {
    for (const recording of queuedRecordings) {
      await deleteRecording(recording.id);
    }
    await refreshQueue();
    toast.success("Queue cleared");
  }, [queuedRecordings, refreshQueue]);

  return {
    isOnline,
    queuedRecordings,
    isProcessingQueue,
    stats,
    addToQueue,
    processQueue,
    retryFailed,
    clearQueue,
    refreshQueue,
  };
}
