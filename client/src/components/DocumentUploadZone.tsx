import { useState, useCallback } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface DocumentUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

/**
 * DocumentUploadZone - Drag-and-drop file upload component
 * 
 * Features:
 * - Drag and drop support
 * - File type validation
 * - File size validation
 * - Upload progress indicator
 * - Error handling
 */
export function DocumentUploadZone({
  onUpload,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png",
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
}: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`;
    }

    // Check file type
    const acceptedTypes = accept.split(",").map((t) => t.trim());
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith(".")) {
        return fileExtension === type;
      }
      return file.type.startsWith(type.replace("*", ""));
    });

    if (!isAccepted) {
      return "File type not supported";
    }

    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        const error = validateFile(file);
        if (error) {
          toast.error(error);
          return;
        }
        setSelectedFile(file);
      }
    },
    [disabled, maxSize, accept]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const error = validateFile(file);
        if (error) {
          toast.error(error);
          return;
        }
        setSelectedFile(file);
      }
    },
    [maxSize, accept]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await onUpload(selectedFile);
      toast.success("Document uploaded successfully");
      setSelectedFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label
            className={`flex flex-col items-center justify-center p-8 ${
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, Word, Excel, Images (max {(maxSize / 1024 / 1024).toFixed(0)}MB)
            </p>
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileSelect}
              disabled={disabled}
            />
          </label>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <File className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
