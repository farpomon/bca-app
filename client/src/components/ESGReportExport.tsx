import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Download, 
  FileText, 
  Loader2, 
  Calendar as CalendarIcon,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ESGReportExportProps {
  projectId?: number;
  projectName?: string;
  className?: string;
}

export default function ESGReportExport({ projectId, projectName, className }: ESGReportExportProps) {
  const [open, setOpen] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  
  // Report options
  const [includePortfolioSummary, setIncludePortfolioSummary] = useState(true);
  const [includeAssetBreakdown, setIncludeAssetBreakdown] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeCertifications, setIncludeCertifications] = useState(true);
  const [includeImprovementActions, setIncludeImprovementActions] = useState(true);
  const [includeGoals, setIncludeGoals] = useState(true);
  
  // Date range
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const generateReport = trpc.esg.generateESGReport.useMutation({
    onSuccess: (data) => {
      setReportUrl(data.url);
      toast.success("ESG Report generated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    generateReport.mutate({
      projectId,
      includePortfolioSummary,
      includeAssetBreakdown,
      includeMetrics,
      includeCertifications,
      includeImprovementActions,
      includeGoals,
      reportPeriodStart: startDate,
      reportPeriodEnd: endDate,
    });
  };

  const handleDownload = () => {
    if (reportUrl) {
      window.open(reportUrl, "_blank");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setReportUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="w-4 h-4 mr-2" />
          Export ESG Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Export ESG Report
          </DialogTitle>
          <DialogDescription>
            {projectName 
              ? `Generate a PDF report for ${projectName}`
              : "Generate a portfolio-wide ESG compliance report"
            }
          </DialogDescription>
        </DialogHeader>

        {reportUrl ? (
          // Success state
          <div className="py-6 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Report Generated!</h3>
            <p className="text-muted-foreground mb-4">
              Your ESG compliance report is ready for download.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          // Configuration state
          <>
            <div className="space-y-6 py-4">
              {/* Report Period */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Report Period</Label>
                <div className="flex gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Report Sections */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Include Sections</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="portfolio"
                      checked={includePortfolioSummary}
                      onCheckedChange={(checked) => setIncludePortfolioSummary(!!checked)}
                    />
                    <Label htmlFor="portfolio" className="text-sm font-normal cursor-pointer">
                      Portfolio Summary
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="assets"
                      checked={includeAssetBreakdown}
                      onCheckedChange={(checked) => setIncludeAssetBreakdown(!!checked)}
                    />
                    <Label htmlFor="assets" className="text-sm font-normal cursor-pointer">
                      Project Breakdown
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="metrics"
                      checked={includeMetrics}
                      onCheckedChange={(checked) => setIncludeMetrics(!!checked)}
                    />
                    <Label htmlFor="metrics" className="text-sm font-normal cursor-pointer">
                      ESG Metrics
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="certs"
                      checked={includeCertifications}
                      onCheckedChange={(checked) => setIncludeCertifications(!!checked)}
                    />
                    <Label htmlFor="certs" className="text-sm font-normal cursor-pointer">
                      Certifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="actions"
                      checked={includeImprovementActions}
                      onCheckedChange={(checked) => setIncludeImprovementActions(!!checked)}
                    />
                    <Label htmlFor="actions" className="text-sm font-normal cursor-pointer">
                      Improvement Actions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="goals"
                      checked={includeGoals}
                      onCheckedChange={(checked) => setIncludeGoals(!!checked)}
                    />
                    <Label htmlFor="goals" className="text-sm font-normal cursor-pointer">
                      Sustainability Goals
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={generateReport.isPending}
              >
                {generateReport.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
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
