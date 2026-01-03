import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Key, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AccessCodePromptProps {
  companyId: number;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccessGranted: () => void;
}

export function AccessCodePrompt({
  companyId,
  companyName,
  open,
  onOpenChange,
  onAccessGranted,
}: AccessCodePromptProps) {
  const [code, setCode] = useState("");

  const verifyMutation = trpc.privacyLock.verifyAccessCode.useMutation({
    onSuccess: (data) => {
      toast.success(`Access granted to ${companyName} until ${new Date(data.accessGrantedUntil).toLocaleTimeString()}`);
      setCode("");
      onOpenChange(false);
      onAccessGranted();
    },
    onError: (error) => {
      toast.error(error.message || "Invalid or expired access code");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter an access code");
      return;
    }
    verifyMutation.mutate({ companyId, code: code.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            Privacy Protected Company
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{companyName}</span> has enabled privacy lock.
            You need an access code from the company to view their data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
              <ShieldAlert className="h-5 w-5 flex-shrink-0" />
              <p>
                Contact the company administrator to request a temporary access code.
                Access codes are valid for 1 hour.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Access Code
              </Label>
              <Input
                id="accessCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter access code"
                className="font-mono text-center text-lg tracking-wider"
                maxLength={12}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={verifyMutation.isPending || !code.trim()}>
              {verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Verify Code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
