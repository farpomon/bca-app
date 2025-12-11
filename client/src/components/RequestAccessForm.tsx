import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface RequestAccessFormProps {
  userOpenId: string;
  userName?: string | null;
  userEmail?: string | null;
  onSuccess: () => void;
}

export default function RequestAccessForm({ userOpenId, userName, userEmail, onSuccess }: RequestAccessFormProps) {
  const [formData, setFormData] = useState({
    fullName: userName || "",
    email: userEmail || "",
    companyName: "",
    city: "",
    phoneNumber: "",
    useCase: "",
  });

  const submitMutation = trpc.accessRequests.submit.useMutation({
    onSuccess: () => {
      toast.success("Access request submitted successfully!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit access request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.companyName || !formData.city) {
      toast.error("Please fill in all required fields");
      return;
    }

    submitMutation.mutate({
      openId: userOpenId,
      fullName: formData.fullName,
      email: formData.email,
      companyName: formData.companyName,
      city: formData.city,
      phoneNumber: formData.phoneNumber || undefined,
      useCase: formData.useCase || undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Request Access</CardTitle>
          <CardDescription>
            Please provide your information to request access to the Building Condition Assessment System. An
            administrator will review your request within 24-48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  City/Location <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York, NY"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="useCase">Reason for Access (Optional)</Label>
              <Textarea
                id="useCase"
                value={formData.useCase}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                placeholder="Tell us why you need access to the system..."
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitMutation.isPending} className="flex-1">
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
