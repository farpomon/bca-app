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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function AuditLogsTable() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Build filters
  const filters: any = {
    page,
    pageSize: 50,
  };

  if (searchTerm) filters.searchTerm = searchTerm;
  if (actionFilter !== "all") filters.actionType = actionFilter;
  if (entityFilter !== "all") filters.entityType = entityFilter;
  if (statusFilter !== "all") filters.status = statusFilter;

  // Query audit logs
  const logsQuery = trpc.auditLogs.list.useQuery(filters);

  // Export mutation
  const exportMutation = trpc.auditLogs.exportCSV.useMutation({
    onSuccess: (data) => {
      // Create blob and download
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs exported successfully');
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleExport = () => {
    const exportFilters: any = {};
    if (searchTerm) exportFilters.searchTerm = searchTerm;
    if (actionFilter !== "all") exportFilters.actionType = actionFilter;
    if (entityFilter !== "all") exportFilters.entityType = entityFilter;
    if (statusFilter !== "all") exportFilters.status = statusFilter;
    
    exportMutation.mutate(exportFilters);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-blue-500',
      update: 'bg-yellow-500',
      delete: 'bg-red-500',
      import: 'bg-purple-500',
      export: 'bg-green-500',
    };
    
    return (
      <Badge variant="default" className={colors[action] || 'bg-gray-500'}>
        {action}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by entity name, user, or changes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="import">Import</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="bulk_delete">Bulk Delete</SelectItem>
            <SelectItem value="bulk_update">Bulk Update</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="assessment">Assessment</SelectItem>
            <SelectItem value="deficiency">Deficiency</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="company">Company</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {logsQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : logsQuery.isError ? (
        <div className="text-center py-8 text-destructive">
          Error loading audit logs: {logsQuery.error.message}
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data?.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logsQuery.data?.logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.userName || 'System'}</span>
                          {log.userEmail && (
                            <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.actionType)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.entityType}</span>
                          {log.entityName && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {log.entityName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[300px] block">
                          {log.changesSummary || 'No changes recorded'}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {logsQuery.data && logsQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {logsQuery.data.page} of {logsQuery.data.totalPages} 
                ({logsQuery.data.totalCount} total logs)
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
                  disabled={page >= logsQuery.data.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
