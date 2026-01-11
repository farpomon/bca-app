import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CleanupReportsTable() {
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const reportsQuery = trpc.cleanupJobs.listReports.useQuery({
    page,
    pageSize: 20,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      case 'running':
        return <Badge variant="outline">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getModeBadge = (mode: string) => {
    return mode === 'auto_fix' ? (
      <Badge variant="default" className="bg-purple-500">Auto-Fix</Badge>
    ) : (
      <Badge variant="outline">Read-Only</Badge>
    );
  };

  const handleViewDetails = (report: any) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      {reportsQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : reportsQuery.isError ? (
        <div className="text-center py-8 text-destructive">
          Error loading cleanup reports: {reportsQuery.error.message}
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Issues Found</TableHead>
                  <TableHead>Actions Taken</TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsQuery.data?.reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No cleanup reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reportsQuery.data?.reports.map((report: any) => (
                    <TableRow key={report.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(report.runTimestamp), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>{getModeBadge(report.mode)}</TableCell>
                      <TableCell>{report.duration ? `${report.duration}s` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {report.criticalIssuesCount > 0 && (
                            <span className="text-xs text-red-600 font-medium">
                              {report.criticalIssuesCount} critical
                            </span>
                          )}
                          {report.warningIssuesCount > 0 && (
                            <span className="text-xs text-yellow-600">
                              {report.warningIssuesCount} warnings
                            </span>
                          )}
                          {report.infoIssuesCount > 0 && (
                            <span className="text-xs text-blue-600">
                              {report.infoIssuesCount} info
                            </span>
                          )}
                          {report.criticalIssuesCount === 0 && 
                           report.warningIssuesCount === 0 && 
                           report.infoIssuesCount === 0 && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.mode === 'auto_fix' ? (
                          <div className="text-xs">
                            <div>{report.recordsFixed} fixed</div>
                            <div>{report.recordsDeleted} deleted</div>
                            <div>{report.recordsArchived} archived</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.notificationSent ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {reportsQuery.data && reportsQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {reportsQuery.data.page} of {reportsQuery.data.totalPages}
                ({reportsQuery.data.totalCount} total reports)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= reportsQuery.data.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cleanup Report Details</DialogTitle>
            <DialogDescription>
              {selectedReport && format(new Date(selectedReport.runTimestamp), 'MMMM dd, yyyy HH:mm')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Mode</h4>
                  {getModeBadge(selectedReport.mode)}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Duration</h4>
                  <p>{selectedReport.duration ? `${selectedReport.duration} seconds` : 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Notification</h4>
                  <p>{selectedReport.notificationSent ? 'Sent' : 'Not sent'}</p>
                </div>
              </div>

              {/* Issue Counts */}
              <div>
                <h4 className="font-semibold mb-2">Issues Found</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded p-3">
                    <div className="text-2xl font-bold text-red-600">{selectedReport.criticalIssuesCount}</div>
                    <div className="text-xs text-muted-foreground">Critical</div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-2xl font-bold text-yellow-600">{selectedReport.warningIssuesCount}</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-2xl font-bold text-blue-600">{selectedReport.infoIssuesCount}</div>
                    <div className="text-xs text-muted-foreground">Info</div>
                  </div>
                </div>
              </div>

              {/* Detailed Counts */}
              <div>
                <h4 className="font-semibold mb-2">Detailed Breakdown</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Orphaned Records: <strong>{selectedReport.orphanedRecordsCount}</strong></div>
                  <div>Duplicate Records: <strong>{selectedReport.duplicateRecordsCount}</strong></div>
                  <div>Stale Computations: <strong>{selectedReport.staleComputationsCount}</strong></div>
                  <div>Invalid Weights: <strong>{selectedReport.invalidWeightsCount}</strong></div>
                  <div>Broken References: <strong>{selectedReport.brokenReferencesCount}</strong></div>
                  <div>Missing Dependencies: <strong>{selectedReport.missingDependenciesCount}</strong></div>
                </div>
              </div>

              {/* Actions Taken (if auto-fix) */}
              {selectedReport.mode === 'auto_fix' && (
                <div>
                  <h4 className="font-semibold mb-2">Actions Taken</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Records Fixed: <strong>{selectedReport.recordsFixed}</strong></div>
                    <div>Records Deleted: <strong>{selectedReport.recordsDeleted}</strong></div>
                    <div>Records Archived: <strong>{selectedReport.recordsArchived}</strong></div>
                    <div>Calculations Rerun: <strong>{selectedReport.calculationsRerun}</strong></div>
                  </div>
                </div>
              )}

              {/* Error Log */}
              {selectedReport.errorLog && (
                <div>
                  <h4 className="font-semibold mb-2 text-destructive">Error Log</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {selectedReport.errorLog}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
