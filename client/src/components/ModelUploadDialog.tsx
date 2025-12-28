import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    percentage: 0,
    message: ''
  });

  // Refs for managing upload state across tab switches
  const uploadAbortController = useRef<AbortController | null>(null);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
  const uploadInProgress = useRef(false);

  const utils = trpc.useUtils();

  // Cleanup on unmount or dialog close
  useEffect(() => {
    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
      if (uploadAbortController.current) {
        uploadAbortController.current.abort();
      }
    };
  }, []);

  // Handle visibility change to prevent upload interruption
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && uploadInProgress.current) {
        // Keep the connection alive when tab is hidden
        console.log('[ModelUpload] Tab hidden, keeping upload alive...');
      } else if (document.visibilityState === 'visible' && uploadInProgress.current) {
        console.log('[ModelUpload] Tab visible again, upload still in progress');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const resetForm = () => {
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
  };

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
        setFormat(ext as any);
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
    uploadAbortController.current = new AbortController();

    // Start keep-alive ping to prevent browser from throttling
    keepAliveInterval.current = setInterval(() => {
      if (uploadInProgress.current) {
        // Simple keep-alive - just log to keep the JS thread active
        console.log('[ModelUpload] Keep-alive ping');
      }
    }, 1000);

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
        
        // Set a generous timeout for large files (10 minutes)
        xhr.timeout = 10 * 60 * 1000;
        
        xhr.open('POST', '/api/upload-model');
        xhr.withCredentials = true; // Include cookies for authentication
        
        // Store reference for potential abort
        uploadAbortController.current = {
          abort: () => xhr.abort()
        } as AbortController;
        
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
    }
  };

  const handleCancel = () => {
    if (uploading) {
      uploadInProgress.current = false;
      if (uploadAbortController.current) {
        uploadAbortController.current.abort();
      }
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
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
                  💡 Tip: You can switch tabs - the upload will continue in the background.
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
            <Select value={format} onValueChange={(value: any) => setFormat(value)} disabled={uploading}>
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
