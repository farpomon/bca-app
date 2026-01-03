import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface AssetReportTabProps {
  assetId: number;
  projectId: number;
}

export default function AssetReportTab({ assetId, projectId }: AssetReportTabProps) {
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);

  const generateReport = trpc.reports.generateAsset.useMutation({
    onSuccess: (data) => {
      toast.success("Asset report generated successfully");
      setGeneratedReportUrl(data.url);
    },
    onError: (error) => {
      toast.error("Failed to generate report: " + error.message);
    },
  });

  const handleGenerate = () => {
    generateReport.mutate({ assetId, projectId });
  };

  const handleDownload = () => {
    if (generatedReportUrl) {
      window.open(generatedReportUrl, "_blank");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Reports</CardTitle>
        <CardDescription>
          Generate customized reports for this asset
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Report Contents</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Asset overview and building information</li>
              <li>Assessment summary with condition ratings</li>
              <li>Detailed assessment findings with <strong>repair costs</strong> and <strong>replacement values</strong></li>
              <li>Deficiencies organized by priority and timeline</li>
              <li><strong>Financial Analysis Section:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>Net Present Value (NPV)</li>
                  <li>Internal Rate of Return (IRR)</li>
                  <li>Payback Period</li>
                  <li>Return on Investment (ROI)</li>
                  <li>Facility Condition Index (FCI)</li>
                </ul>
              </li>
              <li>5-Year Capital Budget Projection</li>
              <li>Cost breakdown by priority level</li>
              <li>Professional formatting following industry standards</li>
            </ul>
          </div>

          {!generatedReportUrl ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-6">
                Generate a professional PDF report with all assessment data, deficiencies, and cost estimates for this asset
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generateReport.isPending}
                size="lg"
              >
                {generateReport.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                <FileText className="mr-2 h-5 w-5" />
                Generate PDF Report
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Report Generated Successfully</h3>
                <p className="text-muted-foreground mb-6">
                  Your asset condition report is ready to download
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleDownload} size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Download Report
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generateReport.isPending}
                >
                  {generateReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Report Format</h4>
          <p className="text-sm text-muted-foreground">
            The report is generated in PDF format and includes professional formatting with tables, 
            summaries, and detailed breakdowns. It provides a comprehensive overview of this specific 
            asset's condition, assessments, and required maintenance actions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
