/**
 * Offline Status Panel
 * 
 * Comprehensive UI for offline status, sync progress, and storage management.
 * Shows network status, pending items, sync progress, and storage usage.
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Database,
  Image,
  FileText,
  Settings,
} from "lucide-react";
import { useOfflineSync, formatTimeAgo } from "@/hooks/useOfflineSync";
import { useStorageManager, formatBytes, formatPercentage, getUsageBarColor } from "@/hooks/useStorageManager";
import { cn } from "@/lib/utils";

// ============================================================================
// Main Component
// ============================================================================

export function OfflineStatusPanel() {
  const {
    isOnline,
    isSyncing,
    progress,
    lastSyncResult,
    lastSyncTime,
    stats,
    pendingCount,
    startSync,
    stopSync,
  } = useOfflineSync();

  const {
    usage,
    stats: storageStats,
    isCleaningUp,
    warnings,
    runCleanup,
    clearSyncedData,
    clearAllData,
    downloadExport,
    limits,
    dismissWarning,
  } = useStorageManager();

  const [activeTab, setActiveTab] = useState("status");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative gap-2",
            !isOnline && "text-yellow-500"
          )}
        >
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? "Online" : "Offline"}
          </span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
          {isSyncing && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-5 w-5 text-green-500" />
            ) : (
              <CloudOff className="h-5 w-5 text-yellow-500" />
            )}
            Offline Status
          </SheetTitle>
          <SheetDescription>
            Manage offline data, sync status, and storage
          </SheetDescription>
        </SheetHeader>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            {warnings.map((warning) => (
              <div
                key={warning.id}
                className={cn(
                  "flex items-start gap-2 p-3 rounded-lg text-sm",
                  warning.severity === "error" && "bg-red-500/10 text-red-500",
                  warning.severity === "warning" && "bg-yellow-500/10 text-yellow-500",
                  warning.severity === "info" && "bg-blue-500/10 text-blue-500"
                )}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{warning.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => dismissWarning(warning.id)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4 mt-4">
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        isOnline ? "bg-green-500" : "bg-yellow-500"
                      )}
                    />
                    <span>{isOnline ? "Connected" : "Offline"}</span>
                  </div>
                  {lastSyncTime && (
                    <span className="text-sm text-muted-foreground">
                      Last sync: {formatTimeAgo(lastSyncTime)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sync Progress */}
            {isSyncing && progress && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={progress.percentage} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {progress.completed} / {progress.total} items
                    </span>
                    <span>{progress.percentage}%</span>
                  </div>
                  {progress.current && (
                    <p className="text-xs text-muted-foreground truncate">
                      Syncing: {progress.current}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pending Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">
                        {stats?.assessments.pending || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Assessments</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">
                        {stats?.photos.pending || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Photos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">
                        {stats?.deficiencies.pending || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Deficiencies</p>
                  </div>
                </div>

                {/* Sync Actions */}
                <div className="flex gap-2 mt-4">
                  {isSyncing ? (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={stopSync}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Stop Sync
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      onClick={startSync}
                      disabled={!isOnline || pendingCount === 0}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Last Sync Result */}
            {lastSyncResult && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {lastSyncResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Last Sync Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Synced:</span>{" "}
                      <span className="font-medium text-green-500">
                        {lastSyncResult.synced}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed:</span>{" "}
                      <span className="font-medium text-red-500">
                        {lastSyncResult.failed}
                      </span>
                    </div>
                  </div>
                  {lastSyncResult.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-500">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc list-inside">
                        {lastSyncResult.errors.slice(0, 3).map((err, i) => (
                          <li key={i} className="truncate">
                            {err.error}
                          </li>
                        ))}
                        {lastSyncResult.errors.length > 3 && (
                          <li>...and {lastSyncResult.errors.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage" className="space-y-4 mt-4">
            {/* Storage Usage */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {usage && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          {formatBytes(usage.totalBytes)} / {limits.MAX_TOTAL_SIZE_MB} MB
                        </span>
                        <span className={getUsageBarColor(usage.percentUsed).replace("bg-", "text-")}>
                          {formatPercentage(usage.percentUsed)}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all", getUsageBarColor(usage.percentUsed))}
                          style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-blue-500" />
                        <span className="text-muted-foreground">Assessments:</span>
                        <span>{formatBytes(usage.assessmentsBytes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-green-500" />
                        <span className="text-muted-foreground">Photos:</span>
                        <span>{formatBytes(usage.photosBytes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-yellow-500" />
                        <span className="text-muted-foreground">Deficiencies:</span>
                        <span>{formatBytes(usage.deficienciesBytes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-purple-500" />
                        <span className="text-muted-foreground">Cache:</span>
                        <span>{formatBytes(usage.cacheBytes)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Storage Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{stats?.assessments.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Assessments</p>
                    <div className="flex justify-center gap-1 mt-1 text-xs">
                      <span className="text-green-500">{stats?.assessments.synced || 0}</span>
                      <span>/</span>
                      <span className="text-yellow-500">{stats?.assessments.pending || 0}</span>
                      <span>/</span>
                      <span className="text-red-500">{stats?.assessments.failed || 0}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.photos.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Photos</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatBytes(stats?.photos.totalSize || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.deficiencies.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Deficiencies</p>
                    <div className="flex justify-center gap-1 mt-1 text-xs">
                      <span className="text-green-500">{stats?.deficiencies.synced || 0}</span>
                      <span>/</span>
                      <span className="text-yellow-500">{stats?.deficiencies.pending || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Storage Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={runCleanup}
                  disabled={isCleaningUp}
                >
                  {isCleaningUp ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Clean Up Old Data
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={clearSyncedData}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Clear Synced Data Only
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={downloadExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Backup
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Offline Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Offline Data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all offline data including pending
                        assessments, photos, and deficiencies that haven't been synced.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearAllData}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Storage Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Total Storage</span>
                  <span>{limits.MAX_TOTAL_SIZE_MB} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Photo Size</span>
                  <span>{limits.MAX_PHOTO_SIZE_MB} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Photos</span>
                  <span>{limits.MAX_PHOTOS_COUNT}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Photo Cache TTL</span>
                  <span>{limits.PHOTO_CACHE_TTL_DAYS} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Cache TTL</span>
                  <span>{limits.PROJECT_CACHE_TTL_HOURS} hours</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Sync Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {storageStats?.oldestPendingItem && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Oldest Pending</span>
                    <span>{formatTimeAgo(storageStats.oldestPendingItem.getTime())}</span>
                  </div>
                )}
                {storageStats?.averageSyncTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Sync Time</span>
                    <span>{Math.round(storageStats.averageSyncTime / 1000)}s</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sync Queue</span>
                  <span>
                    {stats?.syncQueue.pending || 0} pending,{" "}
                    {stats?.syncQueue.failed || 0} failed
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Compact Offline Indicator
// ============================================================================

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg",
        isOnline ? "bg-blue-500 text-white" : "bg-yellow-500 text-black"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Syncing...</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4" />
          <span className="text-sm font-medium">{pendingCount} pending</span>
        </>
      )}
    </div>
  );
}

export default OfflineStatusPanel;
