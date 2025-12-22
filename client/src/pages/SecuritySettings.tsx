import { MFASettings } from "@/components/MFASettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function SecuritySettings() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Security Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account security and authentication methods
          </p>
        </div>

        <MFASettings />

        {/* Future: Add more security settings here */}
        {/* - Password change */}
        {/* - Active sessions */}
        {/* - Login history */}
      </div>
    </div>
  );
}
