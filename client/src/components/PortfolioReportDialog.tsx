/**
 * Portfolio Report Dialog
 * 
 * Generates and displays portfolio-level reports with industry-standard
 * financial metrics across all assets in a project.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileBarChart,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Download,
  Loader2,
  Info,
  LucideIcon
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PortfolioReportDialogProps {
  projectId: number;
  projectName: string;
  trigger?: React.ReactNode;
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Format percentage
const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Get FCI color based on value
const getFCIColor = (fci: number): string => {
  if (fci <= 5) return 'text-green-600 bg-green-100';
  if (fci <= 10) return 'text-yellow-600 bg-yellow-100';
  if (fci <= 30) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
};

// Get condition color
const getConditionColor = (rating: string): string => {
  switch (rating.toLowerCase()) {
    case 'good': return 'text-green-600 bg-green-100';
    case 'fair': return 'text-yellow-600 bg-yellow-100';
    case 'poor': return 'text-orange-600 bg-orange-100';
    case 'critical': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

// Get priority label
const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'immediate': return 'Immediate (0-1 year)';
    case 'short_term': return 'Short Term (1-3 years)';
    case 'medium_term': return 'Medium Term (3-5 years)';
    case 'long_term': return 'Long Term (5+ years)';
    default: return priority;
  }
};

// FCI Gauge Component
function FCIGauge({ fci, rating }: { fci: number; rating: string }) {
  const gaugeValue = Math.min(fci, 50); // Cap at 50% for visual
  const percentage = (gaugeValue / 50) * 100;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500 rounded-t-full opacity-20" />
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-16 bg-gray-800 origin-bottom transform -translate-x-1/2"
          style={{ transform: `translateX(-50%) rotate(${(percentage - 50) * 1.8}deg)` }}
        />
      </div>
      <div className="text-3xl font-bold mt-2">{formatPercentage(fci, 2)}</div>
      <Badge className={getFCIColor(fci)}>{rating}</Badge>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  tooltip 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: LucideIcon;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function PortfolioReportDialog({ projectId, projectName, trigger }: PortfolioReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  
  const generateReport = trpc.portfolioReport.generate.useMutation();
  
  const handleGenerate = () => {
    generateReport.mutate({ projectId });
  };
  
  const report = generateReport.data;
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen && !report) {
        handleGenerate();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            Portfolio Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Portfolio Report: {projectName}
          </DialogTitle>
          <DialogDescription>
            Comprehensive financial metrics and condition analysis across all assets
          </DialogDescription>
        </DialogHeader>
        
        {generateReport.isPending ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Generating portfolio report...</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        ) : generateReport.isError ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to generate report</p>
            <p className="text-sm text-muted-foreground mt-2">
              {generateReport.error?.message || 'An error occurred'}
            </p>
            <Button onClick={handleGenerate} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : report ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="priorities">Priorities</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-6">
              {/* Executive Summary */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Facility Condition Index (FCI)</CardTitle>
                    <CardDescription>
                      Industry-standard metric measuring deferred maintenance relative to replacement value
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <FCIGauge fci={report.summary.portfolioFCI} rating={report.summary.portfolioFCIRating} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>FCI Rating Scale</CardTitle>
                    <CardDescription>Industry-standard condition categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>0-5%</span>
                        <Badge className="bg-green-100 text-green-800">Good</Badge>
                        <span className="text-muted-foreground">Minimal wear, routine maintenance</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>5-10%</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>
                        <span className="text-muted-foreground">Some wear, repairs needed</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>10-30%</span>
                        <Badge className="bg-orange-100 text-orange-800">Poor</Badge>
                        <span className="text-muted-foreground">Significant deterioration</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>&gt;30%</span>
                        <Badge className="bg-red-100 text-red-800">Critical</Badge>
                        <span className="text-muted-foreground">Serious disrepair</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  title="Total Assets"
                  value={report.summary.totalAssets}
                  icon={Building2}
                  tooltip="Number of buildings/assets in this portfolio"
                />
                <MetricCard
                  title="Current Replacement Value"
                  value={formatCurrency(report.summary.totalCurrentReplacementValue)}
                  icon={DollarSign}
                  tooltip="Total cost to replace all assets at current market rates"
                />
                <MetricCard
                  title="Deferred Maintenance"
                  value={formatCurrency(report.summary.totalDeferredMaintenanceCost)}
                  subtitle="Total backlog"
                  icon={AlertTriangle}
                  tooltip="Total cost of all identified maintenance and repair needs"
                />
                <MetricCard
                  title="Average Asset Age"
                  value={`${report.summary.averageAssetAge} years`}
                  icon={Calendar}
                  tooltip="Average age of assets in the portfolio"
                />
              </div>
              
              {/* Additional Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  title="Total Assessments"
                  value={report.summary.totalAssessments}
                  icon={FileBarChart}
                />
                <MetricCard
                  title="Total Deficiencies"
                  value={report.summary.totalDeficiencies}
                  icon={AlertTriangle}
                />
                <MetricCard
                  title="Average Condition"
                  value={report.summary.averageConditionRating}
                  subtitle={`Score: ${report.summary.averageConditionScore}/100`}
                  icon={TrendingUp}
                />
              </div>
              
              {/* Report Info */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Report generated on {new Date(report.generatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Assets Tab */}
            <TabsContent value="assets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Comparison</CardTitle>
                  <CardDescription>
                    All assets ranked by priority score (higher = more urgent attention needed)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset Name</TableHead>
                        <TableHead className="text-right">CRV</TableHead>
                        <TableHead className="text-right">Deferred Maint.</TableHead>
                        <TableHead className="text-right">FCI</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.assetMetrics.map((asset) => (
                        <TableRow key={asset.assetId}>
                          <TableCell className="font-medium">
                            <div>
                              {asset.assetName}
                              {asset.yearBuilt && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({asset.yearBuilt})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(asset.currentReplacementValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(asset.deferredMaintenanceCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={getFCIColor(asset.fci)}>
                              {formatPercentage(asset.fci, 1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getConditionColor(asset.conditionRating)}>
                              {asset.conditionRating}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={asset.priorityScore} className="w-16 h-2" />
                              <span className="text-sm font-medium w-8">{asset.priorityScore}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>UNIFORMAT II Category Breakdown</CardTitle>
                  <CardDescription>
                    Costs and conditions grouped by building system category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Assessments</TableHead>
                        <TableHead className="text-right">Repair Cost</TableHead>
                        <TableHead className="text-right">Replacement Value</TableHead>
                        <TableHead className="text-right">FCI</TableHead>
                        <TableHead className="text-right">Avg Condition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.categoryBreakdown.map((category) => (
                        <TableRow key={category.categoryCode}>
                          <TableCell className="font-medium">
                            <span className="text-muted-foreground mr-2">{category.categoryCode}</span>
                            {category.category}
                          </TableCell>
                          <TableCell className="text-right">{category.assessmentCount}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(category.totalRepairCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(category.totalReplacementValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={getFCIColor(category.fci)}>
                              {formatPercentage(category.fci, 1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{category.averageCondition}/100</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Priorities Tab */}
            <TabsContent value="priorities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Repair Priority Matrix</CardTitle>
                  <CardDescription>
                    Deficiencies grouped by urgency level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {report.priorityMatrix.map((priority) => (
                      <Card key={priority.priority} className="border-l-4" style={{
                        borderLeftColor: priority.priority === 'immediate' ? '#ef4444' :
                          priority.priority === 'short_term' ? '#f97316' :
                          priority.priority === 'medium_term' ? '#eab308' : '#22c55e'
                      }}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{getPriorityLabel(priority.priority)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(priority.totalCost)}</div>
                          <div className="text-sm text-muted-foreground">
                            {priority.count} items ({formatPercentage(priority.percentageOfTotal, 0)} of total)
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Top Priority Items */}
                  <div className="space-y-4">
                    {report.priorityMatrix
                      .filter(p => p.items.length > 0)
                      .slice(0, 2)
                      .map((priority) => (
                        <div key={priority.priority}>
                          <h4 className="font-medium mb-2">{getPriorityLabel(priority.priority)} - Top Items</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Component</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Est. Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {priority.items.slice(0, 5).map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.assetName}</TableCell>
                                  <TableCell>{item.componentName}</TableCell>
                                  <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.estimatedCost)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Forecast Tab */}
            <TabsContent value="forecast" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>5-Year Capital Renewal Forecast</CardTitle>
                  <CardDescription>
                    Projected capital expenditure requirements based on priority timelines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Immediate</TableHead>
                        <TableHead className="text-right">Short Term</TableHead>
                        <TableHead className="text-right">Medium Term</TableHead>
                        <TableHead className="text-right">Long Term</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Cumulative</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.capitalForecast.map((year) => (
                        <TableRow key={year.year}>
                          <TableCell className="font-medium">{year.year}</TableCell>
                          <TableCell className="text-right">
                            {year.immediateNeeds > 0 ? formatCurrency(year.immediateNeeds) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {year.shortTermNeeds > 0 ? formatCurrency(year.shortTermNeeds) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {year.mediumTermNeeds > 0 ? formatCurrency(year.mediumTermNeeds) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {year.longTermNeeds > 0 ? formatCurrency(year.longTermNeeds) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(year.totalProjectedCost)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(year.cumulativeCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Visual Bar Chart */}
                  <div className="mt-6 space-y-2">
                    <h4 className="font-medium">Annual Expenditure Projection</h4>
                    {report.capitalForecast.map((year) => {
                      const maxCost = Math.max(...report.capitalForecast.map(y => y.totalProjectedCost));
                      const percentage = maxCost > 0 ? (year.totalProjectedCost / maxCost) * 100 : 0;
                      return (
                        <div key={year.year} className="flex items-center gap-4">
                          <span className="w-12 text-sm font-medium">{year.year}</span>
                          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-28 text-sm text-right">{formatCurrency(year.totalProjectedCost)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Methodology Note */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Methodology Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>FCI (Facility Condition Index)</strong> = (Deferred Maintenance Cost / Current Replacement Value) × 100
                  </p>
                  <p>
                    <strong>Priority Score</strong> is calculated based on FCI (40%), immediate needs ratio (25%), 
                    asset age (20%), and deficiency count (15%).
                  </p>
                  <p>
                    <strong>Capital Forecast</strong> distributes costs based on priority timelines: immediate needs 
                    in Year 1, short-term over Years 1-3, medium-term over Years 3-5, and long-term in Years 4-5.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
        
        {/* Action Buttons */}
        {report && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleGenerate} disabled={generateReport.isPending}>
              {generateReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Refresh Report
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF (Coming Soon)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
