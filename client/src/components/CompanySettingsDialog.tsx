import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, Shield, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyLockSettings } from "./PrivacyLockSettings";

interface CompanySettingsDialogProps {
  companyId: number | null;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CompanySettingsDialog({
  companyId,
  companyName,
  open,
  onOpenChange,
  onSuccess,
}: CompanySettingsDialogProps) {
  const [settings, setSettings] = useState({
    defaultTrialDuration: 14,
    mfaRequired: false,
    maxUsers: 100,
    featureAccess: {
      aiImport: true,
      offlineMode: true,
      advancedReports: true,
      bulkOperations: true,
    },
  });

  const settingsQuery = trpc.admin.getCompanySettings.useQuery(
    { id: companyId! },
    { enabled: !!companyId && open }
  );

  const updateSettingsMutation = trpc.admin.updateCompanySettings.useMutation({
    onSuccess: () => {
      toast.success("Company settings updated successfully");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings({
        defaultTrialDuration: settingsQuery.data.defaultTrialDuration,
        mfaRequired: settingsQuery.data.mfaRequired,
        maxUsers: settingsQuery.data.maxUsers,
        featureAccess: settingsQuery.data.featureAccess,
      });
    }
  }, [settingsQuery.data]);

  const handleSave = () => {
    if (!companyId) return;
    updateSettingsMutation.mutate({
      id: companyId,
      defaultTrialDuration: settings.defaultTrialDuration,
      mfaRequired: settings.mfaRequired,
      maxUsers: settings.maxUsers,
      featureAccess: settings.featureAccess,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Company Settings - {companyName}
          </DialogTitle>
          <DialogDescription>
            Configure default settings for this company.
          </DialogDescription>
        </DialogHeader>

        {settingsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Settings
                </CardTitle>
                <CardDescription>Configure default settings for new users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Trial Duration (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={settings.defaultTrialDuration}
                      onChange={(e) =>
                        setSettings({ ...settings, defaultTrialDuration: parseInt(e.target.value) || 14 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Users</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={settings.maxUsers}
                      onChange={(e) =>
                        setSettings({ ...settings, maxUsers: parseInt(e.target.value) || 100 })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require MFA for All Users</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, all users must set up MFA
                    </p>
                  </div>
                  <Switch
                    checked={settings.mfaRequired}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, mfaRequired: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {companyId && (
              <PrivacyLockSettings companyId={companyId} companyName={companyName} />
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Feature Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>AI Document Import</Label>
                  <Switch
                    checked={settings.featureAccess.aiImport}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        featureAccess: { ...settings.featureAccess, aiImport: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Offline Mode</Label>
                  <Switch
                    checked={settings.featureAccess.offlineMode}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        featureAccess: { ...settings.featureAccess, offlineMode: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Advanced Reports</Label>
                  <Switch
                    checked={settings.featureAccess.advancedReports}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        featureAccess: { ...settings.featureAccess, advancedReports: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Bulk Operations</Label>
                  <Switch
                    checked={settings.featureAccess.bulkOperations}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        featureAccess: { ...settings.featureAccess, bulkOperations: checked },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending || settingsQuery.isLoading}
          >
            {updateSettingsMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
