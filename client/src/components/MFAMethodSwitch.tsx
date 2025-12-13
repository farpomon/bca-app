/**
 * MFA Method Switch Component
 * Allows users to switch between TOTP and email MFA methods without disabling MFA
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Smartphone, ArrowRight, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MFAMethodSwitchProps {
  currentMethod: "totp" | "email";
  onSwitchComplete?: () => void;
}

export function MFAMethodSwitch({ currentMethod, onSwitchComplete }: MFAMethodSwitchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"select" | "verify" | "complete">("select");
  const [selectedMethod, setSelectedMethod] = useState<"totp" | "email" | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const initiateSwitchMutation = trpc.mfaMethodSwitch.initiateSwitch.useMutation({
    onSuccess: (data) => {
      setRequestId(data.requestId);
      setQrCode(data.qrCode || null);
      setStep("verify");
      toast.success("Switch request initiated", {
        description: `Please verify your new ${data.newMethod.toUpperCase()} method`,
      });
    },
    onError: (error) => {
      toast.error("Failed to initiate switch", {
        description: error.message,
      });
    },
  });

  const verifyMethodMutation = trpc.mfaMethodSwitch.verifyNewMethod.useMutation({
    onSuccess: () => {
      setStep("complete");
      toast.success("Verification successful");
    },
    onError: (error) => {
      toast.error("Verification failed", {
        description: error.message,
      });
    },
  });

  const completeSwitchMutation = trpc.mfaMethodSwitch.completeSwitch.useMutation({
    onSuccess: (data) => {
      toast.success("MFA method switched", {
        description: data.message,
      });
      utils.mfa.getStatus.invalidate();
      setIsOpen(false);
      resetState();
      onSwitchComplete?.();
    },
    onError: (error) => {
      toast.error("Failed to complete switch", {
        description: error.message,
      });
    },
  });

  const cancelSwitchMutation = trpc.mfaMethodSwitch.cancelSwitch.useMutation({
    onSuccess: () => {
      toast.info("Switch request cancelled");
      setIsOpen(false);
      resetState();
    },
  });

  const resetState = () => {
    setStep("select");
    setSelectedMethod(null);
    setQrCode(null);
    setVerificationCode("");
    setRequestId(null);
  };

  const handleSelectMethod = (method: "totp" | "email") => {
    setSelectedMethod(method);
  };

  const handleInitiateSwitch = () => {
    if (!selectedMethod) {
      toast.error("Please select a method");
      return;
    }
    initiateSwitchMutation.mutate({ newMethod: selectedMethod });
  };

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    verifyMethodMutation.mutate({ code: verificationCode });
  };

  const handleComplete = () => {
    completeSwitchMutation.mutate();
  };

  const handleCancel = () => {
    if (requestId) {
      cancelSwitchMutation.mutate();
    } else {
      setIsOpen(false);
      resetState();
    }
  };

  const newMethod = currentMethod === "totp" ? "email" : "totp";

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Switch MFA Method
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Switch MFA Method</DialogTitle>
            <DialogDescription>
              {step === "select" && "Choose your new MFA method"}
              {step === "verify" && "Verify your new MFA method"}
              {step === "complete" && "Complete the switch"}
            </DialogDescription>
          </DialogHeader>

          {step === "select" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 mb-4">
                <Card className="flex-1 border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {currentMethod === "totp" ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      Current Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{currentMethod.toUpperCase()}</p>
                  </CardContent>
                </Card>

                <ArrowRight className="h-6 w-6 text-muted-foreground" />

                <Card
                  className={`flex-1 border-2 cursor-pointer transition-colors ${
                    selectedMethod === newMethod ? "border-primary" : "hover:border-primary/50"
                  }`}
                  onClick={() => handleSelectMethod(newMethod)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {newMethod === "totp" ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      New Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{newMethod.toUpperCase()}</p>
                    {selectedMethod === newMethod && <Check className="h-5 w-5 text-primary mt-2" />}
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">
                  {newMethod === "totp" && "You'll need an authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) to scan a QR code."}
                  {newMethod === "email" && "You'll receive a 6-digit code via email for each login."}
                </p>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4 py-4">
              {qrCode && (
                <div className="flex flex-col items-center gap-4">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code with your authenticator app
                  </p>
                </div>
              )}

              {!qrCode && selectedMethod === "email" && (
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    A verification code has been sent to your email address.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                />
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Verification Successful</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Complete Switch" to finalize the change to {selectedMethod?.toUpperCase()} MFA.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={completeSwitchMutation.isPending}>
              Cancel
            </Button>

            {step === "select" && (
              <Button
                onClick={handleInitiateSwitch}
                disabled={!selectedMethod || initiateSwitchMutation.isPending}
              >
                {initiateSwitchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            )}

            {step === "verify" && (
              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || verifyMethodMutation.isPending}
              >
                {verifyMethodMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            )}

            {step === "complete" && (
              <Button onClick={handleComplete} disabled={completeSwitchMutation.isPending}>
                {completeSwitchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Switch
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
