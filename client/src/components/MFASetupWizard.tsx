import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface MFASetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function MFASetupWizard({ onComplete, onCancel }: MFASetupWizardProps) {
  const [step, setStep] = useState<"method" | "intro" | "qr" | "verify" | "backup" | "email">("method");
  const [mfaMethod, setMfaMethod] = useState<"totp" | "email">("totp");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");

  const setupEmailMutation = trpc.emailMfa.setupEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setStep("email");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const enableEmailMutation = trpc.emailMfa.enableEmail.useMutation({
    onSuccess: () => {
      toast.success("Email MFA enabled successfully!");
      onComplete();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const setupMutation = trpc.mfa.setup.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep("qr");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const enableMutation = trpc.mfa.enable.useMutation({
    onSuccess: () => {
      setStep("backup");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleMethodSelect = (method: "totp" | "email") => {
    setMfaMethod(method);
    if (method === "email") {
      setupEmailMutation.mutate();
    } else {
      setStep("intro");
    }
  };

  const handleSetup = () => {
    setupMutation.mutate();
  };

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setError("");
    if (mfaMethod === "email") {
      enableEmailMutation.mutate({ code: verificationCode });
    } else {
      enableMutation.mutate({ token: verificationCode });
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = backupCodes.join("\n");
    const blob = new Blob([`BCA System - MFA Backup Codes\n\n${content}\n\nKeep these codes in a safe place. Each code can only be used once.`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bca-mfa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  const handleComplete = () => {
    toast.success("MFA enabled successfully!");
    onComplete();
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      {step === "method" && (
        <>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>Choose MFA Method</CardTitle>
            </div>
            <CardDescription>
              Select how you'd like to receive verification codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-auto p-6 flex flex-col items-start gap-2"
              onClick={() => handleMethodSelect("totp")}
              disabled={setupEmailMutation.isPending}
            >
              <div className="font-semibold">Authenticator App (TOTP)</div>
              <div className="text-sm text-muted-foreground text-left">
                Use Google Authenticator, Microsoft Authenticator, or similar apps
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-auto p-6 flex flex-col items-start gap-2"
              onClick={() => handleMethodSelect("email")}
              disabled={setupEmailMutation.isPending}
            >
              <div className="font-semibold">Email Verification</div>
              <div className="text-sm text-muted-foreground text-left">
                Receive verification codes via email
              </div>
              {setupEmailMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          </CardFooter>
        </>
      )}

      {step === "intro" && (
        <>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>Enable Multi-Factor Authentication</CardTitle>
            </div>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Multi-Factor Authentication (MFA) requires you to enter a verification code from your
              authenticator app in addition to your password when logging in.
            </p>
            <div className="space-y-2">
              <h4 className="font-medium">What you'll need:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>An authenticator app (Google Authenticator, Microsoft Authenticator, or Authy)</li>
                <li>Your smartphone or tablet</li>
                <li>About 2 minutes to complete setup</li>
              </ul>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Once enabled, you'll need your authenticator app to log in. Make sure to save your
                backup codes in a safe place.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSetup} disabled={setupMutation.isPending}>
              {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get Started
            </Button>
          </CardFooter>
        </>
      )}

      {step === "qr" && (
        <>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Use your authenticator app to scan this QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Can't scan the code?</p>
              <p className="text-xs text-muted-foreground">
                Enter this code manually in your authenticator app:
              </p>
              <code className="block p-2 bg-muted rounded text-sm font-mono break-all">
                {secret}
              </code>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setStep("verify")} className="w-full">
              Continue
            </Button>
          </CardFooter>
        </>
      )}

      {step === "email" && (
        <>
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                A verification code has been sent to your email address. Please check your inbox.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <label htmlFor="email-code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="email-code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("method")}>
              Back
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || enableEmailMutation.isPending}
            >
              {enableEmailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </CardFooter>
        </>
      )}

      {step === "verify" && (
        <>
          <CardHeader>
            <CardTitle>Verify Setup</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              The code changes every 30 seconds. Enter the current code shown in your app.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("qr")}>
              Back
            </Button>
            <Button
              onClick={handleVerify}
              disabled={enableMutation.isPending || verificationCode.length !== 6}
            >
              {enableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </CardFooter>
        </>
      )}

      {step === "backup" && (
        <>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>MFA Enabled Successfully!</CardTitle>
            </div>
            <CardDescription>
              Save your backup codes before continuing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Save these backup codes in a safe place. You can use them
                to access your account if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {backupCodes.map((code, index) => (
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
            <p className="text-xs text-muted-foreground">
              Each backup code can only be used once. You can generate new codes anytime from your
              security settings.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleComplete} className="w-full">
              I've Saved My Backup Codes
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
