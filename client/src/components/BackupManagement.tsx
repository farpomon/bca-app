/**
 * BackupManagement Component
 * Admin UI for managing database backups and restores
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  Calendar,
  FileJson,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    completed: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
    in_progress: { variant: "secondary", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    pending: { variant: "outline", icon: <Clock className="w-3 h-3" /> },
    failed: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  };

  const config = variants[status] || variants.pending;

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {status.replace("_", " ")}
    </Badge>
  );
}

export function BackupManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [description, setDescription] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Queries
  const backupsQuery = trpc.backup.list.useQuery({ limit: 20, offset: 0 });
  const statsQuery = trpc.backup.getStats.useQuery();

  // Mutations
  const createBackupMutation = trpc.backup.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Backup created successfully! ${data.recordCount} records backed up.`);
      setCreateDialogOpen(false);
      setDescription("");
      backupsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Backup failed: ${error.message}`);
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const getDownloadUrlMutation = trpc.backup.getDownloadUrl.useMutation({
    onSuccess: (data) => {
      // Open download in new tab
      window.open(data.url, "_blank");
      toast.success("Download started");
    },
    onError: (error) => {
      toast.error(`Download failed: ${error.message}`);
    },
  });

  const restoreBackupMutation = trpc.backup.restore.useMutation({
    onSuccess: (data) => {
      toast.success(`Restore completed! ${data.restoredRecords} records restored from ${data.restoredTables.length} tables.`);
      setRestoreDialogOpen(false);
      setRestoreFile(null);
      setClearExisting(false);
      setSelectedBackup(null);
    },
    onError: (error) => {
      toast.error(`Restore failed: ${error.message}`);
    },
    onSettled: () => {
      setIsRestoring(false);
    },
  });

  const deleteBackupMutation = trpc.backup.delete.useMutation({
    onSuccess: () => {
      toast.success("Backup deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
      backupsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleCreateBackup = () => {
    setIsCreating(true);
    createBackupMutation.mutate({ description: description || undefined });
  };

  const handleDownload = (backupId: number) => {
    getDownloadUrlMutation.mutate({ id: backupId });
  };

  const handleRestoreFromBackup = (backup: any) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const handleRestoreFromFile = async () => {
    if (!restoreFile) {
      toast.error("Please select a backup file");
      return;
    }

    setIsRestoring(true);
    try {
      const fileContent = await restoreFile.text();
      restoreBackupMutation.mutate({
        backupData: fileContent,
        options: { clearExisting },
      });
    } catch (error) {
      toast.error("Failed to read backup file");
      setIsRestoring(false);
    }
  };

  const handleRestoreFromSelected = () => {
    if (!selectedBackup) return;
    setIsRestoring(true);
    restoreBackupMutation.mutate({
      backupId: selectedBackup.id,
      options: { clearExisting },
    });
  };

  const handleDelete = (backup: any) => {
    setSelectedBackup(backup);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedBackup) {
      deleteBackupMutation.mutate({ id: selectedBackup.id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsQuery.data?.totalBackups || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsQuery.data?.completedBackups || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(statsQuery.data?.totalStorageUsed || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all backups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsQuery.data?.lastBackupDate
                ? new Date(statsQuery.data.lastBackupDate).toLocaleDateString()
                : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsQuery.data?.lastBackupStatus && (
                <StatusBadge status={statsQuery.data.lastBackupStatus} />
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Backups</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {statsQuery.data?.failedBackups || 0}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backup Management
          </CardTitle>
          <CardDescription>
            Create, download, and restore database backups. Backups include all system data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Database className="w-4 h-4" />
              Create Backup
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBackup(null);
                setRestoreDialogOpen(true);
              }}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Restore from File
            </Button>
            <Button
              variant="outline"
              onClick={() => backupsQuery.refetch()}
              disabled={backupsQuery.isFetching}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${backupsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Backups Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backupsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : backupsQuery.data?.backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No backups found. Create your first backup to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  backupsQuery.data?.backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">
                        {formatDate(backup.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{backup.backupType}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={backup.status} />
                      </TableCell>
                      <TableCell>{backup.recordCount?.toLocaleString() || "-"}</TableCell>
                      <TableCell>{backup.fileSize ? formatBytes(backup.fileSize) : "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {backup.metadata?.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {backup.status === "completed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(backup.id)}
                                title="Download backup"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRestoreFromBackup(backup)}
                                title="Restore from this backup"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(backup)}
                            title="Delete backup"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Create New Backup
            </DialogTitle>
            <DialogDescription>
              This will create a complete backup of all database tables. The backup will be stored
              securely and can be downloaded or used for restoration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter a description for this backup..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Backup includes:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>All projects and assessments</li>
                <li>Assets and deficiencies</li>
                <li>Photos and documents metadata</li>
                <li>User data and permissions</li>
                <li>Companies and access requests</li>
                <li>Maintenance records and reports</li>
                <li>All configuration data</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBackup} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Restore Backup
            </DialogTitle>
            <DialogDescription>
              {selectedBackup
                ? `Restore from backup created on ${formatDate(selectedBackup.createdAt)}`
                : "Upload a backup file to restore data"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedBackup && (
              <div className="space-y-2">
                <Label htmlFor="backupFile">Backup File</Label>
                <Input
                  id="backupFile"
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                />
                {restoreFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {restoreFile.name} ({formatBytes(restoreFile.size)})
                  </p>
                )}
              </div>
            )}

            {selectedBackup && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium">Backup Details</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    {formatDate(selectedBackup.createdAt)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Records:</span>{" "}
                    {selectedBackup.recordCount?.toLocaleString() || "Unknown"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Size:</span>{" "}
                    {selectedBackup.fileSize ? formatBytes(selectedBackup.fileSize) : "Unknown"}
                  </p>
                  {selectedBackup.metadata?.description && (
                    <p>
                      <span className="text-muted-foreground">Description:</span>{" "}
                      {selectedBackup.metadata.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clearExisting"
                checked={clearExisting}
                onCheckedChange={(checked) => setClearExisting(checked === true)}
              />
              <Label htmlFor="clearExisting" className="text-sm">
                Clear existing data before restore (recommended for full restore)
              </Label>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Warning</p>
                  <p className="text-muted-foreground">
                    Restoring a backup will modify existing data. This operation cannot be easily
                    undone. Make sure to create a backup of current data before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRestoreDialogOpen(false);
                setRestoreFile(null);
                setClearExisting(false);
                setSelectedBackup(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={selectedBackup ? handleRestoreFromSelected : handleRestoreFromFile}
              disabled={isRestoring || (!selectedBackup && !restoreFile)}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup from{" "}
              {selectedBackup && formatDate(selectedBackup.createdAt)}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BackupManagement;
