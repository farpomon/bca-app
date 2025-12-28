import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { ForgeViewer } from './ForgeViewer';
import { ModelUpload } from './ModelUpload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Box,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ModelViewerPanelProps {
  projectId: number;
  className?: string;
  onAnnotationCreate?: (position: { x: number; y: number; z: number }, camera: any) => void;
}

type TranslationStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'timeout' | null;

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-3 w-3" />, color: 'bg-yellow-500', label: 'Pending' },
  in_progress: { icon: <Loader2 className="h-3 w-3 animate-spin" />, color: 'bg-blue-500', label: 'Processing' },
  success: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-green-500', label: 'Ready' },
  failed: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-red-500', label: 'Failed' },
  timeout: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-orange-500', label: 'Timeout' },
};

export function ModelViewerPanel({ projectId, className, onAnnotationCreate }: ModelViewerPanelProps) {
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<any>(null);

  // Fetch models for this project
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = trpc.models.list.useQuery(
    { projectId },
    { staleTime: 30000 }
  );

  // Get active model
  const { data: activeModel } = trpc.models.getActive.useQuery(
    { projectId },
    { staleTime: 30000 }
  );

  // Check translation status mutation
  const checkStatusMutation = trpc.models.checkTranslationStatus.useMutation({
    onSuccess: () => {
      refetchModels();
    },
  });

  // Retry translation mutation
  const retryTranslationMutation = trpc.models.retryTranslation.useMutation({
    onSuccess: () => {
      toast.success('Translation restarted');
      refetchModels();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to retry translation');
    },
  });

  // Delete model mutation
  const deleteModelMutation = trpc.models.delete.useMutation({
    onSuccess: () => {
      toast.success('Model deleted');
      refetchModels();
      if (selectedModelId) {
        setSelectedModelId(null);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete model');
    },
  });

  // Get the currently selected or active model
  const currentModel = selectedModelId
    ? models?.find(m => m.id === selectedModelId)
    : activeModel || models?.[0];

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(parseInt(modelId, 10));
  }, []);

  const handleViewerReady = useCallback((v: any) => {
    setViewer(v);
  }, []);

  const handleCheckStatus = useCallback(async (modelId: number) => {
    await checkStatusMutation.mutateAsync({ id: modelId });
  }, [checkStatusMutation]);

  const handleRetryTranslation = useCallback(async (modelId: number) => {
    await retryTranslationMutation.mutateAsync({ id: modelId });
  }, [retryTranslationMutation]);

  const handleDeleteModel = useCallback(async (modelId: number) => {
    if (confirm('Are you sure you want to delete this model?')) {
      await deleteModelMutation.mutateAsync({ id: modelId });
    }
  }, [deleteModelMutation]);

  const renderStatusBadge = (status: TranslationStatus) => {
    if (!status) return null;
    const config = statusConfig[status];
    if (!config) return null;

    return (
      <Badge variant="secondary" className={cn('gap-1', config.color, 'text-white')}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  if (modelsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              3D Model Viewer
            </CardTitle>
            <CardDescription>
              View and annotate building models
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Model Selector */}
            {models && models.length > 0 && (
              <Select
                value={currentModel?.id?.toString() || ''}
                onValueChange={handleModelSelect}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{model.name}</span>
                        {model.apsTranslationStatus && (
                          <span className={cn(
                            'w-2 h-2 rounded-full',
                            statusConfig[model.apsTranslationStatus]?.color || 'bg-gray-400'
                          )} />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Upload Button */}
            <ModelUpload
              projectId={projectId}
              onUploadComplete={() => refetchModels()}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!models || models.length === 0 ? (
          // No models state
          <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-lg">
            <Box className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Models Uploaded</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Upload a 3D model (Revit, IFC, DWG, etc.) to view and annotate your building.
            </p>
            <ModelUpload
              projectId={projectId}
              onUploadComplete={() => refetchModels()}
            />
          </div>
        ) : currentModel ? (
          <div className="space-y-4">
            {/* Model Info Bar */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <span className="font-medium">{currentModel.name}</span>
                <Badge variant="outline">{currentModel.format?.toUpperCase()}</Badge>
                {renderStatusBadge(currentModel.apsTranslationStatus as TranslationStatus)}
                {currentModel.apsTranslationProgress !== null && 
                 currentModel.apsTranslationProgress !== undefined &&
                 currentModel.apsTranslationStatus === 'in_progress' && (
                  <span className="text-sm text-muted-foreground">
                    {currentModel.apsTranslationProgress}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Check Status */}
                {currentModel.apsUrn && currentModel.apsTranslationStatus !== 'success' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCheckStatus(currentModel.id)}
                        disabled={checkStatusMutation.isPending}
                      >
                        <RefreshCw className={cn(
                          'h-4 w-4',
                          checkStatusMutation.isPending && 'animate-spin'
                        )} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Check Status</TooltipContent>
                  </Tooltip>
                )}

                {/* Retry Translation */}
                {currentModel.apsTranslationStatus === 'failed' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRetryTranslation(currentModel.id)}
                        disabled={retryTranslationMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retry Translation</TooltipContent>
                  </Tooltip>
                )}

                {/* Delete */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteModel(currentModel.id)}
                      disabled={deleteModelMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete Model</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Viewer or Status Message */}
            {currentModel.apsTranslationStatus === 'success' && currentModel.apsUrn ? (
              <ForgeViewer
                urn={currentModel.apsUrn}
                className="h-[500px]"
                onViewerReady={handleViewerReady}
                showToolbar={true}
                enableMarkup={true}
              />
            ) : currentModel.apsTranslationStatus === 'in_progress' ? (
              <div className="flex flex-col items-center justify-center h-[400px] bg-muted rounded-lg">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Processing Model</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Your model is being processed for 3D viewing. This may take a few minutes
                  depending on the file size and complexity.
                </p>
                {currentModel.apsTranslationProgress !== null && (
                  <div className="mt-4 w-48">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${currentModel.apsTranslationProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-1">
                      {currentModel.apsTranslationProgress}%
                    </p>
                  </div>
                )}
              </div>
            ) : currentModel.apsTranslationStatus === 'failed' ? (
              <div className="flex flex-col items-center justify-center h-[400px] bg-red-50 rounded-lg">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Translation Failed</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  {currentModel.apsTranslationMessage || 'Failed to process the model for viewing.'}
                </p>
                <Button onClick={() => handleRetryTranslation(currentModel.id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Translation
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] bg-muted rounded-lg">
                <Clock className="h-12 w-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Pending Processing</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  This model is queued for processing. Check back shortly.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default ModelViewerPanel;
