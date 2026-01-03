/**
 * MFA Grace Period Banner
 * Shows warning banner when user is in MFA grace period
 */

import { AlertTriangle, Shield, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function MFAGracePeriodBanner() {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  
  const { data: mfaStatus, isLoading } = trpc.mfa.checkMfaRequirement.useQuery();

  // Don't show if loading, dismissed, or not required
  if (isLoading || dismissed || !mfaStatus?.required) {
    return null;
  }

  // Don't show if MFA is already enabled
  if (mfaStatus.enabled) {
    return null;
  }

  // Don't show if not in grace period and not expired
  if (!mfaStatus.inGracePeriod && !mfaStatus.gracePeriodExpired) {
    return null;
  }

  // If grace period expired, show critical warning
  if (mfaStatus.gracePeriodExpired) {
    return (
      <Alert className="border-destructive bg-destructive/10 mb-4">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <span className="font-semibold text-destructive">MFA Setup Required: </span>
            <span className="text-foreground">
              Your grace period has expired. You must enable Multi-Factor Authentication to continue using the system.
            </span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setLocation("/settings/security")}
            className="ml-4 shrink-0"
          >
            <Shield className="mr-2 h-4 w-4" />
            Enable MFA Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show grace period warning with days remaining
  const daysText = mfaStatus.daysRemaining === 1 ? "1 day" : `${mfaStatus.daysRemaining} days`;
  const isUrgent = mfaStatus.daysRemaining <= 2;

  return (
    <Alert className={`mb-4 ${isUrgent ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"}`}>
      <Shield className={`h-4 w-4 ${isUrgent ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"}`} />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className={`font-semibold ${isUrgent ? "text-orange-700 dark:text-orange-300" : "text-blue-700 dark:text-blue-300"}`}>
            MFA Setup Required: 
          </span>
          <span className="text-foreground ml-1">
            You have {daysText} remaining to enable Multi-Factor Authentication.
            {isUrgent && " Please set it up as soon as possible."}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <Button
            size="sm"
            variant={isUrgent ? "default" : "outline"}
            onClick={() => setLocation("/settings/security")}
          >
            <Shield className="mr-2 h-4 w-4" />
            Set Up MFA
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
