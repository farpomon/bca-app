import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Archive,
  Pause,
  Play
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportProgress {
  exportId: string;
  status: 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';
  progress: number;
  currentItem: number;
  totalItems: number;
  currentItemName?: string;
  message?: string;
  result?: {
    url?: string;
    filename?: string;
    size?: number;
  };
  error?: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface BulkExportProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectIds: number[];
  includePhotos?: boolean;
  onComplete?: (result: { url: string; filename: string; reportCount: number }) => void;
}

export function BulkExportProgress({
  open,
  onOpenChange,
  projectIds,
  includePhotos = true,
  onComplete,
}: BulkExportProgressProps) {
  const [exportId, setExportId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const initBulkExportMutation = trpc.reports.initBulkExport.useMutation();
  const executeBulkExportMutation = trpc.reports.executeBulkExport.useMutation();

  // Cleanup SSE connection
  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Connect to SSE stream
  const connectSSE = useCallback((id: string) => {
    closeSSE();
    
    const eventSource = new EventSource(`/api/export/progress/${id}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setIsConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ExportProgress;
        setProgress(data);
        
        if (data.status === 'complete' && data.result?.url) {
          onComplete?.({
            url: data.result.url,
            filename: data.result.filename || 'bulk-export.zip',
            reportCount: data.totalItems,
          });
        }
      } catch (error) {
        console.error('[BulkExport] Failed to parse SSE data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('[BulkExport] SSE error:', error);
      setIsConnected(false);
      // Don't close immediately - EventSource will auto-reconnect
    };
    
    return eventSource;
  }, [closeSSE, onComplete]);

  // Start export process
  const startExport = useCallback(async () => {
    try {
      // Initialize export session
      const initResult = await initBulkExportMutation.mutateAsync({
        projectIds,
        includePhotos,
      });
      
      setExportId(initResult.exportId);
      
      // Connect to SSE for progress updates
      connectSSE(initResult.exportId);
      
      // Execute the export (this runs in background)
      executeBulkExportMutation.mutate({
        exportId: initResult.exportId,
        projectIds: initResult.projectIds,
        includePhotos,
      });
      
    } catch (error: any) {
      console.error('[BulkExport] Failed to start export:', error);
      toast.error("Failed to start export", {
        description: error.message,
      });
    }
  }, [projectIds, includePhotos, initBulkExportMutation, executeBulkExportMutation, connectSSE]);

  // Cancel export
  const cancelExport = useCallback(async () => {
    if (!exportId) return;
    
    try {
      await fetch(`/api/export/progress/${exportId}/cancel`, {
        method: 'POST',
      });
      closeSSE();
      toast.info("Export cancelled");
    } catch (error) {
      console.error('[BulkExport] Failed to cancel export:', error);
    }
  }, [exportId, closeSSE]);

  // Start export when dialog opens
  useEffect(() => {
    if (open && projectIds.length > 0 && !exportId) {
      startExport();
    }
    
    return () => {
      if (!open) {
        closeSSE();
        setExportId(null);
        setProgress(null);
      }
    };
  }, [open, projectIds.length, exportId, startExport, closeSSE]);

  // Handle dialog close
  const handleClose = () => {
    if (progress?.status === 'processing') {
      // Confirm before closing during export
      if (confirm("Export is in progress. Are you sure you want to cancel?")) {
        cancelExport();
        onOpenChange(false);
      }
    } else {
      closeSSE();
      setExportId(null);
      setProgress(null);
      onOpenChange(false);
    }
  };

  const getStatusIcon = () => {
    switch (progress?.status) {
      case 'complete':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'cancelled':
        return <X className="h-6 w-6 text-amber-500" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    }
  };

  const getStatusBadge = () => {
    switch (progress?.status) {
      case 'complete':
        return <Badge className="bg-green-500">Complete</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (startMs: number, endMs?: number) => {
    const duration = (endMs || Date.now()) - startMs;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Bulk PDF Export
          </DialogTitle>
          <DialogDescription>
            Generating PDF reports for {projectIds.length} project{projectIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-medium">
                  {progress?.status === 'complete' ? 'Export Complete' :
                   progress?.status === 'error' ? 'Export Failed' :
                   progress?.status === 'cancelled' ? 'Export Cancelled' :
                   'Generating Reports...'}
                </p>
                {progress?.startedAt && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {formatDuration(progress.startedAt, progress.completedAt)}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Progress Bar */}
          {progress && progress.status !== 'complete' && progress.status !== 'error' && (
            <div className="space-y-2">
              <Progress value={progress.progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.currentItem} / {progress.totalItems} reports</span>
                <span>{progress.progress}%</span>
              </div>
            </div>
          )}

          {/* Current Item */}
          {progress?.currentItemName && progress.status === 'processing' && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{progress.currentItemName}</p>
                <p className="text-xs text-muted-foreground">{progress.message}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {progress?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{progress.error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {progress?.status === 'complete' && progress.result && (
            <div className="space-y-3">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Archive className="h-8 w-8 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{progress.result.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatSize(progress.result.size)} • {progress.totalItems} report{progress.totalItems !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => {
                  if (progress.result?.url) {
                    window.open(progress.result.url, '_blank');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download ZIP
              </Button>
            </div>
          )}

          {/* Connection Status */}
          {progress?.status === 'processing' && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-amber-500"
              )} />
              {isConnected ? "Live updates connected" : "Reconnecting..."}
            </div>
          )}
        </div>

        <DialogFooter>
          {progress?.status === 'processing' ? (
            <Button variant="outline" onClick={cancelExport}>
              <X className="h-4 w-4 mr-2" />
              Cancel Export
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkExportProgress;
