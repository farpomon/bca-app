import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Copy,
  Download,
  Settings,
  GripVertical,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileType,
  Globe,
  Loader2,
  Eye,
  Save,
} from "lucide-react";

interface CustomReportBuilderProps {
  projectId: number;
  projectName: string;
  onClose?: () => void;
}

type SectionType = 
  | 'narrative'
  | 'data_table'
  | 'chart'
  | 'photo_gallery'
  | 'cost_summary'
  | 'executive_summary'
  | 'condition_summary'
  | 'deficiencies_list'
  | 'component_details'
  | 'risk_assessment'
  | 'recommendations'
  | 'appendix';

type ReportType = 
  | 'executive_summary'
  | 'detailed_assessment'
  | 'financial_analysis'
  | 'compliance'
  | 'risk_assessment'
  | 'optimization_results'
  | 'custom';

interface ReportSection {
  id?: number;
  sectionName: string;
  sectionType: SectionType;
  displayOrder: number;
  content?: string;
  isRequired?: boolean;
}

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  narrative: "Narrative Text",
  data_table: "Data Table",
  chart: "Chart/Graph",
  photo_gallery: "Photo Gallery",
  cost_summary: "Cost Summary",
  executive_summary: "Executive Summary",
  condition_summary: "Condition Summary",
  deficiencies_list: "Deficiencies List",
  component_details: "Component Details",
  risk_assessment: "Risk Assessment",
  recommendations: "Recommendations",
  appendix: "Appendix",
};

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  executive_summary: "Executive Summary",
  detailed_assessment: "Detailed Assessment",
  financial_analysis: "Financial Analysis",
  compliance: "Compliance Report",
  risk_assessment: "Risk Assessment",
  optimization_results: "Optimization Results",
  custom: "Custom Report",
};

