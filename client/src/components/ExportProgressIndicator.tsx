import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  Ban
} from 'lucide-react';
import { useExportProgress, ExportProgress } from '@/hooks/useExportProgress';
import { cn } from '@/lib/utils';

interface ExportProgressIndicatorProps {
  exportId: string | null;
  onComplete?: (result: ExportProgress['result']) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function ExportProgressIndicator({
  exportId,
  onComplete,
  onError,
  onCancel,
  className,
}: ExportProgressIndicatorProps) {
  const { progress, isConnected, subscribe, unsubscribe, cancel } = useExportProgress({
    onComplete,
    onError,
  });
  
  useEffect(() => {
    if (exportId) {
      subscribe(exportId);
    } else {
      unsubscribe();
    }
    
    return () => {
      unsubscribe();
    };
  }, [exportId, subscribe, unsubscribe]);
  
  const handleCancel = async () => {
    const success = await cancel();
    if (success) {
      onCancel?.();
    }
  };
  
  const handleDownload = () => {
    if (progress?.result?.url) {
      window.open(progress.result.url, '_blank');
    }
  };
  
  if (!exportId || !progress) {
    return null;
  }
  
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'pending':
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <Ban className="h-5 w-5 text-yellow-500" />;
    }
  };
  
  const getStatusText = () => {
    switch (progress.status) {
      case 'pending':
        return 'Preparing export...';
      case 'processing':
        return progress.currentItemName 
          ? `Processing: ${progress.currentItemName}`
          : `Processing item ${progress.currentItem} of ${progress.totalItems}`;
      case 'complete':
        return 'Export complete!';
      case 'error':
        return progress.error || 'Export failed';
      case 'cancelled':
        return 'Export cancelled';
    }
  };
  
  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };
  
  const isActive = progress.status === 'pending' || progress.status === 'processing';
  
  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Export Progress</span>
          </div>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 px-2 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getStatusText()}</p>
            {progress.message && (
              <p className="text-xs text-muted-foreground truncate">
                {progress.message}
              </p>
            )}
          </div>
        </div>
        
        {isActive && (
          <>
            <Progress value={progress.progress} className="h-2" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.progress}%</span>
              <span>
                {progress.currentItem}/{progress.totalItems} items
              </span>
              <span>{formatDuration(progress.startedAt)}</span>
            </div>
          </>
        )}
        
        {progress.status === 'complete' && progress.result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progress.result.filename && (
                  <span className="font-medium">{progress.result.filename}</span>
                )}
                {progress.result.size && (
                  <span className="ml-2">({formatFileSize(progress.result.size)})</span>
                )}
              </span>
              <span>
                Completed in {formatDuration(progress.startedAt, progress.completedAt)}
              </span>
            </div>
            
            {progress.result.url && (
              <Button 
                variant="default" 
                size="sm" 
                className="w-full"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Export
              </Button>
            )}
          </div>
        )}
        
        {progress.status === 'error' && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {progress.error || 'An error occurred during export'}
          </div>
        )}
        
        {!isConnected && isActive && (
          <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Reconnecting to server...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
