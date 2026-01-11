import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function DataIntegrityDashboard() {
  const summaryQuery = trpc.dataIntegrity.getSummary.useQuery();

  const runAllChecksMutation = trpc.dataIntegrity.runAllChecks.useMutation({
    onSuccess: (result) => {
      toast.success(`Integrity checks completed: ${result.checksRun} checks run`);
      summaryQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Integrity checks failed: ${error.message}`);
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
      case 'info':
        return <Badge variant="default" className="bg-blue-500">Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  if (summaryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            Error loading integrity metrics: {summaryQuery.error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = summaryQuery.data;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={summary.critical > 0 ? 'border-red-500' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.critical}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className={summary.warning > 0 ? 'border-yellow-500' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.warning}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Should be reviewed soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Informational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.info}</p>
            <p className="text-xs text-muted-foreground mt-1">
              For your information
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integrity Metrics</CardTitle>
              <CardDescription>
                Latest integrity check results (updated within 24 hours)
              </CardDescription>
            </div>
            <Button
              onClick={() => runAllChecksMutation.mutate()}
              disabled={runAllChecksMutation.isPending}
            >
              {runAllChecksMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run All Checks
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summary.metrics && summary.metrics.length > 0 ? (
            <div className="space-y-3">
              {summary.metrics.map((metric: any, index: number) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 flex items-start justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {getSeverityIcon(metric.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{metric.description}</h4>
                        {getSeverityBadge(metric.severity)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {metric.recommendation}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <strong>Type:</strong> {metric.metricType?.replace(/_/g, ' ')}
                        </span>
                        {metric.metricCategory && (
                          <span>
                            <strong>Category:</strong> {metric.metricCategory}
                          </span>
                        )}
                        {metric.affectedRecordCount > 0 && (
                          <span>
                            <strong>Affected:</strong> {metric.affectedRecordCount} records
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{metric.metricValue}</div>
                    <div className="text-xs text-muted-foreground">issues</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No integrity metrics available</p>
              <p className="text-sm">Click "Run All Checks" to generate metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
