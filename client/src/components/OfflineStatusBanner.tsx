/**
 * Offline Status Banner
 * 
 * Persistent banner showing offline/online status and sync progress.
 * Displays at the top of the screen when offline or syncing.
 */

import { useOfflineSync, formatTimeAgo } from "@/hooks/useOfflineSync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { formatBytes } from "@/lib/offlineStorage";

export function OfflineStatusBanner() {
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

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if online, not syncing, and no pending items
  if (isOnline && !isSyncing && pendingCount === 0 && !isDismissed) {
    return null;
  }

  // Show minimal banner when dismissed
  if (isDismissed && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">
              {pendingCount} items pending sync
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(false)}
            className="text-white hover:bg-white/20"
          >
            Show
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        {/* Main Status Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            {!isOnline ? (
              <WifiOff className="h-5 w-5 text-white animate-pulse" />
            ) : isSyncing ? (
              <RefreshCw className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Wifi className="h-5 w-5 text-white" />
            )}

            {/* Status Text */}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                {!isOnline
                  ? "You are offline"
                  : isSyncing
                  ? "Syncing..."
                  : "Online"}
              </span>
              {pendingCount > 0 && (
                <span className="text-xs text-white/90">
                  {pendingCount} item{pendingCount !== 1 ? "s" : ""} pending sync
                </span>
              )}
            </div>

            {/* Pending Count Badge */}
            {pendingCount > 0 && !isSyncing && (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {pendingCount}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Sync Button */}
            {isOnline && !isSyncing && pendingCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={startSync}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            )}

            {/* Stop Sync Button */}
            {isSyncing && (
              <Button
                size="sm"
                variant="secondary"
                onClick={stopSync}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                Stop
              </Button>
            )}

            {/* Expand/Collapse Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-white/20"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Dismiss Button */}
            {!isSyncing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsDismissed(true)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isSyncing && progress && (
          <div className="mt-3">
            <Progress value={progress.percentage} className="h-2 bg-white/20" />
            <div className="flex justify-between mt-1 text-xs text-white/90">
              <span>
                {progress.completed} of {progress.total} synced
              </span>
              <span>{progress.percentage}%</span>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Assessments */}
              {stats && stats.assessments.total > 0 && (
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs font-semibold text-white/90 mb-2">
                    Assessments
                  </div>
                  <div className="space-y-1 text-xs text-white/80">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{stats.assessments.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Synced:</span>
                      <span className="font-medium">{stats.assessments.synced}</span>
                    </div>
                    {stats.assessments.failed > 0 && (
                      <div className="flex justify-between text-red-200">
                        <span>Failed:</span>
                        <span className="font-medium">{stats.assessments.failed}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Photos */}
              {stats && stats.photos.total > 0 && (
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs font-semibold text-white/90 mb-2">
                    Photos
                  </div>
                  <div className="space-y-1 text-xs text-white/80">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{stats.photos.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Synced:</span>
                      <span className="font-medium">{stats.photos.synced}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="font-medium">{formatBytes(stats.photos.totalSize)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Sync */}
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs font-semibold text-white/90 mb-2">
                  Last Sync
                </div>
                <div className="space-y-1 text-xs text-white/80">
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-medium">{formatTimeAgo(lastSyncTime)}</span>
                  </div>
                  {lastSyncResult && (
                    <>
                      <div className="flex justify-between">
                        <span>Synced:</span>
                        <span className="font-medium text-green-200">
                          {lastSyncResult.synced}
                        </span>
                      </div>
                      {lastSyncResult.failed > 0 && (
                        <div className="flex justify-between">
                          <span>Failed:</span>
                          <span className="font-medium text-red-200">
                            {lastSyncResult.failed}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sync Result Message */}
            {lastSyncResult && lastSyncResult.errors.length > 0 && (
              <div className="mt-3 bg-red-500/20 border border-red-300/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-200 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-red-100 mb-1">
                      Sync Errors
                    </div>
                    <div className="space-y-1">
                      {lastSyncResult.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="text-xs text-red-200">
                          {error.error}
                        </div>
                      ))}
                      {lastSyncResult.errors.length > 3 && (
                        <div className="text-xs text-red-200">
                          +{lastSyncResult.errors.length - 3} more errors
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
