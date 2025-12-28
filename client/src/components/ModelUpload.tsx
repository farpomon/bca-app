import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPPORTED_FORMATS = [
  { value: 'rvt', label: 'Revit (.rvt)', category: 'BIM' },
  { value: 'rfa', label: 'Revit Family (.rfa)', category: 'BIM' },
  { value: 'ifc', label: 'IFC (.ifc)', category: 'BIM' },
  { value: 'dwg', label: 'AutoCAD (.dwg)', category: 'CAD' },
  { value: 'dxf', label: 'DXF (.dxf)', category: 'CAD' },
  { value: 'nwd', label: 'Navisworks (.nwd)', category: 'BIM' },
  { value: 'nwc', label: 'Navisworks Cache (.nwc)', category: 'BIM' },
  { value: 'skp', label: 'SketchUp (.skp)', category: '3D' },
  { value: 'fbx', label: 'FBX (.fbx)', category: '3D' },
  { value: 'obj', label: 'OBJ (.obj)', category: '3D' },
  { value: 'glb', label: 'glTF Binary (.glb)', category: '3D' },
  { value: 'gltf', label: 'glTF (.gltf)', category: '3D' },
] as const;

type SupportedFormat = typeof SUPPORTED_FORMATS[number]['value'];

interface ModelUploadProps {
  projectId: number;
  onUploadComplete?: (modelId: number) => void;
  trigger?: React.ReactNode;
}

interface UploadState {
  status: 'idle' | 'reading' | 'uploading' | 'translating' | 'complete' | 'error';
  progress: number;
  message: string;
  modelId?: number;
  apsUrn?: string;
}

export function ModelUpload({ projectId, onUploadComplete, trigger }: ModelUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<SupportedFormat | ''>('');
  const [uploadToAps, setUploadToAps] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const utils = trpc.useUtils();

  const uploadMutation = trpc.models.upload.useMutation({
    onSuccess: (data) => {
      if (data.apsUrn && data.apsStatus === 'in_progress') {
        setUploadState({
          status: 'translating',
          progress: 0,
          message: 'Model uploaded. Translation in progress...',
          apsUrn: data.apsUrn,
        });
      } else {
        setUploadState({
          status: 'complete',
          progress: 100,
          message: 'Model uploaded successfully!',
        });
        handleComplete();
      }
    },
    onError: (error) => {
      setUploadState({
        status: 'error',
        progress: 0,
        message: error.message || 'Upload failed',
      });
    },
  });

  const checkStatusMutation = trpc.models.checkTranslationStatus.useMutation();

  // Poll for translation status
  useEffect(() => {
    if (uploadState.status === 'translating' && uploadState.modelId) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const status = await checkStatusMutation.mutateAsync({ id: uploadState.modelId! });
          
          setUploadState(prev => ({
            ...prev,
            progress: status.progress || prev.progress,
            message: status.message || prev.message,
          }));

          if (status.status === 'success') {
            clearInterval(pollingIntervalRef.current!);
            setUploadState({
              status: 'complete',
              progress: 100,
              message: 'Model ready for viewing!',
              modelId: uploadState.modelId,
              apsUrn: uploadState.apsUrn,
            });
            handleComplete();
          } else if (status.status === 'failed' || status.status === 'timeout') {
            clearInterval(pollingIntervalRef.current!);
            setUploadState({
              status: 'error',
              progress: 0,
              message: status.message || 'Translation failed',
              modelId: uploadState.modelId,
            });
          }
        } catch (error) {
          console.error('Failed to check translation status:', error);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [uploadState.status, uploadState.modelId]);

  const handleComplete = useCallback(() => {
    utils.models.list.invalidate({ projectId });
    utils.models.getActive.invalidate({ projectId });
    toast.success('Model uploaded successfully');
    if (uploadState.modelId) {
      onUploadComplete?.(uploadState.modelId);
    }
    setTimeout(() => {
      resetForm();
      setOpen(false);
    }, 1500);
  }, [projectId, uploadState.modelId, onUploadComplete, utils]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (500MB max)
    if (selectedFile.size > 500 * 1024 * 1024) {
      toast.error('File size exceeds 500MB limit');
      return;
    }

    // Detect format from extension
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    const detectedFormat = SUPPORTED_FORMATS.find(f => f.value === extension);
    
    if (!detectedFormat) {
      toast.error(`Unsupported file format: .${extension}`);
      return;
    }

    setFile(selectedFile);
    setFormat(detectedFormat.value);
    setName(selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove extension
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !format || !name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploadState({
      status: 'reading',
      progress: 10,
      message: 'Reading file...',
    });

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 30);
          setUploadState(prev => ({
            ...prev,
            progress: 10 + progress,
          }));
        }
      };

      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        setUploadState({
          status: 'uploading',
          progress: 50,
          message: 'Uploading to server...',
        });

        uploadMutation.mutate({
          projectId,
          name,
          description: description || undefined,
          fileData: base64,
          format: format as SupportedFormat,
          uploadToAps,
        });
      };

      reader.onerror = () => {
        setUploadState({
          status: 'error',
          progress: 0,
          message: 'Failed to read file',
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }, [file, format, name, description, projectId, uploadToAps, uploadMutation]);

  const resetForm = useCallback(() => {
    setFile(null);
    setName('');
    setDescription('');
    setFormat('');
    setUploadToAps(true);
    setUploadState({ status: 'idle', progress: 0, message: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const isUploading = ['reading', 'uploading', 'translating'].includes(uploadState.status);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload 3D Model
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Upload 3D Model
          </DialogTitle>
          <DialogDescription>
            Upload a BIM or 3D model file for viewing and annotation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Drop Zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400',
              isUploading && 'pointer-events-none opacity-50'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={SUPPORTED_FORMATS.map(f => `.${f.value}`).join(',')}
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Drop file here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Supports RVT, IFC, DWG, NWD, SKP, FBX, OBJ, and more
                </p>
              </div>
            )}
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Model Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter model name"
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              disabled={isUploading}
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>File Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as SupportedFormat)}
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* APS Upload Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable 3D Viewer</Label>
              <p className="text-sm text-muted-foreground">
                Process for interactive 3D viewing (recommended)
              </p>
            </div>
            <Switch
              checked={uploadToAps}
              onCheckedChange={setUploadToAps}
              disabled={isUploading}
            />
          </div>

          {/* Upload Progress */}
          {uploadState.status !== 'idle' && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {uploadState.status === 'complete' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : uploadState.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                <span className="text-sm font-medium">{uploadState.message}</span>
              </div>
              <Progress value={uploadState.progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setOpen(false);
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
          {uploadState.status === 'error' ? (
            <Button onClick={resetForm}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={!file || !name || !format || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadState.status === 'translating' ? 'Processing...' : 'Uploading...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Model
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ModelUpload;
