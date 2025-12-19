import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, Calendar, UserX, UserCheck, Shield, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { showUndoToast } from "@/components/UndoNotification";

interface BulkUserActionsProps {
  selectedUserIds: number[];
  onClearSelection: () => void;
  onSuccess: () => void;
  currentUserId?: number;
}

export function BulkUserActions({ selectedUserIds, onClearSelection, onSuccess, currentUserId }: BulkUserActionsProps) {
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trialDays, setTrialDays] = useState(30);
  const [newRole, setNewRole] = useState<"admin" | "project_manager" | "editor" | "viewer">("viewer");

  const safeUserIds = selectedUserIds.filter(id => id !== currentUserId);
  const hasCurrentUser = selectedUserIds.includes(currentUserId || -1);

  const bulkExtendTrialMutation = trpc.admin.bulkExtendTrial.useMutation({
    onSuccess: (result) => {
      toast.success(`Extended trial for ${result.successCount} users`);
      setExtendTrialDialogOpen(false);
      onClearSelection();
      onSuccess();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const bulkSuspendMutation = trpc.admin.bulkSuspendUsers.useMutation({
    onSuccess: (result) => {
      toast.success(`Suspended ${result.successCount} users`);
      if (result.operationId) {
        showUndoToast(result.operationId, "Suspend Users", result.successCount, () => {
          onSuccess();
        });
      }
      setSuspendDialogOpen(false);
      onClearSelection();
      onSuccess();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const bulkActivateMutation = trpc.admin.bulkActivateUsers.useMutation({
    onSuccess: (result) => {
      toast.success(`Activated ${result.successCount} users`);
      if (result.operationId) {
        showUndoToast(result.operationId, "Activate Users", result.successCount, () => {
          onSuccess();
        });
      }
      onClearSelection();
      onSuccess();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const bulkChangeRoleMutation = trpc.admin.bulkChangeRole.useMutation({
    onSuccess: (result) => {
      toast.success(`Changed role for ${result.successCount} users`);
      if (result.operationId) {
        showUndoToast(result.operationId, "Change Role", result.successCount, () => {
          onSuccess();
        });
      }
      setChangeRoleDialogOpen(false);
      onClearSelection();
      onSuccess();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const bulkDeleteMutation = trpc.admin.bulkDeleteUsers.useMutation({
    onSuccess: (result) => {
      toast.success(`Deleted ${result.successCount} users`);
      if (result.operationId) {
        showUndoToast(result.operationId, "Delete Users", result.successCount, () => {
          onSuccess();
        });
      }
      setDeleteDialogOpen(false);
      onClearSelection();
      onSuccess();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const isLoading = bulkExtendTrialMutation.isPending || bulkSuspendMutation.isPending || 
    bulkActivateMutation.isPending || bulkChangeRoleMutation.isPending || bulkDeleteMutation.isPending;

  if (selectedUserIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-4">
        <Badge variant="secondary">{selectedUserIds.length} selected</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setExtendTrialDialogOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" /> Extend Trial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => bulkActivateMutation.mutate({ userIds: selectedUserIds })}>
              <UserCheck className="mr-2 h-4 w-4" /> Activate Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSuspendDialogOpen(true)}>
              <UserX className="mr-2 h-4 w-4" /> Suspend Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChangeRoleDialogOpen(true)}>
              <Shield className="mr-2 h-4 w-4" /> Change Role
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Users
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>Clear Selection</Button>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      <Dialog open={extendTrialDialogOpen} onOpenChange={setExtendTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial Period</DialogTitle>
            <DialogDescription>Extend trial for {selectedUserIds.length} users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Additional Days</Label>
              <Input type="number" min={1} max={365} value={trialDays} onChange={(e) => setTrialDays(parseInt(e.target.value) || 30)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTrialDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkExtendTrialMutation.mutate({ userIds: selectedUserIds, days: trialDays })} disabled={bulkExtendTrialMutation.isPending}>
              {bulkExtendTrialMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Extend Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Users</DialogTitle>
            <DialogDescription>Suspend {safeUserIds.length} users.</DialogDescription>
          </DialogHeader>
          {hasCurrentUser && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">You cannot suspend yourself.</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => bulkSuspendMutation.mutate({ userIds: safeUserIds })} disabled={bulkSuspendMutation.isPending || safeUserIds.length === 0}>
              {bulkSuspendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Suspend {safeUserIds.length} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>Change role for {safeUserIds.length} users.</DialogDescription>
          </DialogHeader>
          {hasCurrentUser && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">You cannot change your own role.</span>
            </div>
          )}
          <div className="space-y-2 py-4">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkChangeRoleMutation.mutate({ userIds: safeUserIds, newRole })} disabled={bulkChangeRoleMutation.isPending || safeUserIds.length === 0}>
              {bulkChangeRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Users</DialogTitle>
            <DialogDescription>Permanently delete {safeUserIds.length} users. This cannot be undone.</DialogDescription>
          </DialogHeader>
          {hasCurrentUser && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">You cannot delete yourself.</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => bulkDeleteMutation.mutate({ userIds: safeUserIds })} disabled={bulkDeleteMutation.isPending || safeUserIds.length === 0}>
              {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete {safeUserIds.length} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
