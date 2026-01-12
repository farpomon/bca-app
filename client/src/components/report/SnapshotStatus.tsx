/**
 * Snapshot Status Component
 * Displays data snapshot information and change notifications
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { DataSnapshot } from '@shared/reportTypes';
import { formatSnapshotTimestamp, getSnapshotAge } from '@/lib/reportSnapshot';

interface SnapshotStatusProps {
  snapshot: DataSnapshot | null;
  dataChanged: boolean;
  onRefresh?: () => void;
}

export function SnapshotStatus({ snapshot, dataChanged, onRefresh }: SnapshotStatusProps) {
  if (!snapshot) {
    return null;
  }

  const age = getSnapshotAge(snapshot);
  const formattedTime = formatSnapshotTimestamp(snapshot);

  return (
    <div className="space-y-2">
      {/* Snapshot Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Data as of: {formattedTime}</span>
        {age > 0 && (
          <Badge variant="outline" className="text-xs">
            {age} {age === 1 ? 'minute' : 'minutes'} ago
          </Badge>
        )}
      </div>

      {/* Data Changed Warning */}
      {dataChanged && (
        <Alert variant="default" className="border-orange-500/50 bg-orange-500/5">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Data has been updated since this preview was generated. Regenerate to see the latest data.
            </span>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 ml-4">
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Locked Confirmation */}
      {!dataChanged && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Report data locked and consistent</span>
        </div>
      )}
    </div>
  );
}

interface SnapshotInfoCardProps {
  snapshot: DataSnapshot;
}

export function SnapshotInfoCard({ snapshot }: SnapshotInfoCardProps) {
  const formattedTime = formatSnapshotTimestamp(snapshot);
  const buildingCount = snapshot.buildingData?.length || 0;
  const uniformatCount = snapshot.uniformatData?.length || 0;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        Snapshot Information
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Captured</p>
          <p className="font-medium">{formattedTime}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Buildings</p>
          <p className="font-medium">{buildingCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">UNIFORMAT Items</p>
          <p className="font-medium">{uniformatCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Portfolio FCI</p>
          <p className="font-medium">
            {snapshot.portfolioMetrics?.portfolioFCI?.toFixed(1) || 'N/A'}%
          </p>
        </div>
      </div>
    </div>
  );
}
