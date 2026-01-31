/**
 * Report Preview Panel
 * 
 * Displays a live preview of how the report will look based on current configuration.
 * Shows sample sections with actual data to help users understand the output.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Building2, 
  LayoutGrid, 
  ListChecks, 
  TrendingUp, 
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for preview data
interface PreviewComponentData {
  id: number;
  uniformatCode: string;
  componentName: string;
  assetName: string;
  condition: string;
  repairCost: number | null;
  replacementCost: number | null;
  actionYear: number | null;
  priority: string;
  photos: Array<{ url: string; caption: string | null }>;
  recommendations: string | null;
}

interface PreviewAssetData {
  id: number;
  name: string;
  fci: number;
  fciRating: string;
  crv: number;
  deferredMaintenance: number;
}

interface PreviewActionItem {
  id: string;
  actionName: string;
  assetName: string;
  uniformatCode: string;
  actionYear: number | null;
  cost: number | null;
  priority: string;
}

interface ReportPreviewConfig {
  reportTitle: string;
  preparedBy: string;
  preparedFor: string;
  projectName: string;
  clientName: string;
  
  // Section toggles
  includeExecutiveSummary: boolean;
  includeAssetOverview: boolean;
  includeComponentAssessments: boolean;
  includeActionList: boolean;
  includeCapitalForecast: boolean;
  includeUniformatBreakdown: boolean;
  
  // Component options
  includePhotos: boolean;
  maxPhotosPerComponent: number;
  showCostFields: boolean;
  showActionDetails: boolean;
  displayLevel: 'L2' | 'L3' | 'both';
}

interface ReportPreviewPanelProps {
  config: ReportPreviewConfig;
  summary?: {
    totalAssets: number;
    portfolioFCI: number;
    portfolioFCIRating: string;
    totalCRV: number;
    totalDeferredMaintenance: number;
    fundingGap: number;
  };
  sampleAssets?: PreviewAssetData[];
  sampleComponents?: PreviewComponentData[];
  sampleActions?: PreviewActionItem[];
  estimatedPages: number;
  isLoading?: boolean;
}

// Format currency
const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Format percentage
const formatPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(1)}%`;
};

// Get condition badge variant
const getConditionVariant = (condition: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (condition?.toLowerCase()) {
    case 'good': return 'default';
    case 'fair': return 'secondary';
    case 'poor': return 'destructive';
    case 'failed': return 'destructive';
    default: return 'outline';
  }
};

// Get FCI color class
const getFCIColorClass = (fci: number): string => {
  if (fci <= 5) return 'text-green-600';
  if (fci <= 10) return 'text-yellow-600';
  if (fci <= 30) return 'text-orange-600';
  return 'text-red-600';
};

export function ReportPreviewPanel({
  config,
  summary,
  sampleAssets = [],
  sampleComponents = [],
  sampleActions = [],
  estimatedPages,
  isLoading = false
}: ReportPreviewPanelProps) {
  const [activeTab, setActiveTab] = useState('cover');

  // Determine which tabs to show based on config
  const availableTabs = useMemo(() => {
    const tabs = [{ id: 'cover', label: 'Cover', icon: FileText }];
    
    if (config.includeExecutiveSummary) {
      tabs.push({ id: 'summary', label: 'Summary', icon: LayoutGrid });
    }
    if (config.includeAssetOverview) {
      tabs.push({ id: 'assets', label: 'Assets', icon: Building2 });
    }
    if (config.includeComponentAssessments) {
      tabs.push({ id: 'components', label: 'Components', icon: ListChecks });
    }
    if (config.includeActionList) {
      tabs.push({ id: 'actions', label: 'Actions', icon: Clock });
    }
    if (config.includeCapitalForecast) {
      tabs.push({ id: 'forecast', label: 'Forecast', icon: TrendingUp });
    }
    
    return tabs;
  }, [config]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p>Loading preview data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Preview
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            ~{estimatedPages} pages
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Preview how your report will look based on current settings
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-4 mb-2 flex-shrink-0 h-auto flex-wrap justify-start gap-1">
            {availableTabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="text-xs px-2 py-1 h-7"
              >
                <tab.icon className="h-3 w-3 mr-1" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1 px-4 pb-4">
            {/* Cover Page Preview */}
            <TabsContent value="cover" className="mt-0">
              <div className="bg-gradient-to-b from-primary to-primary/80 rounded-lg p-6 text-white mb-4">
                <h2 className="text-xl font-bold text-center mb-2">
                  Building Condition Assessment Report
                </h2>
                <p className="text-center text-primary-foreground/80 text-sm">
                  {config.reportTitle || config.projectName || 'Project Name'}
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prepared For:</span>
                  <span className="font-medium">{config.preparedFor || config.clientName || 'Client Name'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prepared By:</span>
                  <span className="font-medium">{config.preparedBy || 'B3NMA'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report Date:</span>
                  <span className="font-medium">{new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  B3NMA branding will appear in the PDF footer
                </p>
              </div>
            </TabsContent>

            {/* Executive Summary Preview */}
            <TabsContent value="summary" className="mt-0">
              <h3 className="font-semibold mb-3">Executive Summary</h3>
              
              {summary ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Portfolio FCI</p>
                    <p className={cn("text-xl font-bold", getFCIColorClass(summary.portfolioFCI))}>
                      {formatPercentage(summary.portfolioFCI)}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {summary.portfolioFCIRating}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Total Assets</p>
                    <p className="text-xl font-bold">{summary.totalAssets}</p>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Total CRV</p>
                    <p className="text-lg font-semibold">{formatCurrency(summary.totalCRV)}</p>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Deferred Maintenance</p>
                    <p className="text-lg font-semibold text-orange-600">{formatCurrency(summary.totalDeferredMaintenance)}</p>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">Funding Gap</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(summary.fundingGap)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No summary data available</p>
                </div>
              )}
            </TabsContent>

            {/* Asset Overview Preview */}
            <TabsContent value="assets" className="mt-0">
              <h3 className="font-semibold mb-3">Asset Portfolio Overview</h3>
              
              {sampleAssets.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <span>Asset</span>
                    <span className="text-right">CRV</span>
                    <span className="text-right">Deferred</span>
                    <span className="text-right">FCI</span>
                    <span className="text-center">Rating</span>
                  </div>
                  
                  {sampleAssets.slice(0, 5).map(asset => (
                    <div key={asset.id} className="grid grid-cols-5 gap-2 text-xs py-1.5 border-b border-dashed">
                      <span className="truncate font-medium">{asset.name}</span>
                      <span className="text-right">{formatCurrency(asset.crv)}</span>
                      <span className="text-right">{formatCurrency(asset.deferredMaintenance)}</span>
                      <span className={cn("text-right font-medium", getFCIColorClass(asset.fci))}>
                        {formatPercentage(asset.fci)}
                      </span>
                      <span className="text-center">
                        <Badge variant="outline" className="text-[10px] px-1">
                          {asset.fciRating}
                        </Badge>
                      </span>
                    </div>
                  ))}
                  
                  {sampleAssets.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {sampleAssets.length - 5} more assets in full report
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No asset data available</p>
                </div>
              )}
            </TabsContent>

            {/* Component Assessments Preview */}
            <TabsContent value="components" className="mt-0">
              <h3 className="font-semibold mb-3">Component Assessments</h3>
              
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  Display: {config.displayLevel === 'L2' ? 'Level 2 Summary' : config.displayLevel === 'L3' ? 'Level 3 Detail' : 'Both Levels'}
                </Badge>
                {config.includePhotos && (
                  <Badge variant="secondary" className="text-xs">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Max {config.maxPhotosPerComponent} photos
                  </Badge>
                )}
                {config.showCostFields && (
                  <Badge variant="secondary" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Cost fields
                  </Badge>
                )}
              </div>
              
              {sampleComponents.length > 0 ? (
                <div className="space-y-3">
                  {sampleComponents.slice(0, 3).map(component => (
                    <div key={component.id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{component.uniformatCode} - {component.componentName}</p>
                          <p className="text-xs text-muted-foreground">{component.assetName}</p>
                        </div>
                        <Badge variant={getConditionVariant(component.condition)} className="text-xs">
                          {component.condition}
                        </Badge>
                      </div>
                      
                      {config.showCostFields && (
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-muted-foreground">Repair: </span>
                            <span className="font-medium">{formatCurrency(component.repairCost)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Replace: </span>
                            <span className="font-medium">{formatCurrency(component.replacementCost)}</span>
                          </div>
                        </div>
                      )}
                      
                      {config.showActionDetails && component.recommendations && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {component.recommendations}
                        </p>
                      )}
                      
                      {config.includePhotos && component.photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {component.photos.slice(0, Math.min(config.maxPhotosPerComponent, 3)).map((photo, idx) => (
                            <div key={idx} className="w-12 h-9 bg-muted rounded overflow-hidden">
                              <img 
                                src={photo.url} 
                                alt={photo.caption || 'Component photo'} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                          {component.photos.length > 3 && (
                            <div className="w-12 h-9 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              +{component.photos.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {sampleComponents.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {sampleComponents.length - 3} more components in full report
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No component data available</p>
                </div>
              )}
            </TabsContent>

            {/* Action List Preview */}
            <TabsContent value="actions" className="mt-0">
              <h3 className="font-semibold mb-3">Action List Summary</h3>
              
              {sampleActions.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <span>ID</span>
                    <span>Action</span>
                    <span>Asset</span>
                    <span className="text-right">Year</span>
                    <span className="text-right">Cost</span>
                  </div>
                  
                  {sampleActions.slice(0, 5).map(action => (
                    <div key={action.id} className="grid grid-cols-5 gap-2 text-xs py-1.5 border-b border-dashed">
                      <span className="font-mono">{action.id}</span>
                      <span className="truncate">{action.actionName}</span>
                      <span className="truncate text-muted-foreground">{action.assetName}</span>
                      <span className="text-right">{action.actionYear || '-'}</span>
                      <span className="text-right font-medium">{formatCurrency(action.cost)}</span>
                    </div>
                  ))}
                  
                  {sampleActions.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {sampleActions.length - 5} more actions in full report
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No action data available</p>
                </div>
              )}
            </TabsContent>

            {/* Capital Forecast Preview */}
            <TabsContent value="forecast" className="mt-0">
              <h3 className="font-semibold mb-3">5-Year Capital Forecast</h3>
              
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="space-y-3">
                  {[2026, 2027, 2028, 2029, 2030].map((year, idx) => (
                    <div key={year} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{year}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${Math.max(20, 100 - idx * 15)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        {formatCurrency(500000 - idx * 75000)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">5-Year Total:</span>
                  <span className="font-bold">{formatCurrency(1750000)}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Actual values will be calculated from your portfolio data
              </p>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ReportPreviewPanel;
