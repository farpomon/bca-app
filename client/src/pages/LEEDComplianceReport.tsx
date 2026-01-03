import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Award,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Printer,
  Calendar,
  Target,
  XCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";

// LEED certification thresholds
const LEED_THRESHOLDS = {
  certified: 40,
  silver: 50,
  gold: 60,
  platinum: 80,
};

// LEED categories
const LEED_CATEGORIES = [
  { code: "IP", name: "Integrative Process", maxPoints: 1, color: "#8b5cf6" },
  { code: "LT", name: "Location & Transportation", maxPoints: 16, color: "#3b82f6" },
  { code: "SS", name: "Sustainable Sites", maxPoints: 10, color: "#22c55e" },
  { code: "WE", name: "Water Efficiency", maxPoints: 11, color: "#06b6d4" },
  { code: "EA", name: "Energy & Atmosphere", maxPoints: 33, color: "#f59e0b" },
  { code: "MR", name: "Materials & Resources", maxPoints: 13, color: "#a855f7" },
  { code: "EQ", name: "Indoor Environmental Quality", maxPoints: 16, color: "#ec4899" },
  { code: "IN", name: "Innovation", maxPoints: 6, color: "#6366f1" },
  { code: "RP", name: "Regional Priority", maxPoints: 4, color: "#14b8a6" },
];

