import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, X, Loader2 } from "lucide-react";

export function PendingInvitationsBanner() {
  const utils = trpc.useUtils();
  
  const { data: invitations, isLoading } = trpc.companyRoles.myPendingInvitations.useQuery();

  const acceptInvitation = trpc.companyRoles.acceptInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation accepted");
      utils.companyRoles.myPendingInvitations.invalidate();
      utils.companyRoles.myCompanies.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept invitation");
    },
  });

  const declineInvitation = trpc.companyRoles.declineInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation declined");
      utils.companyRoles.myPendingInvitations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to decline invitation");
    },
  });

  if (isLoading || !invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {invitations.map((invitation) => (
        <Card key={invitation.id} className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    You've been invited to join{" "}
                    <span className="text-primary">{invitation.companyName}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getRoleLabel(invitation.role)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Invited {formatDate(invitation.invitedAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => declineInvitation.mutate({ companyId: invitation.companyId })}
                  disabled={declineInvitation.isPending || acceptInvitation.isPending}
                >
                  {declineInvitation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">Decline</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptInvitation.mutate({ companyId: invitation.companyId })}
                  disabled={acceptInvitation.isPending || declineInvitation.isPending}
                >
                  {acceptInvitation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="ml-1">Accept</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    company_admin: "Admin",
    project_manager: "Manager",
    editor: "Editor",
    viewer: "Viewer",
  };
  return labels[role] || role;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
