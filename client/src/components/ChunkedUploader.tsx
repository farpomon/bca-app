import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, CheckCircle, AlertCircle, Pause, Play, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChunkedUploaderProps {
  onComplete?: (result: { filename: string; size: number; sessionId: string }) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes, default 100MB
  chunkSize?: number; // in bytes, default 1MB
  className?: string;
  metadata?: Record<string, unknown>;
}

interface UploadState {
  status: 'idle' | 'initializing' | 'uploading' | 'paused' | 'completing' | 'complete' | 'error';
  sessionId: string | null;
  filename: string | null;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  error: string | null;
}

const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB

export function ChunkedUploader({
  onComplete,
  onError,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv',
  maxSize = DEFAULT_MAX_SIZE,
  chunkSize = DEFAULT_CHUNK_SIZE,
  className,
  metadata,
}: ChunkedUploaderProps) {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    sessionId: null,
    filename: null,
    totalChunks: 0,
    uploadedChunks: 0,
    progress: 0,
    error: null,
  });
  
  const fileRef = useRef<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  
  const resetState = useCallback(() => {
    setState({
      status: 'idle',
      sessionId: null,
      filename: null,
      totalChunks: 0,
      uploadedChunks: 0,
      progress: 0,
      error: null,
    });
    fileRef.current = null;
    abortControllerRef.current = null;
    isPausedRef.current = false;
  }, []);
  
  const initSession = async (file: File): Promise<{ sessionId: string; totalChunks: number } | null> => {
    try {
      const response = await fetch('/api/upload/chunked/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          totalSize: file.size,
          chunkSize,
          metadata,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize upload');
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ChunkedUploader] Init failed:', error);
      return null;
    }
  };
  
  const uploadChunk = async (
    sessionId: string,
    file: File,
    chunkIndex: number,
    signal: AbortSignal
  ): Promise<boolean> => {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    
    try {
      const response = await fetch(`/api/upload/chunked/${sessionId}/chunk`, {
        method: 'POST',
        body: formData,
        signal,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload chunk');
      }
      
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return false;
      }
      console.error(`[ChunkedUploader] Chunk ${chunkIndex} failed:`, error);
      return false;
    }
  };
  
  const completeUpload = async (sessionId: string): Promise<{ filename: string; size: number } | null> => {
    try {
      const response = await fetch(`/api/upload/chunked/${sessionId}/complete`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete upload');
      }
      
      const result = await response.json();
      return result.file;
    } catch (error) {
      console.error('[ChunkedUploader] Complete failed:', error);
      return null;
    }
  };
  
  const getUploadStatus = async (sessionId: string): Promise<{ missingChunks: number[] } | null> => {
    try {
      const response = await fetch(`/api/upload/chunked/${sessionId}/status`);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ChunkedUploader] Status check failed:', error);
      return null;
    }
  };
  
  const startUpload = useCallback(async (file: File) => {
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      setState(prev => ({
        ...prev,
        status: 'error',
        error: `File size exceeds ${maxSizeMB}MB limit`,
      }));
      onError?.(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }
    
    fileRef.current = file;
    setState(prev => ({
      ...prev,
      status: 'initializing',
      filename: file.name,
      error: null,
    }));
    
    // Initialize session
    const session = await initSession(file);
    if (!session) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to initialize upload session',
      }));
      onError?.('Failed to initialize upload session');
      return;
    }
    
    const { sessionId, totalChunks } = session;
    
    setState(prev => ({
      ...prev,
      status: 'uploading',
      sessionId,
      totalChunks,
    }));
    
    // Upload chunks
    abortControllerRef.current = new AbortController();
    isPausedRef.current = false;
    
    let uploadedCount = 0;
    
    for (let i = 0; i < totalChunks; i++) {
      // Check for pause
      while (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
      }
      
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const success = await uploadChunk(sessionId, file, i, abortControllerRef.current.signal);
      
      if (!success) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        
        // Retry once
        const retrySuccess = await uploadChunk(sessionId, file, i, abortControllerRef.current.signal);
        if (!retrySuccess) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: `Failed to upload chunk ${i + 1}`,
          }));
          onError?.(`Failed to upload chunk ${i + 1}`);
          return;
        }
      }
      
      uploadedCount++;
      const progress = (uploadedCount / totalChunks) * 100;
      
      setState(prev => ({
        ...prev,
        uploadedChunks: uploadedCount,
        progress,
      }));
    }
    
    // Complete upload
    setState(prev => ({ ...prev, status: 'completing' }));
    
    const result = await completeUpload(sessionId);
    if (!result) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to complete upload',
      }));
      onError?.('Failed to complete upload');
      return;
    }
    
    setState(prev => ({
      ...prev,
      status: 'complete',
      progress: 100,
    }));
    
    onComplete?.({ ...result, sessionId });
  }, [chunkSize, maxSize, metadata, onComplete, onError]);
  
  const resumeUpload = useCallback(async () => {
    if (!state.sessionId || !fileRef.current) {
      return;
    }
    
    isPausedRef.current = false;
    setState(prev => ({ ...prev, status: 'uploading' }));
    
    // Get missing chunks
    const status = await getUploadStatus(state.sessionId);
    if (!status) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to resume upload - session may have expired',
      }));
      return;
    }
    
    const { missingChunks } = status;
    const file = fileRef.current;
    
    abortControllerRef.current = new AbortController();
    
    let uploadedCount = state.totalChunks - missingChunks.length;
    
    for (const chunkIndex of missingChunks) {
      while (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
      }
      
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const success = await uploadChunk(state.sessionId, file, chunkIndex, abortControllerRef.current.signal);
      
      if (!success && !abortControllerRef.current?.signal.aborted) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: `Failed to upload chunk ${chunkIndex + 1}`,
        }));
        return;
      }
      
      uploadedCount++;
      const progress = (uploadedCount / state.totalChunks) * 100;
      
      setState(prev => ({
        ...prev,
        uploadedChunks: uploadedCount,
        progress,
      }));
    }
    
    // Complete upload
    setState(prev => ({ ...prev, status: 'completing' }));
    
    const result = await completeUpload(state.sessionId);
    if (!result) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to complete upload',
      }));
      return;
    }
    
    setState(prev => ({
      ...prev,
      status: 'complete',
      progress: 100,
    }));
    
    onComplete?.({ ...result, sessionId: state.sessionId! });
  }, [state.sessionId, state.totalChunks, onComplete]);
  
  const pauseUpload = useCallback(() => {
    isPausedRef.current = true;
    setState(prev => ({ ...prev, status: 'paused' }));
  }, []);
  
  const cancelUpload = useCallback(async () => {
    abortControllerRef.current?.abort();
    
    if (state.sessionId) {
      try {
        await fetch(`/api/upload/chunked/${state.sessionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('[ChunkedUploader] Cancel failed:', error);
      }
    }
    
    resetState();
  }, [state.sessionId, resetState]);
  
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      startUpload(file);
    }
    event.target.value = '';
  }, [startUpload]);
  
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      startUpload(file);
    }
  }, [startUpload]);
  
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);
  
  const getStatusIcon = () => {
    switch (state.status) {
      case 'complete':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case 'paused':
        return <Pause className="h-8 w-8 text-yellow-500" />;
      default:
        return <Upload className="h-8 w-8 text-muted-foreground" />;
    }
  };
  
  const getStatusText = () => {
    switch (state.status) {
      case 'idle':
        return 'Drop file here or click to upload';
      case 'initializing':
        return 'Initializing upload...';
      case 'uploading':
        return `Uploading: ${state.uploadedChunks}/${state.totalChunks} chunks`;
      case 'paused':
        return 'Upload paused';
      case 'completing':
        return 'Finalizing upload...';
      case 'complete':
        return 'Upload complete!';
      case 'error':
        return state.error || 'Upload failed';
    }
  };
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Large File Upload</span>
          {state.status !== 'idle' && state.status !== 'complete' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelUpload}
              className="h-6 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === 'idle' ? (
          <label
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {getStatusIcon()}
              <p className="mb-2 text-sm text-muted-foreground">
                {getStatusText()}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports resumable uploads for files up to {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileSelect}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{state.filename}</p>
                <p className="text-xs text-muted-foreground">{getStatusText()}</p>
              </div>
            </div>
            
            <Progress value={state.progress} className="h-2" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{state.progress.toFixed(1)}%</span>
              <span>
                {state.uploadedChunks}/{state.totalChunks} chunks
              </span>
            </div>
            
            <div className="flex gap-2">
              {state.status === 'uploading' && (
                <Button variant="outline" size="sm" onClick={pauseUpload}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              
              {state.status === 'paused' && (
                <Button variant="outline" size="sm" onClick={resumeUpload}>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              
              {state.status === 'error' && (
                <>
                  <Button variant="outline" size="sm" onClick={resumeUpload}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    Start Over
                  </Button>
                </>
              )}
              
              {state.status === 'complete' && (
                <Button variant="outline" size="sm" onClick={resetState}>
                  Upload Another
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
