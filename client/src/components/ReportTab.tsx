import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, Download, CheckCircle, Settings2, History, FileSpreadsheet, FileType } from "lucide-react";
import { toast } from "sonner";
import { CustomReportBuilder } from "./CustomReportBuilder";

interface ReportTabProps {
  projectId: number;
  projectName?: string;
}

export default function ReportTab({ projectId, projectName = "Project" }: ReportTabProps) {
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("standard");

  const generateReport = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Report generated successfully");
      setGeneratedReportUrl(data.url);
    },
    onError: (error) => {
      toast.error("Failed to generate report: " + error.message);
    },
  });

  const handleGenerate = () => {
    generateReport.mutate({ projectId });
  };

  const handleDownload = () => {
    if (generatedReportUrl) {
      window.open(generatedReportUrl, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Standard Report
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Custom Report Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard">
          <Card>
            <CardHeader>
              <CardTitle>Generate BCA Report</CardTitle>
              <CardDescription>
                Create a comprehensive Building Condition Assessment report following ASTM E2018-15 standards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">Report Contents</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Executive Summary with key metrics</li>
                    <li>Building Information and property details</li>
                    <li>Assessment Summary by condition rating</li>
                    <li>Deficiencies organized by priority</li>
                    <li>Cost Summary and breakdown by timeline</li>
                    <li>Professional formatting following industry standards</li>
                  </ul>
                </div>

                {!generatedReportUrl ? (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-6">
                      Generate a professional PDF report with all assessment data, deficiencies, and cost estimates
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
                        Your Building Condition Assessment report is ready to download
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
                  summaries, and detailed breakdowns. It follows the structure outlined in ASTM E2018-15 
                  standards for property condition assessments.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Custom Report Builder
              </CardTitle>
              <CardDescription>
                Create customized reports with your choice of sections, formats, and styling. 
                Export to PDF, Word, Excel, or HTML.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <FileText className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">PDF Export</h4>
                    <p className="text-xs text-muted-foreground">Professional formatted documents</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <FileType className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Word Export</h4>
                    <p className="text-xs text-muted-foreground">Editable .docx documents</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Excel Export</h4>
                    <p className="text-xs text-muted-foreground">Data-focused spreadsheets</p>
                  </div>
                </div>
              </div>
              
              <CustomReportBuilder projectId={projectId} projectName={projectName} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
