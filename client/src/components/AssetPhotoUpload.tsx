import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Loader2, Image as ImageIcon, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AssetPhotoUploadProps {
  assetId: number;
  projectId: number;
  onPhotoUploaded?: () => void;
}

export default function AssetPhotoUpload({ assetId, projectId, onPhotoUploaded }: AssetPhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Refs for background upload handling
  const uploadInProgress = useRef(false);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
  const webLockReleaseRef = useRef<(() => void) | null>(null);

  const utils = trpc.useUtils();

  // Acquire Web Lock to prevent browser from suspending the upload
  const acquireWebLock = useCallback(async (name: string) => {
    if ('locks' in navigator) {
      try {
        const lockName = `photo-upload-${Date.now()}-${name.replace(/[^a-z0-9]/gi, '_')}`;
        navigator.locks.request(lockName, { mode: 'exclusive' }, async () => {
          return new Promise<void>((resolve) => {
            webLockReleaseRef.current = resolve;
          });
        }).catch(() => {
          // Lock request was aborted, which is fine
        });
      } catch (e) {
        console.warn('[AssetPhotoUpload] Web Locks API not available:', e);
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
          console.log('[AssetPhotoUpload] Tab hidden, upload continuing in background...');
        } else {
          console.log('[AssetPhotoUpload] Tab visible again');
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

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    
    setSelectedFiles(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...files]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Remove photo
  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Wait for video to load and play
        await videoRef.current.play();
        toast.success('Camera ready');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const preview = URL.createObjectURL(file);
          
          setSelectedFiles(prev => [...prev, file]);
          setPreviews(prev => [...prev, preview]);
          stopCamera();
          toast.success('Photo captured');
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Upload photos
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select or capture photos first');
      return;
    }

    setIsUploading(true);
    uploadInProgress.current = true;
    setUploadProgress({ current: 0, total: selectedFiles.length });

    // Acquire Web Lock
    await acquireWebLock(`photos-${selectedFiles.length}`);
    
    // Start keep-alive ping
    keepAliveInterval.current = setInterval(() => {
      if (uploadInProgress.current) {
        console.debug(`[AssetPhotoUpload] Keep-alive: ${Math.round(performance.now() / 1000)}s`);
      }
    }, 500);

    try {
      // Upload each photo
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload-photo', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const { url, fileKey, mimeType, fileSize } = await response.json();

        // Convert file to base64 for tRPC upload
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const base64Data = fileData.split(',')[1];

        // Save photo to database linked to asset
        await utils.client.photos.upload.mutate({
          projectId,
          assetId,
          fileData: base64Data,
          fileName: file.name,
          mimeType: file.type,
          caption: `Asset photo - ${new Date().toLocaleDateString()}`,
        });
      }

      toast.success(`${selectedFiles.length} photo(s) uploaded successfully`);
      
      // Clear selections
      previews.forEach(preview => URL.revokeObjectURL(preview));
      setSelectedFiles([]);
      setPreviews([]);
      
      // Refresh photos list
      if (onPhotoUploaded) {
        onPhotoUploaded();
      }
      
      utils.photos.byAsset.invalidate({ assetId, projectId });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
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
      {/* Camera View */}
      {isCameraActive && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-black"
                style={{ minHeight: '300px' }}
              />
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Photo
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Controls */}
      {!isCameraActive && (
        <div className="flex gap-2">
          <Button onClick={startCamera} variant="outline" className="flex-1">
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline" 
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Drag and Drop Zone */}
      {!isCameraActive && selectedFiles.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
        >
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Drag and drop photos here, or use the buttons above
          </p>
        </div>
      )}

      {/* Photo Previews */}
      {selectedFiles.length > 0 && !isCameraActive && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Photo {index + 1}
                </div>
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
                  Uploading {uploadProgress.current} of {uploadProgress.total} photo(s)...
                  {tabHidden && (
                    <span className="ml-2 flex items-center gap-1 text-xs">
                      <EyeOff className="h-3 w-3" />
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedFiles.length} Photo(s)
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