export function CustomReportBuilder({ projectId, projectName, onClose }: CustomReportBuilderProps) {
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "word" | "html">("pdf");
  
  // New template form state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<ReportType>("custom");
  const [sections, setSections] = useState<ReportSection[]>([]);
  
  // Report generation state
  const [reportName, setReportName] = useState(`${projectName} - Report`);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);

  // Queries
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = 
    trpc.customReports.templates.list.useQuery({ projectId });
  
  const { data: defaultTemplates } = trpc.customReports.getDefaultTemplates.useQuery();
  
  const { data: selectedTemplateData, isLoading: templateLoading } = 
    trpc.customReports.templates.get.useQuery(
      { id: selectedTemplate! },
      { enabled: !!selectedTemplate }
    );

  const { data: generatedReports, refetch: refetchReports } = 
    trpc.customReports.generated.list.useQuery({ projectId, limit: 20 });

  // Mutations
  const createTemplateMutation = trpc.customReports.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      setIsCreatingTemplate(false);
      resetTemplateForm();
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const deleteTemplateMutation = trpc.customReports.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      setSelectedTemplate(null);
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  const duplicateTemplateMutation = trpc.customReports.templates.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Template duplicated");
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(`Failed to duplicate template: ${error.message}`);
    },
  });

  const generateReportMutation = trpc.customReports.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Report generated successfully");
      setIsGenerating(false);
      refetchReports();
      // Open the report in a new tab
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const deleteReportMutation = trpc.customReports.generated.delete.useMutation({
    onSuccess: () => {
      toast.success("Report deleted");
      refetchReports();
    },
    onError: (error) => {
      toast.error(`Failed to delete report: ${error.message}`);
    },
  });

  // Reset form
  const resetTemplateForm = () => {
    setNewTemplateName("");
    setNewTemplateDescription("");
    setNewTemplateType("custom");
    setSections([]);
  };

  // Add section
  const addSection = (type: SectionType) => {
    setSections([
      ...sections,
      {
        sectionName: SECTION_TYPE_LABELS[type],
        sectionType: type,
        displayOrder: sections.length + 1,
        isRequired: true,
      },
    ]);
  };

  // Remove section
  const removeSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    // Reorder
    setSections(newSections.map((s, i) => ({ ...s, displayOrder: i + 1 })));
  };

  // Move section
  const moveSection = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections.map((s, i) => ({ ...s, displayOrder: i + 1 })));
  };

  // Update section content
  const updateSectionContent = (index: number, content: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], content };
    setSections(newSections);
  };

  // Update section name
  const updateSectionName = (index: number, name: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], sectionName: name };
    setSections(newSections);
  };

  // Create template
  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (sections.length === 0) {
      toast.error("Please add at least one section");
      return;
    }

    createTemplateMutation.mutate({
      name: newTemplateName,
      description: newTemplateDescription,
      type: newTemplateType,
      projectId,
      sections: sections.map(s => ({
        sectionName: s.sectionName,
        sectionType: s.sectionType,
        displayOrder: s.displayOrder,
        defaultContent: s.content,
        isRequired: s.isRequired ?? true,
      })),
    });
  };

  // Use default template
  const useDefaultTemplate = (template: any) => {
    setNewTemplateName(template.name);
    setNewTemplateDescription(template.description);
    setNewTemplateType(template.type);
    setSections(template.sections.map((s: any, i: number) => ({
      sectionName: s.sectionName,
      sectionType: s.sectionType,
      displayOrder: i + 1,
      isRequired: true,
    })));
    setIsCreatingTemplate(true);
  };

  // Generate report
  const handleGenerateReport = () => {
    if (!reportName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    setIsGenerating(true);

    // Prepare sections with content
    const sectionContent = selectedTemplateData?.sections?.map((s: any) => ({
      sectionId: s.id,
      sectionName: s.sectionName,
      sectionType: s.sectionType,
      displayOrder: s.displayOrder,
      content: s.defaultContent,
    })) || sections.map(s => ({
      sectionName: s.sectionName,
      sectionType: s.sectionType,
      displayOrder: s.displayOrder,
      content: s.content,
    }));

    generateReportMutation.mutate({
      projectId,
      templateId: selectedTemplate || undefined,
      reportName,
      format: exportFormat,
      sectionContent,
      options: {
        includePhotos,
        includeCharts,
      },
    });
  };

  // Load template sections when selected
  useEffect(() => {
    if (selectedTemplateData?.sections) {
      setSections(selectedTemplateData.sections.map((s: any) => ({
        id: s.id,
        sectionName: s.sectionName,
        sectionType: s.sectionType,
        displayOrder: s.displayOrder,
        content: s.defaultContent,
        isRequired: s.isRequired === 1,
      })));
    }
  }, [selectedTemplateData]);

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="history">Generated Reports</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Quick Start Templates */}
              <div>
                <h3 className="text-sm font-medium mb-2">Quick Start Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {defaultTemplates?.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => useDefaultTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {template.sections.slice(0, 3).map((s: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {s.sectionName}
                            </Badge>
                          ))}
                          {template.sections.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.sections.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Saved Templates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Saved Templates</h3>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      resetTemplateForm();
                      setIsCreatingTemplate(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Template
                  </Button>
                </div>

                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : templates && templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate === template.id ? "border-primary" : "hover:border-muted-foreground"
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <div className="flex items-center gap-1">
                              {template.isGlobal === 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Global
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {REPORT_TYPE_LABELS[template.type as ReportType]}
                              </Badge>
                            </div>
                          </div>
                          {template.description && (
                            <CardDescription className="text-xs">
                              {template.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter className="pt-2 flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTemplateMutation.mutate({
                                id: template.id,
                                newName: `${template.name} (Copy)`,
                              });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this template?")) {
                                deleteTemplateMutation.mutate({ id: template.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No saved templates yet</p>
                    <p className="text-sm">Create a new template or use a quick start template</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Builder Tab */}
        <TabsContent value="builder" className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Report Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Report Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reportName">Report Name</Label>
                      <Input
                        id="reportName"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="Enter report name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exportFormat">Export Format</Label>
                      <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              PDF Document
                            </div>
                          </SelectItem>
                          <SelectItem value="word">
                            <div className="flex items-center">
                              <FileType className="h-4 w-4 mr-2" />
                              Word Document (.docx)
                            </div>
                          </SelectItem>
                          <SelectItem value="excel">
                            <div className="flex items-center">
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Excel Spreadsheet (.xlsx)
                            </div>
                          </SelectItem>
                          <SelectItem value="html">
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 mr-2" />
                              HTML Document
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="includePhotos"
                        checked={includePhotos}
                        onCheckedChange={setIncludePhotos}
                      />
                      <Label htmlFor="includePhotos">Include Photos</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="includeCharts"
                        checked={includeCharts}
                        onCheckedChange={setIncludeCharts}
                      />
                      <Label htmlFor="includeCharts">Include Charts</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Report Sections</CardTitle>
                    <Select onValueChange={(v) => addSection(v as SectionType)}>
                      <SelectTrigger className="w-[180px]">
                        <Plus className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Add Section" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SECTION_TYPE_LABELS).map(([type, label]) => (
                          <SelectItem key={type} value={type}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {sections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No sections added yet</p>
                      <p className="text-sm">Add sections to build your report</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sections.map((section, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => moveSection(index, "up")}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => moveSection(index, "down")}
                              disabled={index === sections.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={section.sectionName}
                                onChange={(e) => updateSectionName(index, e.target.value)}
                                className="h-8"
                              />
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {SECTION_TYPE_LABELS[section.sectionType]}
                              </Badge>
                            </div>

                            {section.sectionType === "narrative" && (
                              <Textarea
                                placeholder="Enter narrative content..."
                                value={section.content || ""}
                                onChange={(e) => updateSectionContent(index, e.target.value)}
                                rows={3}
                              />
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeSection(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generate Button */}
              <div className="flex justify-end gap-2">
                {isCreatingTemplate && (
                  <Button
                    variant="outline"
                    onClick={handleCreateTemplate}
                    disabled={createTemplateMutation.isPending}
                  >
                    {createTemplateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save as Template
                  </Button>
                )}
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || sections.length === 0}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 p-1">
              {generatedReports && generatedReports.length > 0 ? (
                generatedReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{report.reportName}</CardTitle>
                        <Badge variant="outline">
                          {REPORT_TYPE_LABELS[report.reportType as ReportType]}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Generated on {new Date(report.createdAt!).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 flex justify-end gap-2">
                      {report.pdfUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-1" />
                            PDF
                          </a>
                        </Button>
                      )}
                      {report.docxUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={report.docxUrl} target="_blank" rel="noopener noreferrer">
                            <FileType className="h-4 w-4 mr-1" />
                            Word
                          </a>
                        </Button>
                      )}
                      {report.xlsxUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={report.xlsxUrl} target="_blank" rel="noopener noreferrer">
                            <FileSpreadsheet className="h-4 w-4 mr-1" />
                            Excel
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this report?")) {
                            deleteReportMutation.mutate({ id: report.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No reports generated yet</p>
                  <p className="text-sm">Generate a report using the Report Builder tab</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Template Creation Dialog */}
      <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for generating reports
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Enter template name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateType">Template Type</Label>
                <Select value={newTemplateType} onValueChange={(v) => setNewTemplateType(v as ReportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_TYPE_LABELS).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={2}
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sections</Label>
                <Select onValueChange={(v) => addSection(v as SectionType)}>
                  <SelectTrigger className="w-[180px]">
                    <Plus className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Add Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTION_TYPE_LABELS).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sections.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-lg">
                  <p className="text-sm">Add sections to your template</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {sections.map((section, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-lg"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{section.sectionName}</span>
                      <Badge variant="outline" className="text-xs">
                        {SECTION_TYPE_LABELS[section.sectionType]}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => removeSection(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomReportBuilder;
