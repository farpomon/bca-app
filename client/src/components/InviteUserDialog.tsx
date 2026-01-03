import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
import { Loader2, UserPlus, Mail } from "lucide-react";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName: string;
  onSuccess?: () => void;
}

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer", description: "Can view projects and assessments" },
  { value: "editor", label: "Editor", description: "Can edit projects and assessments" },
  { value: "project_manager", label: "Project Manager", description: "Can manage projects and team members" },
  { value: "company_admin", label: "Company Admin", description: "Full access to company settings" },
] as const;

export function InviteUserDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"company_admin" | "project_manager" | "editor" | "viewer">("viewer");

  const utils = trpc.useUtils();

  const inviteUser = trpc.companyRoles.inviteUserByEmail.useMutation({
    onSuccess: (data) => {
      if (data.isNewUser) {
        toast.success(data.message);
      } else {
        toast.success("User has been invited to the company");
      }
      utils.companyRoles.getCompanyUsers.invalidate({ companyId });
      onOpenChange(false);
      setEmail("");
      setRole("viewer");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to invite user");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    inviteUser.mutate({
      companyId,
      email: email.trim(),
      role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite User to {companyName}
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your company. If the user already has an
            account, they will receive a notification. Otherwise, they will be
            added when they sign up.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteUser.isPending}>
              {inviteUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
