import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, File, X, FileText, Loader2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface DocumentUploadProps {
  assessmentId: number;
  projectId: number;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ assessmentId, projectId, onUploadComplete }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for background upload handling
  const uploadInProgress = useRef(false);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
  const webLockReleaseRef = useRef<(() => void) | null>(null);

  // Acquire Web Lock to prevent browser from suspending the upload
  const acquireWebLock = useCallback(async (fileName: string) => {
    if ('locks' in navigator) {
      try {
        const lockName = `doc-upload-${Date.now()}-${fileName.replace(/[^a-z0-9]/gi, '_')}`;
        navigator.locks.request(lockName, { mode: 'exclusive' }, async () => {
          return new Promise<void>((resolve) => {
            webLockReleaseRef.current = resolve;
          });
        }).catch(() => {
          // Lock request was aborted, which is fine
        });
      } catch (e) {
        console.warn('[DocumentUpload] Web Locks API not available:', e);
      }
    }
  }, []);

  // Release Web Lock
  const releaseWebLock = useCallback(() => {
    if (webLockReleaseRef.current) {
      webLockReleaseRef.current();
      webLockReleaseRef.current = null;
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      setTabHidden(isHidden);
      
      if (uploadInProgress.current) {
        if (isHidden) {
          console.log('[DocumentUpload] Tab hidden, upload continuing in background...');
        } else {
          console.log('[DocumentUpload] Tab visible again');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
      releaseWebLock();
    };
  }, [releaseWebLock]);

  const uploadMutation = trpc.assessmentDocuments.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setSelectedFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      uploadInProgress.current = false;
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
        keepAliveInterval.current = null;
      }
      releaseWebLock();
      onUploadComplete?.();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      uploadInProgress.current = false;
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
        keepAliveInterval.current = null;
      }
      releaseWebLock();
    },
  });

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    uploadInProgress.current = true;
    
    // Acquire Web Lock
    await acquireWebLock(selectedFile.name);
    
    // Start keep-alive ping
    keepAliveInterval.current = setInterval(() => {
      if (uploadInProgress.current) {
        console.debug(`[DocumentUpload] Keep-alive: ${Math.round(performance.now() / 1000)}s`);
      }
    }, 500);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64 = base64Data.split(",")[1]; // Remove data:...;base64, prefix

        await uploadMutation.mutateAsync({
          assessmentId,
          projectId,
          fileName: selectedFile.name,
          fileData: base64,
          mimeType: selectedFile.type,
          description: description || undefined,
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        uploadInProgress.current = false;
        if (keepAliveInterval.current) {
          clearInterval(keepAliveInterval.current);
          keepAliveInterval.current = null;
        }
        releaseWebLock();
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Upload error:", error);
      uploadInProgress.current = false;
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
        keepAliveInterval.current = null;
      }
      releaseWebLock();
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag and drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">
              Drag and drop your document here
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse (PDF, Word)
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              id="file-upload"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <File className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {/* Description field */}
      {selectedFile && (
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Add notes about this document..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Upload button */}
      {selectedFile && (
        <div className="space-y-2">
          <Button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
                {tabHidden && (
                  <span className="ml-2 flex items-center gap-1 text-xs">
                    <EyeOff className="h-3 w-3" />
                    (Background)
                  </span>
                )}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
          {uploadMutation.isPending && (
            <p className="text-xs text-muted-foreground text-center">
              ✅ Safe to switch tabs - upload will continue in the background.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
