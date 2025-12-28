import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, AlertCircle, CheckCircle2, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ModelUploadDialogProps {
  projectId: number;
  assetId?: number; // Optional - if provided, model is associated with specific asset
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadStage = 'idle' | 'reading' | 'uploading' | 'processing' | 'complete' | 'error';

interface UploadProgress {
  stage: UploadStage;
  percentage: number;
  message: string;
}

export function ModelUploadDialog({ projectId, assetId, open, onOpenChange }: ModelUploadDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"glb" | "gltf" | "fbx" | "obj" | "skp" | "rvt" | "rfa" | "dwg" | "dxf" | "ifc" | "nwd" | "nwc">("glb");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    percentage: 0,
    message: ''
  });

  // Refs for managing upload state across tab switches
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
  const uploadInProgress = useRef(false);
  const webLockReleaseRef = useRef<(() => void) | null>(null);

  const utils = trpc.useUtils();

  // Acquire Web Lock to prevent browser from suspending the upload
  const acquireWebLock = useCallback(async (fileName: string) => {
    if ('locks' in navigator) {
      try {
        const lockName = `model-upload-${Date.now()}-${fileName.replace(/[^a-z0-9]/gi, '_')}`;
        navigator.locks.request(lockName, { mode: 'exclusive' }, async () => {
          return new Promise<void>((resolve) => {
            webLockReleaseRef.current = resolve;
          });
        }).catch(() => {
          // Lock request was aborted, which is fine
        });
        console.log('[ModelUpload] Web Lock acquired');
      } catch (e) {
        console.warn('[ModelUpload] Web Locks API not available:', e);
      }
    }
  }, []);

  // Release Web Lock
  const releaseWebLock = useCallback(() => {
    if (webLockReleaseRef.current) {
      webLockReleaseRef.current();
      webLockReleaseRef.current = null;
      console.log('[ModelUpload] Web Lock released');
    }
  }, []);

  // Cleanup on unmount or dialog close
  useEffect(() => {
    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
      if (xhrRef.current && uploadInProgress.current) {
        // Don't abort on unmount if upload is in progress - let it complete
        console.log('[ModelUpload] Component unmounting but upload in progress, letting it complete');
      }
      releaseWebLock();
    };
  }, [releaseWebLock]);

  // Handle visibility change to track tab state and keep upload alive
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      setTabHidden(isHidden);
      
      if (uploadInProgress.current) {
        if (isHidden) {
          console.log('[ModelUpload] Tab hidden, upload continuing in background...');
          // The Web Lock and keep-alive interval will keep the upload alive
        } else {
          console.log('[ModelUpload] Tab visible again, upload status:', progress.stage);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [progress.stage]);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setFormat("glb");
    setFile(null);
    setUploading(false);
    setProgress({ stage: 'idle', percentage: 0, message: '' });
    uploadInProgress.current = false;
    if (keepAliveInterval.current) {
      clearInterval(keepAliveInterval.current);
      keepAliveInterval.current = null;
    }
    releaseWebLock();
  }, [releaseWebLock]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        toast.error("File size exceeds 500MB limit");
        return;
      }
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
      // Auto-detect format from file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext && ['glb', 'gltf', 'fbx', 'obj', 'skp', 'rvt', 'rfa', 'dwg', 'dxf', 'ifc', 'nwd', 'nwc'].includes(ext)) {
        setFormat(ext as typeof format);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !name) {
      toast.error("Please provide a file and name");
      return;
    }

    setUploading(true);
    uploadInProgress.current = true;

    // Acquire Web Lock to signal browser that important work is happening
    await acquireWebLock(file.name);

    // Start keep-alive ping to prevent browser from throttling
    // This runs every 500ms to keep the JS thread active even in background
    keepAliveInterval.current = setInterval(() => {
      if (uploadInProgress.current) {
        // This keeps the JS thread active in background tabs
        // Using performance.now() as it's more reliable than Date.now() in background
        const timestamp = performance.now();
        console.debug(`[ModelUpload] Keep-alive: ${Math.round(timestamp / 1000)}s`);
      }
    }, 500);

    try {
      // Stage 1: Preparing upload
      setProgress({ stage: 'reading', percentage: 10, message: 'Preparing file for upload...' });
      
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId.toString());
      if (assetId) {
        formData.append('assetId', assetId.toString());
      }
      formData.append('name', name);
      formData.append('description', description);
      formData.append('uploadToAps', 'true');

      if (!uploadInProgress.current) {
        // Upload was cancelled
        return;
      }

      // Stage 2: Uploading to server using XMLHttpRequest for progress tracking
      setProgress({ stage: 'uploading', percentage: 15, message: 'Uploading to server: 15%' });
      
      const uploadPromise = new Promise<{ success: boolean; url: string; apsUrn?: string; apsStatus?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && uploadInProgress.current) {
            // Map upload progress from 15% to 85%
            const uploadPercent = Math.round((event.loaded / event.total) * 70) + 15;
            setProgress({
              stage: 'uploading',
              percentage: uploadPercent,
              message: `Uploading to server: ${uploadPercent}%`
            });
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid server response'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.message || errorResponse.error || `Upload failed with status ${xhr.status}`));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error - please check your connection and try again'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
        
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out - please try again with a smaller file or better connection'));
        });
        
        // Set a generous timeout for large files (15 minutes)
        xhr.timeout = 15 * 60 * 1000;
        
        xhr.open('POST', '/api/upload-model');
        xhr.withCredentials = true; // Include cookies for authentication
        
        xhr.send(formData);
      });

      const result = await uploadPromise;

      if (!uploadInProgress.current) {
        return;
      }

      // Stage 3: Processing complete
      setProgress({ stage: 'processing', percentage: 95, message: 'Processing model...' });
      
      // Brief delay to show processing state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress({ stage: 'complete', percentage: 100, message: 'Upload complete!' });
      toast.success("3D model uploaded successfully");
      
      // Invalidate queries to refresh the list
      utils.models.list.invalidate({ projectId, assetId });
      utils.models.getActive.invalidate({ projectId, assetId });
      
      // Delay closing to show completion state
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);

    } catch (error) {
      console.error("Upload error:", error);
      if (uploadInProgress.current) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setProgress({ 
          stage: 'error', 
          percentage: 0, 
          message: errorMessage
        });
        toast.error(errorMessage);
      }
      setUploading(false);
      uploadInProgress.current = false;
    } finally {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
        keepAliveInterval.current = null;
      }
      xhrRef.current = null;
      releaseWebLock();
    }
  };

  const handleCancel = () => {
    if (uploading) {
      uploadInProgress.current = false;
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
      releaseWebLock();
      toast.info("Upload cancelled");
    }
    onOpenChange(false);
    resetForm();
  };

  const getProgressColor = () => {
    switch (progress.stage) {
      case 'complete': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return '';
    }
  };

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload 3D Model</DialogTitle>
          <DialogDescription>
            Upload a 3D model of your facility. Supported formats: GLB, GLTF, FBX, OBJ, SketchUp (SKP), Revit (RVT/RFA), DWG/DXF (max 500MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Section - Only show when uploading */}
          {uploading && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                {getStageIcon()}
                <span className="text-sm font-medium">{progress.message}</span>
                {tabHidden && uploadInProgress.current && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
                    <EyeOff className="h-3 w-3" />
                    Background
                  </span>
                )}
              </div>
              <Progress 
                value={progress.percentage} 
                className={`h-3 ${getProgressColor()}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {progress.stage === 'reading' && 'Preparing file...'}
                  {progress.stage === 'uploading' && 'Uploading to cloud storage...'}
                  {progress.stage === 'processing' && 'Processing and converting...'}
                  {progress.stage === 'complete' && 'Upload successful!'}
                  {progress.stage === 'error' && 'Upload failed'}
                </span>
                <span>{progress.percentage}%</span>
              </div>
              {progress.stage !== 'complete' && progress.stage !== 'error' && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✅ Safe to switch tabs - upload will continue in the background.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">Model File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".glb,.gltf,.fbx,.obj,.skp,.rvt,.rfa,.dwg,.dxf,.ifc,.nwd,.nwc"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Model Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Building - Ground Floor"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format *</Label>
            <Select value={format} onValueChange={(value: typeof format) => setFormat(value)} disabled={uploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="glb">GLB (recommended)</SelectItem>
                <SelectItem value="gltf">GLTF</SelectItem>
                <SelectItem value="fbx">FBX</SelectItem>
                <SelectItem value="obj">OBJ</SelectItem>
                <SelectItem value="skp">SketchUp (SKP)</SelectItem>
                <SelectItem value="rvt">Revit (RVT)</SelectItem>
                <SelectItem value="rfa">Revit Family (RFA)</SelectItem>
                <SelectItem value="dwg">AutoCAD (DWG)</SelectItem>
                <SelectItem value="dxf">DXF</SelectItem>
                <SelectItem value="ifc">IFC</SelectItem>
                <SelectItem value="nwd">Navisworks (NWD)</SelectItem>
                <SelectItem value="nwc">Navisworks Cache (NWC)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or notes about this model"
              rows={3}
              disabled={uploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={progress.stage === 'complete'}>
            {uploading && progress.stage !== 'complete' ? 'Cancel Upload' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !file || !name}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {progress.stage === 'reading' && 'Preparing...'}
                {progress.stage === 'uploading' && 'Uploading...'}
                {progress.stage === 'processing' && 'Processing...'}
                {progress.stage === 'complete' && 'Complete!'}
                {progress.stage === 'error' && 'Failed'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
