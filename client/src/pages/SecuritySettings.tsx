import { MFASettings } from "@/components/MFASettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Bell, BellOff, TestTube } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { toast } from "sonner";

function NotificationSettings() {
  const {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  } = useNotificationPermission();

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === "granted") {
      toast.success("Notifications enabled!");
      // Send test notification
      setTimeout(() => {
        sendNotification("Test Notification", {
          body: "Notifications are working! You'll receive alerts for sync events.",
          tag: "test-notification",
        });
      }, 500);
    } else if (result === "denied") {
      toast.error("Notification permission denied. Please enable it in your browser settings.");
    }
  };

  const handleSendTest = () => {
    if (permission !== "granted") {
      toast.error("Please enable notifications first");
      return;
    }
    sendNotification("Test Notification", {
      body: "This is a test notification. You'll receive similar alerts for sync events and offline mode.",
      tag: "test-notification",
    });
    toast.success("Test notification sent! Check your notifications.");
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Browser notifications are not supported on this device
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Manage browser notifications for sync events and offline alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Notification Status</p>
            <p className="text-sm text-muted-foreground">
              {permission === "granted" && "Enabled - You'll receive notifications"}
              {permission === "denied" && "Blocked - Enable in browser settings"}
              {permission === "default" && "Not configured - Click to enable"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {permission === "granted" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTest}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleRequestPermission}
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable
              </Button>
            )}
          </div>
        </div>

        {permission === "granted" && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">You'll receive notifications for:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Sync completion (when offline data is uploaded)</li>
              <li>• Offline mode alerts (when connection is lost)</li>
              <li>• Sync errors (when data fails to upload)</li>
            </ul>
          </div>
        )}

        {permission === "denied" && (
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Notifications are blocked. To enable them:
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4 mt-2">
              <li>1. Click the lock icon in your browser's address bar</li>
              <li>2. Find "Notifications" in the permissions list</li>
              <li>3. Change it to "Allow"</li>
              <li>4. Refresh this page</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SecuritySettings() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <BackButton to="dashboard" />
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Security Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account security and authentication methods
          </p>
        </div>

        <MFASettings />

        <NotificationSettings />

        {/* Future: Add more security settings here */}
        {/* - Password change */}
        {/* - Active sessions */}
        {/* - Login history */}
      </div>
    </div>
  );
}
