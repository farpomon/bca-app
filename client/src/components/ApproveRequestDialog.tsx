import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ApproveRequestDialogProps {
  request: {
    id: number;
    fullName: string;
    email: string;
    companyName: string;
    city: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ApproveRequestDialog({ request, open, onOpenChange, onSuccess }: ApproveRequestDialogProps) {
  const [formData, setFormData] = useState({
    company: request.companyName,
    city: request.city,
    role: "editor" as "viewer" | "editor" | "project_manager" | "admin",
    accountStatus: "active" as "active" | "trial",
    trialDays: 30,
    adminNotes: "",
    buildingAccess: [] as number[], // Empty array = no access by default
  });

  // Fetch all projects to show as building options
  const { data: projects } = trpc.admin.getAllProjects.useQuery(
    { limit: 1000, offset: 0 },
    { enabled: open }
  );

  const approveMutation = trpc.accessRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Access request approved successfully");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveMutation.mutate({
      requestId: request.id,
      company: formData.company,
      city: formData.city,
      role: formData.role,
      accountStatus: formData.accountStatus,
      trialDays: formData.accountStatus === "trial" ? formData.trialDays : undefined,
      adminNotes: formData.adminNotes || undefined,
      buildingAccess: formData.buildingAccess,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approve Access Request</DialogTitle>
          <DialogDescription>
            Review and approve access for {request.fullName} ({request.email})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City/Location *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">User Role *</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                  <SelectItem value="editor">Editor (Can edit)</SelectItem>
                  <SelectItem value="project_manager">Project Manager (Full access)</SelectItem>
                  <SelectItem value="admin">Admin (System admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountStatus">Account Status *</Label>
              <Select
                value={formData.accountStatus}
                onValueChange={(value: any) => setFormData({ ...formData, accountStatus: value })}
              >
                <SelectTrigger id="accountStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Full access)</SelectItem>
                  <SelectItem value="trial">Trial (Limited time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.accountStatus === "trial" && (
            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Duration (Days)</Label>
              <Input
                id="trialDays"
                type="number"
                min="1"
                max="365"
                value={formData.trialDays}
                onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="buildingAccess">Building Access (Tiered Pricing)</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Select which buildings this user can access. Leave empty for no access (default).
              </p>
              {projects?.projects && projects.projects.length > 0 ? (
                projects.projects.map((project) => (
                  <label key={project.id} className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.buildingAccess.includes(project.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            buildingAccess: [...formData.buildingAccess, project.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            buildingAccess: formData.buildingAccess.filter((id) => id !== project.id),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">
                      {project.name} - {project.location || 'No location'}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No buildings available</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Selected: {formData.buildingAccess.length} building(s)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminNotes">Admin Notes (Internal)</Label>
            <Textarea
              id="adminNotes"
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              placeholder="Internal notes about this approval..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={approveMutation.isPending}>
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Access"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
