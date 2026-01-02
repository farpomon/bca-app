import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Activity, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  HardDrive,
  Cpu,
  MemoryStick
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MemoryAlertCardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
  onAlertChange?: (level: 'ok' | 'warning' | 'critical') => void;
}

export function MemoryAlertCard({ 
  className, 
  autoRefresh = true, 
  refreshInterval = 30,
  onAlertChange 
}: MemoryAlertCardProps) {
  const [lastAlertLevel, setLastAlertLevel] = useState<'ok' | 'warning' | 'critical'>('ok');
  
  const { 
    data: memoryHealth, 
    isLoading, 
    error, 
    refetch 
  } = trpc.admin.getMemoryHealth.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    refetchOnWindowFocus: true,
  });

  // Notify on alert level changes
  useEffect(() => {
    if (memoryHealth?.alert?.level && memoryHealth.alert.level !== lastAlertLevel) {
      setLastAlertLevel(memoryHealth.alert.level);
      onAlertChange?.(memoryHealth.alert.level);
      
      // Show toast for warning/critical
      if (memoryHealth.alert.level === 'critical') {
        toast.error("Critical Memory Alert", {
          description: memoryHealth.alert.message,
          duration: 10000,
        });
      } else if (memoryHealth.alert.level === 'warning') {
        toast.warning("Memory Warning", {
          description: memoryHealth.alert.message,
          duration: 5000,
        });
      }
    }
  }, [memoryHealth?.alert?.level, lastAlertLevel, onAlertChange]);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 85) return 'bg-red-500';
    if (percent >= 75) return 'bg-amber-500';
    if (percent >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MemoryStick className="h-5 w-5" />
            Memory Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-red-500/20", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            Memory Health Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to fetch memory statistics: {error.message}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!memoryHealth) return null;

  const usagePercent = memoryHealth.heap.usagePercent;

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MemoryStick className="h-5 w-5" />
            Memory Health
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getBadgeVariant(memoryHealth.alert.level)}>
              {memoryHealth.alert.level.toUpperCase()}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <CardDescription>
          Real-time server memory monitoring
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Alert Banner */}
        {memoryHealth.alert.level !== 'ok' && (
          <Alert className={cn("border", getAlertColor(memoryHealth.alert.level))}>
            {getAlertIcon(memoryHealth.alert.level)}
            <AlertTitle className="ml-2">
              {memoryHealth.alert.level === 'critical' ? 'Critical Alert' : 'Warning'}
            </AlertTitle>
            <AlertDescription className="ml-7">
              {memoryHealth.alert.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Usage Gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Heap Usage</span>
            <span className="font-mono font-medium">
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={usagePercent} 
              className="h-3"
            />
            {/* Threshold markers */}
            <div 
              className="absolute top-0 h-3 w-px bg-amber-500/50"
              style={{ left: `${memoryHealth.alert.warningThreshold}%` }}
            />
            <div 
              className="absolute top-0 h-3 w-px bg-red-500/50"
              style={{ left: `${memoryHealth.alert.criticalThreshold}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-amber-500">{memoryHealth.alert.warningThreshold}%</span>
            <span className="text-red-500">{memoryHealth.alert.criticalThreshold}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Memory Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="h-3 w-3" />
              Heap Used
            </div>
            <p className="font-mono text-sm font-medium">
              {memoryHealth.formatted.heapUsed}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="h-3 w-3" />
              Heap Total
            </div>
            <p className="font-mono text-sm font-medium">
              {memoryHealth.formatted.heapTotal}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="h-3 w-3" />
              RSS
            </div>
            <p className="font-mono text-sm font-medium">
              {memoryHealth.formatted.rss}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              External
            </div>
            <p className="font-mono text-sm font-medium">
              {memoryHealth.formatted.external}
            </p>
          </div>
        </div>

        {/* Heap Limit */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Heap Limit</span>
            <span className="font-mono font-medium">
              {memoryHealth.formatted.heapLimit}
            </span>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        {autoRefresh && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Activity className="h-3 w-3 animate-pulse" />
            Auto-refreshing every {refreshInterval}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MemoryAlertCard;
