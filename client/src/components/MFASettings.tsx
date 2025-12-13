import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldCheck, ShieldOff, Smartphone, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MFASetupWizard } from "./MFASetupWizard";

export function MFASettings() {
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [regenerateCode, setRegenerateCode] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  const utils = trpc.useUtils();

  const { data: status, isLoading } = trpc.mfa.getStatus.useQuery();
  const { data: devices = [] } = trpc.mfa.getTrustedDevices.useQuery();

  const disableMutation = trpc.mfa.disable.useMutation({
    onSuccess: () => {
      toast.success("MFA disabled successfully");
      setShowDisableDialog(false);
      setDisableCode("");
      utils.mfa.getStatus.invalidate();
      utils.mfa.getTrustedDevices.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const regenerateMutation = trpc.mfa.regenerateBackupCodes.useMutation({
    onSuccess: (data) => {
      setNewBackupCodes(data.backupCodes);
      setRegenerateCode("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeDeviceMutation = trpc.mfa.removeTrustedDevice.useMutation({
    onSuccess: () => {
      toast.success("Device removed successfully");
      utils.mfa.getTrustedDevices.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDisable = () => {
    if (disableCode.length < 6) {
      toast.error("Please enter a valid code");
      return;
    }

    disableMutation.mutate({ token: disableCode });
  };

  const handleRegenerate = () => {
    if (regenerateCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    regenerateMutation.mutate({ token: regenerateCode });
  };

  const handleDownloadBackupCodes = () => {
    const content = newBackupCodes.join("\n");
    const blob = new Blob(
      [`BCA System - MFA Backup Codes\n\n${content}\n\nKeep these codes in a safe place. Each code can only be used once.`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bca-mfa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (showSetupWizard) {
    return (
      <MFASetupWizard
        onComplete={() => {
          setShowSetupWizard(false);
          utils.mfa.getStatus.invalidate();
        }}
        onCancel={() => setShowSetupWizard(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* MFA Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status?.enabled ? (
                <ShieldCheck className="h-6 w-6 text-green-600" />
              ) : (
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <CardTitle>Multi-Factor Authentication</CardTitle>
                <CardDescription>
                  {status?.enabled
                    ? "Your account is protected with MFA"
                    : "Add an extra layer of security to your account"}
                </CardDescription>
              </div>
            </div>
            <Badge variant={status?.enabled ? "default" : "secondary"}>
              {status?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Multi-Factor Authentication (MFA) requires you to enter a verification code from your
            authenticator app when logging in, providing an additional layer of security beyond your
            password.
          </p>
          <div className="flex gap-2">
            {!status?.enabled ? (
              <Button onClick={() => setShowSetupWizard(true)}>
                <Shield className="mr-2 h-4 w-4" />
                Enable MFA
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Disable MFA
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trusted Devices Card */}
      {status?.enabled && devices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>Trusted Devices</CardTitle>
            </div>
            <CardDescription>
              Devices that don't require MFA verification for 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.deviceName}</TableCell>
                    <TableCell>{formatDate(device.lastUsed)}</TableCell>
                    <TableCell>{formatDate(device.expiresAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDeviceMutation.mutate({ deviceId: device.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Disable MFA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Multi-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter a verification code to confirm disabling MFA. This will make your account less
              secure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="disable-code" className="text-sm font-medium">
                Verification Code (6-digit) or Backup Code (8-digit)
              </label>
              <Input
                id="disable-code"
                type="text"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                className="text-center text-xl tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={disableMutation.isPending || disableCode.length < 6}
            >
              {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable MFA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog
        open={showRegenerateDialog}
        onOpenChange={(open) => {
          setShowRegenerateDialog(open);
          if (!open) {
            setNewBackupCodes([]);
            setRegenerateCode("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              {newBackupCodes.length === 0
                ? "Enter your verification code to generate new backup codes. This will invalidate all existing backup codes."
                : "Save these new backup codes in a safe place. Your old codes will no longer work."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {newBackupCodes.length === 0 ? (
              <div className="space-y-2">
                <label htmlFor="regenerate-code" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="regenerate-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={regenerateCode}
                  onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl tracking-widest"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                  {newBackupCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono">
                      {code}
                    </code>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadBackupCodes}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Backup Codes
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            {newBackupCodes.length === 0 ? (
              <>
                <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={regenerateMutation.isPending || regenerateCode.length !== 6}
                >
                  {regenerateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate New Codes
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowRegenerateDialog(false)} className="w-full">
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
