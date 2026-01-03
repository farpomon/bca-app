import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";

interface ShareProjectDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareProjectDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ShareProjectDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permission, setPermission] = useState<"view" | "edit">("view");

  const utils = trpc.useUtils();
  
  const { data: shares, isLoading: sharesLoading } = trpc.sharing.getProjectShares.useQuery(
    { projectId },
    { enabled: open }
  );

  const { data: allUsers } = trpc.admin.getAllUsers.useQuery(undefined, { enabled: open });

  const shareMutation = trpc.sharing.shareProject.useMutation({
    onSuccess: () => {
      toast.success("Project shared successfully");
      utils.sharing.getProjectShares.invalidate({ projectId });
      setSelectedUserId("");
      setPermission("view");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to share project");
    },
  });

  const removeMutation = trpc.sharing.removeShare.useMutation({
    onSuccess: () => {
      toast.success("Access removed");
      utils.sharing.getProjectShares.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove access");
    },
  });

  const handleShare = () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    shareMutation.mutate({
      projectId,
      userId: parseInt(selectedUserId),
      permission,
    });
  };

  const handleRemove = (userId: number) => {
    if (confirm("Remove this user's access to the project?")) {
      removeMutation.mutate({ projectId, userId });
    }
  };

  // Filter out users who already have access
  const availableUsers = allUsers?.filter(
    (user: any) => !shares?.some((share) => share.userId === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Share "{projectName}" with other users and manage their permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new user */}
          <div className="space-y-4">
            <Label>Add User</Label>
            <div className="flex gap-3">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.email || `User ${user.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={permission}
                onValueChange={(value) => setPermission(value as "view" | "edit")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">Can Edit</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleShare}
                disabled={!selectedUserId || shareMutation.isPending}
                size="icon"
              >
                {shareMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Current shares */}
          <div className="space-y-3">
            <Label>Current Access</Label>
            {sharesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shares && shares.length > 0 ? (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {share.userName || share.userEmail || `User ${share.userId}`}
                      </p>
                      {share.userEmail && (
                        <p className="text-sm text-muted-foreground">{share.userEmail}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {share.permission === "view" ? "View Only" : "Can Edit"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(share.userId)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No one else has access to this project yet.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
