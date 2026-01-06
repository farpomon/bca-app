/**
 * Notification Permission Dialog
 * 
 * A dialog that prompts users to enable browser notifications.
 * Shows on first app load if notifications haven't been requested yet.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCircle, X, Sparkles } from "lucide-react";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { cn } from "@/lib/utils";

export function NotificationPermissionDialog() {
  const {
    shouldShowPrompt,
    requestPermission,
    dismissPrompt,
    permission,
    sendNotification,
  } = useNotificationPermission();

  const [isRequesting, setIsRequesting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleEnable = async () => {
    setIsRequesting(true);
    const result = await requestPermission();
    setIsRequesting(false);

    if (result === "granted") {
      setShowSuccess(true);
      // Send a test notification
      setTimeout(() => {
        sendNotification("Test Notification", {
          body: "Notifications are working! You'll receive alerts for sync events.",
          tag: "test-notification",
        });
      }, 500);
      // Auto-close after showing success
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
  };

  // Don't render if we shouldn't show the prompt
  if (!shouldShowPrompt && !showSuccess) {
    return null;
  }

  return (
    <Dialog open={shouldShowPrompt || showSuccess} onOpenChange={(open) => {
      if (!open && !showSuccess) {
        handleDismiss();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        {showSuccess ? (
          // Success state
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Notifications Enabled!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You'll receive notifications when your data syncs.
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Check your notifications - we sent you a test!
            </p>
          </div>
        ) : (
          // Permission request state
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle>Enable Notifications</DialogTitle>
              </div>
              <DialogDescription className="text-left">
                Get notified when your offline data syncs successfully. This helps you stay 
                informed about your assessment data, especially when working in the field.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Sync Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Know when your offline assessments and photos are synced
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Offline Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Get alerted when you go offline so you know changes are being saved locally
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="sm:order-1"
              >
                <BellOff className="h-4 w-4 mr-2" />
                Not Now
              </Button>
              <Button
                onClick={handleEnable}
                disabled={isRequesting}
                className="sm:order-2"
              >
                {isRequesting ? (
                  <>
                    <span className="animate-pulse">Requesting...</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Notifications
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
