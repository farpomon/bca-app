import { useState, useRef, useEffect, useCallback } from "react";
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
  const [format, setFormat] = useState<"glb" | "gltf" | "fbx" | "obj" | "skp" | "rvt" | "rfa" | "dwg" | "dxf">("glb");
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
  const uploadMutation = trpc.models.upload.useMutation({
    onSuccess: () => {
      setProgress({ stage: 'complete', percentage: 100, message: 'Upload complete!' });
      toast.success("3D model uploaded successfully");
      utils.models.list.invalidate({ projectId, assetId });
      utils.models.getActive.invalidate({ projectId, assetId });
      // Delay closing to show completion state
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    },
    onError: (error) => {
      setProgress({ stage: 'error', percentage: 0, message: error.message });
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
      uploadInProgress.current = false;
    },
  });

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
      if (ext && ['glb', 'gltf', 'fbx', 'obj', 'skp', 'rvt', 'rfa', 'dwg', 'dxf'].includes(ext)) {
        setFormat(ext as any);
      }
    }
  };

  // Read file in chunks to track progress and prevent blocking
  const readFileWithProgress = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const fileSize = file.size;
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress({
            stage: 'reading',
            percentage: percentComplete,
            message: `Reading file: ${percentComplete}%`
          });
        }
      };

      reader.onload = () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (!base64) {
          reject(new Error("Failed to read file"));
          return;
        }
        resolve(base64);
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    });
  }, []);

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
      // Stage 1: Reading file
      setProgress({ stage: 'reading', percentage: 0, message: 'Reading file...' });
      
      const base64 = await readFileWithProgress(file);
      
      if (!uploadInProgress.current) {
        // Upload was cancelled
        return;
      }

      // Stage 2: Uploading to server
      setProgress({ stage: 'uploading', percentage: 0, message: 'Uploading to server...' });
      
      // Simulate upload progress (since tRPC doesn't support progress tracking natively)
      const uploadProgressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.stage === 'uploading' && prev.percentage < 90) {
            // Gradually increase progress based on file size
            const increment = file.size > 50 * 1024 * 1024 ? 2 : 5;
            return {
              ...prev,
              percentage: Math.min(prev.percentage + increment, 90),
              message: `Uploading to server: ${Math.min(prev.percentage + increment, 90)}%`
            };
          }
          return prev;
        });
      }, 500);

      try {
        await uploadMutation.mutateAsync({
          projectId,
          assetId,
          name,
          description,
          fileData: base64,
          format,
        });
      } finally {
        clearInterval(uploadProgressInterval);
      }

      // Stage 3: Processing (handled by onSuccess)
      setProgress({ stage: 'processing', percentage: 95, message: 'Processing model...' });

    } catch (error) {
      console.error("Upload error:", error);
      if (uploadInProgress.current) {
        setProgress({ 
          stage: 'error', 
          percentage: 0, 
          message: error instanceof Error ? error.message : 'Upload failed' 
        });
        toast.error(error instanceof Error ? error.message : "Upload failed");
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
                  {progress.stage === 'reading' && 'Reading file from disk...'}
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
                accept=".glb,.gltf,.fbx,.obj,.skp,.rvt,.rfa,.dwg,.dxf"
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
                {progress.stage === 'reading' && 'Reading...'}
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
