import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ComplianceCheckButtonProps {
  assessmentId: number;
  projectId: number;
  onComplianceChecked?: () => void;
}

export function ComplianceCheckButton({
  assessmentId,
  projectId,
  onComplianceChecked,
}: ComplianceCheckButtonProps) {
  const [showResults, setShowResults] = useState(false);
  const [complianceResult, setComplianceResult] = useState<any>(null);

  const checkCompliance = (trpc.complianceCheck as any).checkAssessmentCompliance.useMutation({
    onSuccess: (data: any) => {
      setComplianceResult(data);
      setShowResults(true);
      toast.success("Compliance check completed");
      onComplianceChecked?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to check compliance");
    },
  });

  const handleCheck = () => {
    checkCompliance.mutate({ assessmentId });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "non_compliant":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "needs_review":
        return <HelpCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      compliant: { variant: "default", className: "bg-green-500" },
      non_compliant: { variant: "destructive" },
      needs_review: { variant: "secondary", className: "bg-yellow-500" },
    };
    const config = variants[status] || {};
    return (
      <Badge {...config}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      high: { variant: "destructive" },
      medium: { variant: "secondary", className: "bg-yellow-500" },
      low: { variant: "outline" },
    };
    const config = variants[severity] || {};
    return <Badge {...config}>{severity.toUpperCase()}</Badge>;
  };

  return (
    <>
      <Button
        onClick={handleCheck}
        disabled={checkCompliance.isPending}
        variant="outline"
        className="gap-2"
      >
        {checkCompliance.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Shield className="h-4 w-4" />
            Check Building Code Compliance
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {complianceResult && getStatusIcon(complianceResult.result.status)}
              Building Code Compliance Report
            </DialogTitle>
            <DialogDescription>
              Analysis against {complianceResult?.buildingCode?.title}
            </DialogDescription>
          </DialogHeader>

          {complianceResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(complianceResult.result.status)}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {complianceResult.result.summary}
                  </p>
                </CardContent>
              </Card>

              {complianceResult.result.issues && complianceResult.result.issues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Compliance Issues</h3>
                  {complianceResult.result.issues.map((issue: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-red-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{issue.codeSection}</CardTitle>
                          {getSeverityBadge(issue.severity)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">Issue:</p>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Recommendation:</p>
                          <p className="text-sm text-muted-foreground">{issue.recommendation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {complianceResult.result.issues && complianceResult.result.issues.length === 0 && (
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <p className="text-sm">
                        No compliance issues identified. This assessment appears to meet the requirements of {complianceResult.buildingCode.title}.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legal Disclaimer */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">
                    <strong>Disclaimer:</strong> This compliance check is provided for informational purposes only and does not constitute professional engineering advice, legal opinion, or official building code interpretation. The analysis is based on AI-assisted review and may not identify all compliance issues. Users should consult with licensed professionals (engineers, architects, code officials) and relevant authorities having jurisdiction for authoritative compliance determinations. The system operators assume no liability for decisions made based on this report.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
