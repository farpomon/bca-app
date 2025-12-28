import { useEffect, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface ConversionStatusBarProps {
  modelId: number;
  apsTranslationStatus?: string | null;
  apsTranslationProgress?: number | null;
  onStatusChange?: () => void;
}

type TranslationStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'not_uploaded';

export function ConversionStatusBar({ 
  modelId, 
  apsTranslationStatus,
  apsTranslationProgress,
  onStatusChange 
}: ConversionStatusBarProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [localStatus, setLocalStatus] = useState<TranslationStatus>(
    (apsTranslationStatus as TranslationStatus) || 'not_uploaded'
  );
  const [localProgress, setLocalProgress] = useState(apsTranslationProgress || 0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const checkStatusMutation = trpc.models.checkTranslationStatus.useMutation({
    onSuccess: (data) => {
      setLocalStatus(data.status as TranslationStatus);
      setLocalProgress(data.progress || 0);
      setStatusMessage(data.message || '');
      
      // If conversion is complete or failed, stop polling and notify parent
      if (data.status === 'success') {
        setIsPolling(false);
        toast.success('Model conversion completed successfully!');
        onStatusChange?.();
      } else if (data.status === 'failed') {
        setIsPolling(false);
        toast.error(`Conversion failed: ${data.message || 'Unknown error'}`);
        onStatusChange?.();
      }
    },
    onError: (error) => {
      console.error('Failed to check translation status:', error);
      // Don't stop polling on temporary errors
    },
  });

  const retryMutation = trpc.models.retryTranslation.useMutation({
    onSuccess: () => {
      toast.success('Conversion restarted');
      setLocalStatus('in_progress');
      setLocalProgress(0);
      setIsPolling(true);
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error(`Failed to restart conversion: ${error.message}`);
    },
  });

  // Poll for status updates when conversion is in progress
  useEffect(() => {
    if (localStatus === 'in_progress' && !isPolling) {
      setIsPolling(true);
    }
  }, [localStatus, isPolling]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isPolling && localStatus === 'in_progress') {
      // Initial check
      checkStatusMutation.mutate({ id: modelId });

      // Poll every 5 seconds
      intervalId = setInterval(() => {
        checkStatusMutation.mutate({ id: modelId });
      }, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, localStatus, modelId]);

  // Update local state when props change
  useEffect(() => {
    if (apsTranslationStatus) {
      setLocalStatus(apsTranslationStatus as TranslationStatus);
    }
    if (apsTranslationProgress !== null && apsTranslationProgress !== undefined) {
      setLocalProgress(apsTranslationProgress);
    }
  }, [apsTranslationStatus, apsTranslationProgress]);

  const handleRetry = useCallback(() => {
    retryMutation.mutate({ id: modelId });
  }, [modelId, retryMutation]);

  const handleRefresh = useCallback(() => {
    checkStatusMutation.mutate({ id: modelId });
  }, [modelId, checkStatusMutation]);

  // Don't show anything if not uploaded to APS
  if (localStatus === 'not_uploaded') {
    return null;
  }

  const getStatusIcon = () => {
    switch (localStatus) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (localStatus) {
      case 'pending':
        return 'Conversion queued...';
      case 'in_progress':
        return `Converting... ${localProgress}%`;
      case 'success':
        return 'Conversion complete';
      case 'failed':
        return statusMessage || 'Conversion failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (localStatus) {
      case 'pending':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
      default:
        return 'bg-muted border-border';
    }
  };

  const getProgressColor = () => {
    switch (localStatus) {
      case 'pending':
        return '[&>[data-slot=progress-indicator]]:bg-amber-500';
      case 'in_progress':
        return '[&>[data-slot=progress-indicator]]:bg-blue-500';
      case 'success':
        return '[&>[data-slot=progress-indicator]]:bg-green-500';
      case 'failed':
        return '[&>[data-slot=progress-indicator]]:bg-red-500';
      default:
        return '';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        <div className="flex items-center gap-2">
          {localStatus === 'in_progress' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={checkStatusMutation.isPending}
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${checkStatusMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          )}
          {localStatus === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retryMutation.isPending}
              className="h-7"
            >
              {retryMutation.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {(localStatus === 'in_progress' || localStatus === 'pending') && (
        <Progress 
          value={localProgress} 
          className={`h-2 ${getProgressColor()}`}
        />
      )}
      
      {localStatus === 'success' && (
        <Progress 
          value={100} 
          className={`h-2 ${getProgressColor()}`}
        />
      )}

      {statusMessage && localStatus !== 'failed' && (
        <p className="text-xs text-muted-foreground mt-2">{statusMessage}</p>
      )}

      {localStatus === 'in_progress' && (
        <p className="text-xs text-muted-foreground mt-2">
          Conversion typically takes 1-5 minutes depending on file size and complexity.
        </p>
      )}
    </div>
  );
}
