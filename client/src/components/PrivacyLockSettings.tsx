import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Key, Copy, Check, Clock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PrivacyLockSettingsProps {
  companyId: number;
  companyName: string;
}

export function PrivacyLockSettings({ companyId, companyName }: PrivacyLockSettingsProps) {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusQuery = trpc.privacyLock.getStatus.useQuery({ companyId });
  const activeCodesQuery = trpc.privacyLock.getActiveAccessCodes.useQuery({ companyId });

  const toggleMutation = trpc.privacyLock.togglePrivacyLock.useMutation({
    onSuccess: (data) => {
      statusQuery.refetch();
      toast.success(
        data.privacyLockEnabled
          ? "Privacy lock enabled - site owner cannot view your data without access code"
          : "Privacy lock disabled - site owner can view your data"
      );
    },
    onError: (error) => {
      toast.error(`Failed to update privacy lock: ${error.message}`);
    },
  });

  const generateCodeMutation = trpc.privacyLock.generateAccessCode.useMutation({
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setShowCodeDialog(true);
      activeCodesQuery.refetch();
      toast.success("Access code generated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to generate access code: ${error.message}`);
    },
  });

  const handleCopyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success("Access code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseCodeDialog = () => {
    setShowCodeDialog(false);
    setGeneratedCode(null);
    setCopied(false);
  };

  if (statusQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const isLocked = statusQuery.data?.privacyLockEnabled ?? true;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Privacy Lock
          </CardTitle>
          <CardDescription>
            Control whether the site owner can view your company's data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                {isLocked ? (
                  <EyeOff className="h-4 w-4 text-green-600" />
                ) : (
                  <Eye className="h-4 w-4 text-amber-600" />
                )}
                Privacy Lock {isLocked ? "Enabled" : "Disabled"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isLocked
                  ? "Site owner cannot view your projects without an access code"
                  : "Site owner can view all your company's data"}
              </p>
            </div>
            <Switch
              checked={isLocked}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ companyId, enabled: checked })
              }
              disabled={toggleMutation.isPending}
            />
          </div>

          {isLocked && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Generate Access Code
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate a one-time code for the site owner to access your data (valid for 1 hour)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateCodeMutation.mutate({ companyId })}
                  disabled={generateCodeMutation.isPending}
                >
                  {generateCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Generate Code
                </Button>
              </div>

              {activeCodesQuery.data && activeCodesQuery.data.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Active Access Codes</Label>
                  <div className="space-y-2">
                    {activeCodesQuery.data.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <code className="font-mono">{code.maskedCode}</code>
                          {code.isUsed ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Used
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Expires: {new Date(code.expiresAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCodeDialog} onOpenChange={handleCloseCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              Access Code Generated
            </DialogTitle>
            <DialogDescription>
              Share this code with the site owner to grant them temporary access to your company's data.
              The code is valid for 1 hour.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
              <code className="text-2xl font-mono font-bold tracking-wider">
                {generatedCode}
              </code>
              <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              Valid for 1 hour
            </p>
          </div>

          <DialogFooter>
            <Button onClick={handleCopyCode} variant="outline">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
            <Button onClick={handleCloseCodeDialog}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
