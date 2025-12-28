import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook to handle file uploads that persist across tab switches
 * 
 * The problem: When users switch browser tabs during an upload, browsers may:
 * 1. Throttle JavaScript execution in background tabs
 * 2. Pause or cancel network requests
 * 3. Suspend timers and intervals
 * 
 * This hook provides utilities to:
 * - Track upload state across visibility changes
 * - Use Web Locks API to prevent browser from killing the upload
 * - Provide callbacks for visibility changes during upload
 */

interface UseBackgroundUploadOptions {
  onVisibilityChange?: (isVisible: boolean, uploadInProgress: boolean) => void;
  onUploadInterrupted?: () => void;
}

interface UploadState {
  inProgress: boolean;
  startTime: number | null;
  fileName: string | null;
}

export function useBackgroundUpload(options: UseBackgroundUploadOptions = {}) {
  const uploadState = useRef<UploadState>({
    inProgress: false,
    startTime: null,
    fileName: null,
  });
  
  const lockRef = useRef<{ release: () => void } | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Acquire a Web Lock to prevent the browser from suspending the tab
  const acquireLock = useCallback(async (fileName: string) => {
    // Web Locks API is available in modern browsers
    if ('locks' in navigator) {
      try {
        // Request a lock that will be held during the upload
        // This signals to the browser that important work is happening
        const lockName = `upload-${Date.now()}-${fileName}`;
        
        // We use a promise that never resolves to hold the lock
        // until we explicitly release it
        navigator.locks.request(lockName, { mode: 'exclusive' }, async () => {
          return new Promise<void>((resolve) => {
            lockRef.current = { release: resolve };
          });
        }).catch(() => {
          // Lock request was aborted, which is fine
        });
      } catch (e) {
        console.warn('[BackgroundUpload] Web Locks API not available:', e);
      }
    }
  }, []);

  // Release the Web Lock
  const releaseLock = useCallback(() => {
    if (lockRef.current) {
      lockRef.current.release();
      lockRef.current = null;
    }
  }, []);

  // Start a keep-alive interval to prevent browser throttling
  const startKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    
    // Ping every second to keep the JS thread active
    keepAliveIntervalRef.current = setInterval(() => {
      if (uploadState.current.inProgress) {
        // This keeps the JS thread active in background tabs
        const elapsed = uploadState.current.startTime 
          ? Math.round((Date.now() - uploadState.current.startTime) / 1000)
          : 0;
        console.debug(`[BackgroundUpload] Keep-alive: ${elapsed}s elapsed`);
      }
    }, 1000);
  }, []);

  // Stop the keep-alive interval
  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  // Mark upload as started
  const startUpload = useCallback(async (fileName: string) => {
    uploadState.current = {
      inProgress: true,
      startTime: Date.now(),
      fileName,
    };
    
    await acquireLock(fileName);
    startKeepAlive();
    
    console.log(`[BackgroundUpload] Started upload: ${fileName}`);
  }, [acquireLock, startKeepAlive]);

  // Mark upload as completed
  const completeUpload = useCallback(() => {
    const { fileName, startTime } = uploadState.current;
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    uploadState.current = {
      inProgress: false,
      startTime: null,
      fileName: null,
    };
    
    releaseLock();
    stopKeepAlive();
    
    console.log(`[BackgroundUpload] Completed upload: ${fileName} (${duration}s)`);
  }, [releaseLock, stopKeepAlive]);

  // Mark upload as failed
  const failUpload = useCallback((error?: Error) => {
    const { fileName } = uploadState.current;
    
    uploadState.current = {
      inProgress: false,
      startTime: null,
      fileName: null,
    };
    
    releaseLock();
    stopKeepAlive();
    
    console.error(`[BackgroundUpload] Failed upload: ${fileName}`, error);
  }, [releaseLock, stopKeepAlive]);

  // Check if upload is in progress
  const isUploading = useCallback(() => {
    return uploadState.current.inProgress;
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      const inProgress = uploadState.current.inProgress;
      
      if (inProgress) {
        if (isVisible) {
          console.log('[BackgroundUpload] Tab visible - upload still in progress');
        } else {
          console.log('[BackgroundUpload] Tab hidden - keeping upload alive');
          // The keep-alive interval and Web Lock should prevent interruption
        }
      }
      
      options.onVisibilityChange?.(isVisible, inProgress);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseLock();
      stopKeepAlive();
    };
  }, [releaseLock, stopKeepAlive]);

  return {
    startUpload,
    completeUpload,
    failUpload,
    isUploading,
  };
}

/**
 * Wrapper for FileReader that handles tab visibility changes
 * Returns a promise that resolves with the file data
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.onabort = () => {
      reject(new Error('File reading was aborted'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Wrapper for fetch that handles tab visibility changes
 * Uses keepalive option to ensure the request completes even if tab is closed
 */
export async function backgroundFetch(
  url: string,
  options: RequestInit & { body: FormData | string }
): Promise<Response> {
  // Note: keepalive has a 64KB limit for POST body, so it won't work for large files
  // For large files, we rely on the Web Locks API and keep-alive interval
  const isSmallPayload = options.body instanceof FormData 
    ? false // FormData size is hard to determine, assume large
    : (options.body?.length || 0) < 64 * 1024;
  
  const fetchOptions: RequestInit = {
    ...options,
    // keepalive only works for small payloads
    keepalive: isSmallPayload,
    // Ensure credentials are included for authenticated requests
    credentials: 'include',
  };
  
  return fetch(url, fetchOptions);
}

/**
 * Upload file using XMLHttpRequest with progress tracking
 * This is more reliable for large files and provides progress events
 */
export function uploadWithProgress(
  url: string,
  formData: FormData,
  options: {
    onProgress?: (loaded: number, total: number) => void;
    onComplete?: (response: unknown) => void;
    onError?: (error: Error) => void;
    timeout?: number;
  } = {}
): { abort: () => void; promise: Promise<unknown> } {
  const xhr = new XMLHttpRequest();
  let aborted = false;
  
  const promise = new Promise((resolve, reject) => {
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && !aborted) {
        options.onProgress?.(event.loaded, event.total);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          options.onComplete?.(response);
          resolve(response);
        } catch (e) {
          const error = new Error('Invalid server response');
          options.onError?.(error);
          reject(error);
        }
      } else {
        let errorMessage = `Upload failed with status ${xhr.status}`;
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage = errorResponse.message || errorResponse.error || errorMessage;
        } catch (e) {
          // Use default error message
        }
        const error = new Error(errorMessage);
        options.onError?.(error);
        reject(error);
      }
    });
    
    xhr.addEventListener('error', () => {
      const error = new Error('Network error - please check your connection');
      options.onError?.(error);
      reject(error);
    });
    
    xhr.addEventListener('abort', () => {
      if (!aborted) {
        const error = new Error('Upload cancelled');
        options.onError?.(error);
        reject(error);
      }
    });
    
    xhr.addEventListener('timeout', () => {
      const error = new Error('Upload timed out - please try again');
      options.onError?.(error);
      reject(error);
    });
    
    // Set timeout (default 10 minutes for large files)
    xhr.timeout = options.timeout || 10 * 60 * 1000;
    
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
  
  return {
    abort: () => {
      aborted = true;
      xhr.abort();
    },
    promise,
  };
}
