import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, FileText, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AssetDocumentUploadProps {
  assetId: number;
  projectId: number;
  category?: 'maintenance' | 'deficiency' | 'general';
  deficiencyId?: number;
  onDocumentUploaded?: () => void;
}

const DOCUMENT_CATEGORIES = [
  { value: 'report', label: 'Report' },
  { value: 'plan', label: 'Plan' },
  { value: 'permit', label: 'Permit' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'maintenance', label: 'Maintenance Record' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
];

export default function AssetDocumentUpload({ 
  assetId, 
  projectId,
  category = 'general',
  deficiencyId,
  onDocumentUploaded 
}: AssetDocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentCategory, setDocumentCategory] = useState('report');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [tabHidden, setTabHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for background upload handling
  const uploadInProgress = useRef(false);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
  const webLockReleaseRef = useRef<(() => void) | null>(null);

  const utils = trpc.useUtils();

  // Acquire Web Lock to prevent browser from suspending the upload
  const acquireWebLock = useCallback(async (name: string) => {
    if ('locks' in navigator) {
      try {
        const lockName = `asset-doc-upload-${Date.now()}-${name.replace(/[^a-z0-9]/gi, '_')}`;
        navigator.locks.request(lockName, { mode: 'exclusive' }, async () => {
          return new Promise<void>((resolve) => {
            webLockReleaseRef.current = resolve;
          });
        }).catch(() => {
          // Lock request was aborted, which is fine
        });
      } catch (e) {
        console.warn('[AssetDocumentUpload] Web Locks API not available:', e);
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
          console.log('[AssetDocumentUpload] Tab hidden, upload continuing in background...');
        } else {
          console.log('[AssetDocumentUpload] Tab visible again');
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);
    uploadInProgress.current = true;
    setUploadProgress({ current: 0, total: selectedFiles.length });

    // Acquire Web Lock
    await acquireWebLock(`docs-${selectedFiles.length}`);
    
    // Start keep-alive ping
    keepAliveInterval.current = setInterval(() => {
      if (uploadInProgress.current) {
        console.debug(`[AssetDocumentUpload] Keep-alive: ${Math.round(performance.now() / 1000)}s`);
      }
    }, 500);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        
        // Convert file to base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64Data = fileData.split(',')[1];

        // Upload document via tRPC
        await utils.client.assetDocuments.upload.mutate({
          projectId,
          assetId,
          deficiencyId,
          fileContent: base64Data,
          fileName: file.name,
          mimeType: file.type,
          category: documentCategory,
          description: description || undefined,
        });
      }

      toast.success(`${selectedFiles.length} document(s) uploaded successfully`);
      
      // Clear form
      setSelectedFiles([]);
      setDescription('');
      setDocumentCategory('report');
      
      // Refresh documents list
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
      
      utils.assetDocuments.list.invalidate({ assetId });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    } finally {
      setIsUploading(false);
      uploadInProgress.current = false;
      setUploadProgress({ current: 0, total: 0 });
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
        keepAliveInterval.current = null;
      }
      releaseWebLock();
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="category">Document Category</Label>
          <Select value={documentCategory} onValueChange={setDocumentCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the document"
          />
        </div>

        <Button 
          onClick={() => fileInputRef.current?.click()} 
          variant="outline" 
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Select Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
        />
      </div>

      {/* Drag and Drop Zone */}
      {selectedFiles.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
        >
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Drag and drop documents here, or use the button above
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: PDF, Word, Excel, Images, Text files
          </p>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading {uploadProgress.current} of {uploadProgress.total} file(s)...
                  {tabHidden && (
                    <span className="ml-2 flex items-center gap-1 text-xs">
                      <EyeOff className="h-3 w-3" />
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedFiles.length} Document(s)
                </>
              )}
            </Button>
            {isUploading && (
              <p className="text-xs text-muted-foreground text-center">
                ✅ Safe to switch tabs - upload will continue in the background.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