function getCertificationBadge(level: string) {
  switch (level) {
    case "Platinum":
      return <Badge className="bg-slate-700 text-white text-lg px-4 py-1">{level}</Badge>;
    case "Gold":
      return <Badge className="bg-amber-500 text-white text-lg px-4 py-1">{level}</Badge>;
    case "Silver":
      return <Badge className="bg-slate-400 text-white text-lg px-4 py-1">{level}</Badge>;
    case "Certified":
      return <Badge className="bg-emerald-600 text-white text-lg px-4 py-1">{level}</Badge>;
    default:
      return <Badge variant="outline" className="text-lg px-4 py-1">{level}</Badge>;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "achieved":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "in_progress":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "not_started":
      return <XCircle className="w-4 h-4 text-gray-400" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
}

function getDocStatusBadge(status: string) {
  switch (status) {
    case "complete":
      return <Badge className="bg-emerald-100 text-emerald-700">Complete</Badge>;
    case "in_progress":
      return <Badge className="bg-amber-100 text-amber-700">In Progress</Badge>;
    case "not_started":
      return <Badge variant="outline">Not Started</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function LEEDComplianceReport() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();

  // Fetch LEED compliance report data
  const { 
    data: reportData, 
    isLoading: reportLoading,
    refetch: refetchReport
  } = trpc.esgLeed.getLeedComplianceReportData.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  ) as any;

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!reportRef.current || !reportData) return;
    
    toast.info("Generating PDF report...");
    
    try {
      // Use browser print functionality for PDF
      const printContent = reportRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to generate PDF");
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LEED Compliance Report - ${reportData.project.name}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1f2937;
            }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            h3 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; }
            p { margin: 8px 0; font-size: 12px; }
            .header { text-align: center; margin-bottom: 32px; }
            .badge { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 4px; 
              font-weight: 600;
              font-size: 14px;
            }
            .badge-platinum { background: #374151; color: white; }
            .badge-gold { background: #f59e0b; color: white; }
            .badge-silver { background: #9ca3af; color: white; }
            .badge-certified { background: #059669; color: white; }
            .badge-not-certified { background: #e5e7eb; color: #374151; }
            .summary-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 16px; 
              margin: 16px 0;
            }
            .summary-card {
              border: 1px solid #e5e7eb;
              padding: 12px;
              border-radius: 8px;
              text-align: center;
            }
            .summary-value { font-size: 24px; font-weight: 700; }
            .summary-label { font-size: 11px; color: #6b7280; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 12px 0;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 8px; 
              text-align: left; 
            }
            th { background: #f9fafb; font-weight: 600; }
            .status-achieved { color: #059669; }
            .status-in-progress { color: #d97706; }
            .status-not-started { color: #9ca3af; }
            .progress-bar {
              height: 8px;
              background: #e5e7eb;
              border-radius: 4px;
              overflow: hidden;
            }
            .progress-fill {
              height: 100%;
              border-radius: 4px;
            }
            .footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              font-size: 10px;
              color: #9ca3af;
              text-align: center;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LEED v5 Compliance Report</h1>
            <p style="font-size: 16px; color: #6b7280;">${reportData.project.name}</p>
            <p style="font-size: 12px; color: #9ca3af;">Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <h2>Certification Summary</h2>
          <div style="text-align: center; margin: 24px 0;">
            <span class="badge badge-${reportData.summary.certificationLevel.toLowerCase().replace(' ', '-')}">
              ${reportData.summary.certificationLevel}
            </span>
            <p style="font-size: 32px; font-weight: 700; margin: 16px 0;">
              ${reportData.summary.totalAchieved} / ${reportData.summary.maxPossible} Points
            </p>
          </div>
          
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-value">${reportData.summary.totalAchieved}</div>
              <div class="summary-label">Points Achieved</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${reportData.summary.totalTargeted}</div>
              <div class="summary-label">Points Targeted</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${reportData.summary.prerequisitesMet}/${reportData.summary.prerequisitesTotal}</div>
              <div class="summary-label">Prerequisites Met</div>
            </div>
          </div>
          
          <h2>Project Information</h2>
          <table>
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Project Name</td><td>${reportData.project.name}</td></tr>
            <tr><td>Address</td><td>${reportData.project.address || 'N/A'}, ${reportData.project.city || ''}</td></tr>
            <tr><td>Province</td><td>${reportData.project.province || 'N/A'}</td></tr>
            <tr><td>Year Built</td><td>${reportData.project.yearBuilt || 'N/A'}</td></tr>
            <tr><td>Property Type</td><td>${reportData.project.propertyType || 'N/A'}</td></tr>
          </table>
          
          <h2>Credit Summary by Category</h2>
          ${Object.entries(reportData.byCategory).map(([cat, data]: [string, any]) => {
            const catInfo = LEED_CATEGORIES.find(c => c.code === cat);
            return `
              <h3>${cat} - ${catInfo?.name || cat}</h3>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${(data.achieved / (catInfo?.maxPoints || 1)) * 100}%; background: ${catInfo?.color || '#6b7280'};"></div>
              </div>
              <p>${data.achieved} / ${catInfo?.maxPoints || data.maxPoints} points achieved</p>
            `;
          }).join('')}
          
          <h2>Action Items</h2>
          ${reportData.actionItems.length > 0 ? `
            <table>
              <tr>
                <th>Credit</th>
                <th>Category</th>
                <th>Status</th>
                <th>Documentation</th>
                <th>Max Points</th>
              </tr>
              ${reportData.actionItems.map((item: any) => `
                <tr>
                  <td>${item.creditCode} - ${item.creditName}</td>
                  <td>${item.category}</td>
                  <td class="status-${item.status.replace('_', '-')}">${item.status.replace('_', ' ')}</td>
                  <td>${item.documentationStatus}</td>
                  <td>${item.maxPoints}</td>
                </tr>
              `).join('')}
            </table>
          ` : '<p>No pending action items.</p>'}
          
          <div class="footer">
            <p>This report is generated based on LEED v5 BD+C rating system requirements.</p>
            <p>Report generated by Building Condition Assessment System</p>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        toast.success("PDF report generated successfully");
      }, 500);
      
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF report");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-8 h-8 text-emerald-500" />
              LEED Compliance Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate exportable LEED v5 credit status and documentation reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedProject?.toString() || ""}
              onValueChange={(value) => setSelectedProject(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reportData && (
              <Button onClick={handleExportPDF} className="gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            )}
          </div>
        </div>

        {!selectedProject ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Project</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Choose a project to generate a comprehensive LEED v5 compliance report 
                with certification status, credit tracking, and documentation requirements.
              </p>
            </CardContent>
          </Card>
        ) : reportLoading ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Generating compliance report...</p>
            </CardContent>
          </Card>
        ) : reportData ? (
          <div ref={reportRef} className="space-y-6">
            {/* Certification Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-500" />
                  Certification Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Projected Certification</p>
                    {getCertificationBadge(reportData.summary.certificationLevel)}
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold">
                      {reportData.summary.totalAchieved}
                      <span className="text-lg font-normal text-muted-foreground"> / {reportData.summary.maxPossible}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">Points Achieved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{reportData.summary.totalTargeted}</p>
                    <p className="text-sm text-muted-foreground">Points Targeted</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      {reportData.summary.allPrerequisitesMet ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      <span className="text-2xl font-bold">
                        {reportData.summary.prerequisitesMet}/{reportData.summary.prerequisitesTotal}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Prerequisites Met</p>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                {/* Progress to next level */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress to Certification</span>
                    <span>{reportData.summary.totalAchieved} / 110 points</span>
                  </div>
                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(reportData.summary.totalAchieved / 110) * 100}%` }}
                    />
                    {/* Threshold markers */}
                    <div className="absolute top-0 h-full w-0.5 bg-gray-400" style={{ left: `${(40/110)*100}%` }} title="Certified (40)" />
                    <div className="absolute top-0 h-full w-0.5 bg-gray-400" style={{ left: `${(50/110)*100}%` }} title="Silver (50)" />
                    <div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: `${(60/110)*100}%` }} title="Gold (60)" />
                    <div className="absolute top-0 h-full w-0.5 bg-slate-600" style={{ left: `${(80/110)*100}%` }} title="Platinum (80)" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span>Certified</span>
                    <span>Silver</span>
                    <span>Gold</span>
                    <span>Platinum</span>
                    <span>110</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Project Name</p>
                    <p className="font-medium">{reportData.project.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{reportData.project.address || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">City / Province</p>
                    <p className="font-medium">
                      {reportData.project.city || "N/A"}, {reportData.project.province || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year Built</p>
                    <p className="font-medium">{reportData.project.yearBuilt || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium capitalize">{reportData.project.propertyType || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Construction Type</p>
                    <p className="font-medium capitalize">{reportData.project.constructionType || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Report Generated</p>
                    <p className="font-medium">{new Date(reportData.generatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Summary by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Credit Summary by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {LEED_CATEGORIES.map((cat) => {
                    const data = reportData.byCategory[cat.code];
                    if (!data) return null;
                    
                    const isExpanded = expandedCategory === cat.code;
                    
                    return (
                      <div key={cat.code} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedCategory(isExpanded ? null : cat.code)}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-medium">{cat.code} - {cat.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32">
                              <Progress 
                                value={(data.achieved / cat.maxPoints) * 100}
                                className="h-2"
                              />
                            </div>
                            <span className="font-bold w-16 text-right">
                              {data.achieved} / {cat.maxPoints}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t p-4 bg-muted/20">
                            {/* Prerequisites */}
                            {data.prerequisites && data.prerequisites.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2">Prerequisites</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Credit</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Documentation</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {data.prerequisites.map((prereq: any, idx: number) => (
                                      <TableRow key={idx}>
                                        <TableCell>
                                          <span className="font-medium">{prereq.creditCode}</span>
                                          <span className="text-muted-foreground ml-2">{prereq.creditName}</span>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            {getStatusIcon(prereq.status)}
                                            <span className="capitalize">{prereq.status?.replace('_', ' ')}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {getDocStatusBadge(prereq.documentationStatus)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                            
                            {/* Credits */}
                            {data.credits && data.credits.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Credits</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Credit</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Points</TableHead>
                                      <TableHead>Documentation</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {data.credits.map((credit: any, idx: number) => (
                                      <TableRow key={idx}>
                                        <TableCell>
                                          <span className="font-medium">{credit.creditCode}</span>
                                          <span className="text-muted-foreground ml-2">{credit.creditName}</span>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            {getStatusIcon(credit.status)}
                                            <span className="capitalize">{credit.status?.replace('_', ' ')}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <span className="font-bold">{credit.pointsAchieved || 0}</span>
                                          <span className="text-muted-foreground"> / {credit.maxPoints}</span>
                                        </TableCell>
                                        <TableCell>
                                          {getDocStatusBadge(credit.documentationStatus)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            {reportData.actionItems && reportData.actionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Action Items ({reportData.actionItems.length})
                  </CardTitle>
                  <CardDescription>
                    Credits requiring attention to achieve targeted certification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credit</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Documentation</TableHead>
                        <TableHead>Max Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.actionItems.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.creditCode}</span>
                              <p className="text-sm text-muted-foreground">{item.creditName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              <span className="capitalize">{item.status?.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getDocStatusBadge(item.documentationStatus)}
                          </TableCell>
                          <TableCell className="font-bold">{item.maxPoints}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Documentation Status Summary */}
            {reportData.documentationStatus && reportData.documentationStatus.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documentation Status Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {reportData.documentationStatus.map((status: any, idx: number) => (
                      <div key={idx} className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold">{status.count}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {status.documentationStatus?.replace('_', ' ') || 'Unknown'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Report Footer */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Report generated: {new Date(reportData.generatedAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span>LEED v5 BD+C Rating System</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
              <p className="text-muted-foreground">
                No LEED tracking data found for this project. Initialize LEED tracking first.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
