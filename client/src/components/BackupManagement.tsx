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
  Shield,
  Timer,
  Play,
  Settings,
  Lock,
  Unlock,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [description, setDescription] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true);
  const [activeTab, setActiveTab] = useState("backups");
  
  // Schedule form state
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleHour, setScheduleHour] = useState("3");
  const [scheduleMinute, setScheduleMinute] = useState("0");
  const [scheduleRetention, setScheduleRetention] = useState("30");
  const [scheduleEncryption, setScheduleEncryption] = useState(true);
  const [emailOnSuccess, setEmailOnSuccess] = useState(true);
  const [emailOnFailure, setEmailOnFailure] = useState(true);

  // Queries
  const backupsQuery = trpc.backup.list.useQuery({ limit: 20, offset: 0 });
  const statsQuery = trpc.backup.getStats.useQuery();
  const schedulesQuery = trpc.backup.listSchedules.useQuery();
  const scheduleStatsQuery = trpc.backup.getScheduleStats.useQuery();

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

  // Encrypted backup mutation
  const createEncryptedBackupMutation = trpc.backup.createEncrypted.useMutation({
    onSuccess: (data) => {
      toast.success(`Encrypted backup created! ${data.recordCount} records backed up with AES-256-GCM encryption.`);
      setCreateDialogOpen(false);
      setDescription("");
      backupsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Encrypted backup failed: ${error.message}`);
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  // Schedule mutations
  const createScheduleMutation = trpc.backup.createSchedule.useMutation({
    onSuccess: () => {
      toast.success("Backup schedule created successfully");
      setScheduleDialogOpen(false);
      resetScheduleForm();
      schedulesQuery.refetch();
      scheduleStatsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  const updateScheduleMutation = trpc.backup.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated");
      schedulesQuery.refetch();
      scheduleStatsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  const deleteScheduleMutation = trpc.backup.deleteSchedule.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      schedulesQuery.refetch();
      scheduleStatsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });

  const triggerBackupMutation = trpc.backup.triggerScheduledBackup.useMutation({
    onSuccess: () => {
      toast.success("Scheduled backup triggered successfully");
      backupsQuery.refetch();
      schedulesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to trigger backup: ${error.message}`);
    },
  });

  const initDefaultScheduleMutation = trpc.backup.initializeDefaultSchedule.useMutation({
    onSuccess: () => {
      toast.success("Default daily backup schedule initialized");
      schedulesQuery.refetch();
      scheduleStatsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to initialize schedule: ${error.message}`);
    },
  });

  const cleanupMutation = trpc.backup.cleanupOldBackups.useMutation({
    onSuccess: (data) => {
      toast.success(`Cleaned up ${data.deletedCount} old backups`);
      backupsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Cleanup failed: ${error.message}`);
    },
  });

  const resetScheduleForm = () => {
    setScheduleName("");
    setScheduleDescription("");
    setScheduleHour("3");
    setScheduleMinute("0");
    setScheduleRetention("30");
    setScheduleEncryption(true);
    setEmailOnSuccess(true);
    setEmailOnFailure(true);
  };

  const handleCreateBackup = () => {
    setIsCreating(true);
    if (useEncryption) {
      createEncryptedBackupMutation.mutate({ description: description || undefined });
    } else {
      createBackupMutation.mutate({ description: description || undefined });
    }
  };

  const handleCreateSchedule = () => {
    const cronExpression = `${scheduleMinute} ${scheduleHour} * * *`;
    createScheduleMutation.mutate({
      name: scheduleName || `Daily Backup at ${scheduleHour}:${scheduleMinute.padStart(2, '0')} ET`,
      description: scheduleDescription || undefined,
      cronExpression,
      timezone: "America/New_York",
      retentionDays: parseInt(scheduleRetention),
      encryptionEnabled: scheduleEncryption,
      emailOnSuccess,
      emailOnFailure,
    });
  };

  const handleToggleSchedule = (scheduleId: number, isEnabled: boolean) => {
    updateScheduleMutation.mutate({ id: scheduleId, isEnabled });
  };

  const handleTriggerBackup = (scheduleId: number) => {
    triggerBackupMutation.mutate({ scheduleId });
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
      <div className="grid gap-4 md:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Next Scheduled</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleStatsQuery.data?.nextScheduledBackup
                ? new Date(scheduleStatsQuery.data.nextScheduledBackup).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {scheduleStatsQuery.data?.enabledSchedules || 0} active schedules
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

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="backups" className="gap-2">
            <Database className="w-4 h-4" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <Timer className="w-4 h-4" />
            Schedules
          </TabsTrigger>
        </TabsList>

        {/* Backups Tab */}
        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Backup Management
              </CardTitle>
              <CardDescription>
                Create, download, and restore database backups. Backups include all system data with optional AES-256-GCM encryption.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Shield className="w-4 h-4" />
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
                  onClick={() => cleanupMutation.mutate()}
                  disabled={cleanupMutation.isPending}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Cleanup Old Backups
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
                      <TableHead>Encrypted</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Size</TableHead>
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
                      backupsQuery.data?.backups.map((backup: any) => (
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
                          <TableCell>
                            {backup.isEncrypted ? (
                              <Badge variant="default" className="gap-1 bg-green-600">
                                <Lock className="w-3 h-3" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Unlock className="w-3 h-3" />
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{backup.recordCount?.toLocaleString() || "-"}</TableCell>
                          <TableCell>{backup.fileSize ? formatBytes(backup.fileSize) : "-"}</TableCell>
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
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Backup Schedules
              </CardTitle>
              <CardDescription>
                Configure automated backup schedules. Default: Daily at 3:00 AM Eastern Time with AES-256-GCM encryption.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <Button onClick={() => setScheduleDialogOpen(true)} className="gap-2">
                  <Timer className="w-4 h-4" />
                  Create Schedule
                </Button>
                <Button
                  variant="outline"
                  onClick={() => initDefaultScheduleMutation.mutate()}
                  disabled={initDefaultScheduleMutation.isPending}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Initialize Default (3 AM ET)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => schedulesQuery.refetch()}
                  disabled={schedulesQuery.isFetching}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${schedulesQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Schedules Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Timezone</TableHead>
                      <TableHead>Encryption</TableHead>
                      <TableHead>Retention</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulesQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : !schedulesQuery.data || schedulesQuery.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No schedules configured. Click "Initialize Default" to set up daily backups at 3 AM Eastern.
                        </TableCell>
                      </TableRow>
                    ) : (
                      schedulesQuery.data.map((schedule: any) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {schedule.cronExpression}
                            </code>
                          </TableCell>
                          <TableCell>{schedule.timezone}</TableCell>
                          <TableCell>
                            {schedule.encryptionEnabled ? (
                              <Badge variant="default" className="gap-1 bg-green-600">
                                <Lock className="w-3 h-3" />
                                AES-256
                              </Badge>
                            ) : (
                              <Badge variant="outline">None</Badge>
                            )}
                          </TableCell>
                          <TableCell>{schedule.retentionDays} days</TableCell>
                          <TableCell>
                            {schedule.nextRunAt
                              ? new Date(schedule.nextRunAt).toLocaleString()
                              : "Not scheduled"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!!schedule.isEnabled}
                                onCheckedChange={(checked) => handleToggleSchedule(schedule.id, checked)}
                              />
                              <span className="text-sm">
                                {schedule.isEnabled ? "Active" : "Disabled"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTriggerBackup(schedule.id)}
                                disabled={triggerBackupMutation.isPending}
                                title="Run backup now"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteScheduleMutation.mutate({ id: schedule.id })}
                                title="Delete schedule"
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
        </TabsContent>
      </Tabs>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
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
            
            {/* Encryption Option */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Enable Encryption
                </Label>
                <p className="text-sm text-muted-foreground">
                  Encrypt backup with AES-256-GCM (recommended)
                </p>
              </div>
              <Switch
                checked={useEncryption}
                onCheckedChange={setUseEncryption}
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

            {useEncryption && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800 dark:text-green-200">Encryption Enabled</p>
                    <p className="text-green-700 dark:text-green-300">
                      Your backup will be encrypted using AES-256-GCM with a secure key derived from the system secret.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBackup} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {useEncryption ? "Encrypting..." : "Creating..."}
                </>
              ) : (
                <>
                  {useEncryption ? <Lock className="w-4 h-4 mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                  {useEncryption ? "Create Encrypted Backup" : "Create Backup"}
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

      {/* Create Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Create Backup Schedule
            </DialogTitle>
            <DialogDescription>
              Configure automated backups to run at a specific time each day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleName">Schedule Name</Label>
              <Input
                id="scheduleName"
                placeholder="e.g., Daily Backup"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleDescription">Description (optional)</Label>
              <Textarea
                id="scheduleDescription"
                placeholder="Enter a description for this schedule..."
                value={scheduleDescription}
                onChange={(e) => setScheduleDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time (Eastern)</Label>
                <div className="flex gap-2">
                  <Select value={scheduleHour} onValueChange={setScheduleHour}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center">:</span>
                  <Select value={scheduleMinute} onValueChange={setScheduleMinute}>
                    <SelectTrigger>
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 15, 30, 45].map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {m.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Retention Period</Label>
                <Select value={scheduleRetention} onValueChange={setScheduleRetention}>
                  <SelectTrigger>
                    <SelectValue placeholder="Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">365 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Encryption Option */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Enable Encryption
                </Label>
                <p className="text-sm text-muted-foreground">
                  Encrypt scheduled backups with AES-256-GCM
                </p>
              </div>
              <Switch
                checked={scheduleEncryption}
                onCheckedChange={setScheduleEncryption}
              />
            </div>

            {/* Email Notification Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Notify on Success
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send email when backup completes successfully
                  </p>
                </div>
                <Switch
                  checked={emailOnSuccess}
                  onCheckedChange={setEmailOnSuccess}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Notify on Failure
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send email alert when backup fails
                  </p>
                </div>
                <Switch
                  checked={emailOnFailure}
                  onCheckedChange={setEmailOnFailure}
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Schedule Summary</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Backup will run daily at {scheduleHour.padStart(2, '0')}:{scheduleMinute.padStart(2, '0')} Eastern Time.
                    Old backups will be automatically deleted after {scheduleRetention} days.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setScheduleDialogOpen(false);
              resetScheduleForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule} disabled={createScheduleMutation.isPending}>
              {createScheduleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Timer className="w-4 h-4 mr-2" />
                  Create Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BackupManagement;
