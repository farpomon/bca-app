/**
 * Sidebar Offline Status Component
 * 
 * A compact offline status indicator designed for the dashboard sidebar.
 * Shows connection status, pending sync count, and sync progress.
 */

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Cloud,
  CloudOff,
} from "lucide-react";
import { useOfflineSync, formatTimeAgo } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

interface SidebarOfflineStatusProps {
  isCollapsed?: boolean;
}

export function SidebarOfflineStatus({ isCollapsed = false }: SidebarOfflineStatusProps) {
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

  // Collapsed view - just show icon with badge
  if (isCollapsed) {
    return (
      <div className="flex justify-center py-2">
        <div className="relative">
          {isOnline ? (
            <Wifi className={cn(
              "h-4 w-4",
              isSyncing ? "text-blue-500" : "text-green-500"
            )} />
          ) : (
            <WifiOff className="h-4 w-4 text-yellow-500" />
          )}
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
          {isSyncing && (
            <Loader2 className="absolute -bottom-1 -right-1 h-3 w-3 animate-spin text-blue-500" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/50 rounded-lg transition-colors text-sm min-h-[44px]">
            <div className="flex items-center gap-2.5 min-w-0">
              {isOnline ? (
                <div className="relative shrink-0">
                  {isSyncing ? (
                    <Cloud className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Cloud className="h-4 w-4 text-green-500" />
                  )}
                  {isSyncing && (
                    <Loader2 className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-spin text-blue-500" />
                  )}
                </div>
              ) : (
                <CloudOff className="h-4 w-4 text-yellow-500 shrink-0" />
              )}
              <span className={cn(
                "font-medium truncate",
                !isOnline && "text-yellow-600 dark:text-yellow-400"
              )}>
                {isSyncing ? "Syncing..." : isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendingCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "h-5 px-1.5 text-xs",
                    !isOnline && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}
                >
                  {pendingCount} pending
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          {/* Sync Progress */}
          {isSyncing && progress && (
            <div className="space-y-1.5">
              <Progress value={progress.percentage} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.completed}/{progress.total}</span>
                <span>{progress.percentage}%</span>
              </div>
            </div>
          )}

          {/* Pending Items Summary */}
          {pendingCount > 0 && !isSyncing && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-md py-1.5">
                <div className="text-lg font-semibold">{stats?.assessments.pending || 0}</div>
                <div className="text-[10px] text-muted-foreground">Assessments</div>
              </div>
              <div className="bg-muted/50 rounded-md py-1.5">
                <div className="text-lg font-semibold">{stats?.photos.pending || 0}</div>
                <div className="text-[10px] text-muted-foreground">Photos</div>
              </div>
              <div className="bg-muted/50 rounded-md py-1.5">
                <div className="text-lg font-semibold">{stats?.deficiencies.pending || 0}</div>
                <div className="text-[10px] text-muted-foreground">Deficiencies</div>
              </div>
            </div>
          )}

          {/* Last Sync Info */}
          {lastSyncTime && !isSyncing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {lastSyncResult?.success ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : lastSyncResult ? (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              ) : null}
              <span>Last sync: {formatTimeAgo(lastSyncTime)}</span>
            </div>
          )}

          {/* Sync Button */}
          <div className="flex gap-2">
            {isSyncing ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={stopSync}
              >
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Stop
              </Button>
            ) : (
              <Button
                variant={pendingCount > 0 ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8"
                onClick={startSync}
                disabled={!isOnline || pendingCount === 0}
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                {pendingCount > 0 ? "Sync Now" : "Synced"}
              </Button>
            )}
          </div>

          {/* Offline Warning */}
          {!isOnline && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-xs text-yellow-700 dark:text-yellow-400">
              <WifiOff className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Changes saved locally. Will sync when online.</span>
            </div>
          )}
        </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
