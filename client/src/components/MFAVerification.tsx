import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

interface MFAVerificationProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function MFAVerification({ onSuccess, onCancel }: MFAVerificationProps) {
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState("");

  const verifyMutation = trpc.mfa.verify.useMutation({
    onSuccess: (data) => {
      if (data.usedBackupCode && data.remainingBackupCodes <= 3) {
        toast.warning(
          `You have ${data.remainingBackupCodes} backup codes remaining. Consider regenerating them.`
        );
      }
      toast.success("Verification successful!");
      onSuccess();
    },
    onError: (error) => {
      setError(error.message);
      setCode("");
    },
  });

  const handleVerify = () => {
    const expectedLength = useBackupCode ? 8 : 6;

    if (code.length !== expectedLength) {
      setError(`Please enter a ${expectedLength}-digit code`);
      return;
    }

    setError("");
    verifyMutation.mutate({
      token: code,
      trustDevice,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length === (useBackupCode ? 8 : 6)) {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          {useBackupCode
            ? "Enter one of your backup codes"
            : "Enter the code from your authenticator app"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">
            {useBackupCode ? "Backup Code" : "Verification Code"}
          </Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9A-Z]*"
            maxLength={useBackupCode ? 8 : 6}
            placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
            value={code}
            onChange={(e) => {
              const value = useBackupCode
                ? e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "")
                : e.target.value.replace(/\D/g, "");
              setCode(value);
              setError("");
            }}
            onKeyPress={handleKeyPress}
            className="text-center text-2xl tracking-widest"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="trust-device"
            checked={trustDevice}
            onCheckedChange={(checked) => setTrustDevice(checked as boolean)}
          />
          <Label
            htmlFor="trust-device"
            className="text-sm font-normal cursor-pointer"
          >
            Trust this device for 30 days
          </Label>
        </div>

        <Button
          variant="link"
          size="sm"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode("");
            setError("");
          }}
          className="p-0 h-auto"
        >
          {useBackupCode
            ? "Use authenticator code instead"
            : "Use backup code instead"}
        </Button>
      </CardContent>
      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleVerify}
          disabled={
            verifyMutation.isPending ||
            code.length !== (useBackupCode ? 8 : 6)
          }
          className={!onCancel ? "w-full" : ""}
        >
          {verifyMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Verify
        </Button>
      </CardFooter>
    </Card>
  );
}
