/**
 * Sync Queue Dialog
 * 
 * Shows all pending, failed, and synced items in the sync queue.
 * Allows users to retry failed items or clear completed ones.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAllItems,
  STORES,
  type OfflineAssessment,
  type OfflinePhoto,
  type SyncQueueItem,
  formatBytes,
} from "@/lib/offlineStorage";
import { useOfflineSync, formatTimeAgo } from "@/hooks/useOfflineSync";
import {
  FileText,
  Image,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
} from "lucide-react";

export function SyncQueueDialog() {
  const [open, setOpen] = useState(false);
  const [assessments, setAssessments] = useState<OfflineAssessment[]>([]);
  const [photos, setPhotos] = useState<OfflinePhoto[]>([]);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  
  const { startSync, isSyncing, pendingCount } = useOfflineSync();

  /**
   * Load all offline data
   */
  const loadData = async () => {
    try {
      const [assessmentData, photoData, queueData] = await Promise.all([
        getAllItems<OfflineAssessment>(STORES.ASSESSMENTS),
        getAllItems<OfflinePhoto>(STORES.PHOTOS),
        getAllItems<SyncQueueItem>(STORES.SYNC_QUEUE),
      ]);

      setAssessments(assessmentData);
      setPhotos(photoData);
      setQueueItems(queueData);
    } catch (error) {
      console.error("Failed to load sync queue data:", error);
    }
  };

  /**
   * Reload data when dialog opens
   */
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  /**
   * Reload data after sync completes
   */
  useEffect(() => {
    if (!isSyncing && open) {
      loadData();
    }
  }, [isSyncing, open]);

  const pendingAssessments = assessments.filter(a => a.syncStatus === "pending");
  const failedAssessments = assessments.filter(a => a.syncStatus === "failed");
  const syncedAssessments = assessments.filter(a => a.syncStatus === "synced");

  const pendingPhotos = photos.filter(p => p.syncStatus === "pending");
  const failedPhotos = photos.filter(p => p.syncStatus === "failed");
  const syncedPhotos = photos.filter(p => p.syncStatus === "synced");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          Sync Queue
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Sync Queue</DialogTitle>
          <DialogDescription>
            View and manage offline items waiting to sync
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Badge variant="secondary">
              {pendingAssessments.length + pendingPhotos.length} pending
            </Badge>
            {(failedAssessments.length + failedPhotos.length) > 0 && (
              <Badge variant="destructive">
                {failedAssessments.length + failedPhotos.length} failed
              </Badge>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={() => startSync()}
            disabled={isSyncing || pendingCount === 0}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="assessments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assessments">
              Assessments ({assessments.length})
            </TabsTrigger>
            <TabsTrigger value="photos">
              Photos ({photos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessments">
            <ScrollArea className="h-[400px] pr-4">
              {assessments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No offline assessments
                </div>
              ) : (
                <div className="space-y-3">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {assessment.componentName || "Unnamed Component"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {assessment.componentCode || "No code"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created {formatTimeAgo(assessment.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <SyncStatusBadge status={assessment.syncStatus} />
                          {assessment.syncError && (
                            <div className="text-xs text-destructive max-w-[200px] text-right">
                              {assessment.syncError}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="photos">
            <ScrollArea className="h-[400px] pr-4">
              {photos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No offline photos
                </div>
              ) : (
                <div className="space-y-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Image className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {photo.fileName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatBytes(photo.fileSize)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created {formatTimeAgo(photo.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <SyncStatusBadge status={photo.syncStatus} />
                          {photo.uploadProgress !== undefined && photo.uploadProgress > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {photo.uploadProgress}%
                            </div>
                          )}
                          {photo.syncError && (
                            <div className="text-xs text-destructive max-w-[200px] text-right">
                              {photo.syncError}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sync status badge component
 */
function SyncStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case "syncing":
      return (
        <Badge variant="default" className="gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Syncing
        </Badge>
      );
    case "synced":
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Synced
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
