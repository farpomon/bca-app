import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Trash2, WifiOff, Wifi } from "lucide-react";
import { useOfflineRecordingQueue } from "@/hooks/useOfflineRecordingQueue";
import { formatDistanceToNow } from "date-fns";

export function OfflineQueueWidget() {
  const [showQueue, setShowQueue] = useState(false);
  const { 
    isOnline, 
    queuedRecordings, 
    isProcessingQueue, 
    stats, 
    retryFailed, 
    clearQueue 
  } = useOfflineRecordingQueue();

  const hasPendingRecordings = stats.pending > 0 || stats.failed > 0;

  return (
    <>
      {/* Badge Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowQueue(true)}
        className="relative gap-2"
        title={`${stats.pending} pending, ${stats.failed} failed`}
      >
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-amber-600" />
        )}
        {hasPendingRecordings && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {stats.pending + stats.failed}
          </Badge>
        )}
      </Button>

      {/* Queue Dialog */}
      <Dialog open={showQueue} onOpenChange={setShowQueue}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Offline Recording Queue
              {isProcessingQueue && <Loader2 className="w-4 h-4 animate-spin" />}
            </DialogTitle>
            <DialogDescription>
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-green-600">
                  <Wifi className="w-4 h-4" />
                  Online - recordings will upload automatically
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <WifiOff className="w-4 h-4" />
                  Offline - recordings will upload when connection returns
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Actions */}
          {hasPendingRecordings && (
            <div className="flex gap-2">
              {stats.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryFailed}
                  disabled={!isOnline || isProcessingQueue}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Failed
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearQueue}
                disabled={isProcessingQueue}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Clear Queue
              </Button>
            </div>
          )}

          {/* Recording List */}
          <ScrollArea className="h-[400px] pr-4">
            {queuedRecordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
                <p className="text-lg font-medium">No queued recordings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All recordings have been uploaded successfully
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queuedRecordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {recording.status === "pending" && (
                        <Clock className="w-5 h-5 text-amber-600" />
                      )}
                      {recording.status === "uploading" && (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                      {recording.status === "failed" && (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    {/* Recording Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            Recording {recording.id.split("_")[1]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {recording.context || "No context"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            recording.status === "pending"
                              ? "secondary"
                              : recording.status === "uploading"
                              ? "default"
                              : "destructive"
                          }
                          className="flex-shrink-0"
                        >
                          {recording.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(recording.timestamp, { addSuffix: true })}
                        </span>
                        {recording.retryCount > 0 && (
                          <span className="text-amber-600">
                            Retried {recording.retryCount}x
                          </span>
                        )}
                      </div>

                      {recording.error && (
                        <p className="text-xs text-red-600 mt-1 line-clamp-2">
                          Error: {recording.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
