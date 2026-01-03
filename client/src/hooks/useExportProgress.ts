import { useState, useEffect, useCallback, useRef } from 'react';

export interface ExportProgress {
  exportId: string;
  status: 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';
  progress: number;
  currentItem: number;
  totalItems: number;
  currentItemName?: string;
  message?: string;
  result?: {
    url?: string;
    filename?: string;
    size?: number;
  };
  error?: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface UseExportProgressOptions {
  onProgress?: (progress: ExportProgress) => void;
  onComplete?: (result: ExportProgress['result']) => void;
  onError?: (error: string) => void;
}

export function useExportProgress(options: UseExportProgressOptions = {}) {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const exportIdRef = useRef<string | null>(null);
  
  const { onProgress, onComplete, onError } = options;
  
  const subscribe = useCallback((exportId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    exportIdRef.current = exportId;
    
    const eventSource = new EventSource(`/api/export/progress/${exportId}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setIsConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data: ExportProgress = JSON.parse(event.data);
        setProgress(data);
        onProgress?.(data);
        
        if (data.status === 'complete') {
          onComplete?.(data.result);
          eventSource.close();
          setIsConnected(false);
        } else if (data.status === 'error') {
          onError?.(data.error || 'Export failed');
          eventSource.close();
          setIsConnected(false);
        } else if (data.status === 'cancelled') {
          eventSource.close();
          setIsConnected(false);
        }
      } catch (error) {
        console.error('[useExportProgress] Failed to parse event:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('[useExportProgress] SSE error:', error);
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (exportIdRef.current === exportId) {
          subscribe(exportId);
        }
      }, 3000);
    };
    
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [onProgress, onComplete, onError]);
  
  const unsubscribe = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    exportIdRef.current = null;
    setIsConnected(false);
    setProgress(null);
  }, []);
  
  const cancel = useCallback(async () => {
    if (!exportIdRef.current) {
      return false;
    }
    
    try {
      const response = await fetch(`/api/export/progress/${exportIdRef.current}/cancel`, {
        method: 'POST',
      });
      
      if (response.ok) {
        unsubscribe();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[useExportProgress] Cancel failed:', error);
      return false;
    }
  }, [unsubscribe]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  return {
    progress,
    isConnected,
    subscribe,
    unsubscribe,
    cancel,
  };
}
