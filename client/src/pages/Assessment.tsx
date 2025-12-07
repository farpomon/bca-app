import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Save, Plus } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { AssessmentDialog } from "@/components/AssessmentDialog";

export default function Assessment() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);

  const { user, loading: authLoading } = useAuth();
  const { data: project, isLoading: projectLoading, error: projectError } = trpc.projects.get.useQuery(
    { id: projectId },
    { 
      enabled: !!user && !isNaN(projectId), 
      retry: false,
      // Suppress React Query default error logging for NOT_FOUND
      meta: { suppressErrorLogging: true }
    }
  );
  const { data: components, isLoading: componentsLoading } = trpc.components.list.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: existingAssessments, refetch: refetchAssessments } = trpc.assessments.list.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const [selectedComponent, setSelectedComponent] = useState<string>("");
  const [selectedComponentName, setSelectedComponentName] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [condition, setCondition] = useState<string>("not_assessed");
  const [observations, setObservations] = useState("");
  const [remainingUsefulLife, setRemainingUsefulLife] = useState("");
  const [expectedUsefulLife, setExpectedUsefulLife] = useState("");

  const upsertAssessment = trpc.assessments.upsert.useMutation({
    onSuccess: () => {
      toast.success("Assessment saved successfully");
      refetchAssessments();
      // Reset form
      setCondition("not_assessed");
      setObservations("");
      setRemainingUsefulLife("");
      setExpectedUsefulLife("");
    },
    onError: (error) => {
      toast.error("Failed to save assessment: " + error.message);
    },
  });

  // Group components by level
  const componentsByLevel = useMemo(() => {
    if (!components) return { level1: [], level2: [], level3: [] };
    
    return {
      level1: components.filter(c => c.level === 1),
      level2: components.filter(c => c.level === 2),
      level3: components.filter(c => c.level === 3),
    };
  }, [components]);

  // Create a map of assessments by component code
  const assessmentMap = useMemo(() => {
    if (!existingAssessments) return new Map();
    return new Map(existingAssessments.map(a => [a.componentCode, a]));
  }, [existingAssessments]);

  const handleSaveAssessment = () => {
    if (!selectedComponent) {
      toast.error("Please select a component");
      return;
    }

    upsertAssessment.mutate({
      projectId,
      componentCode: selectedComponent,
      condition: condition as "good" | "fair" | "poor" | "not_assessed",
      observations: observations || undefined,
      remainingUsefulLife: remainingUsefulLife ? parseInt(remainingUsefulLife) : undefined,
      expectedUsefulLife: expectedUsefulLife ? parseInt(expectedUsefulLife) : undefined,
    });
  };

  const loadAssessment = (componentCode: string, componentName: string) => {
    setSelectedComponent(componentCode);
    setSelectedComponentName(componentName);
    setDialogOpen(true);
  };

  const getConditionBadge = (componentCode: string) => {
    const assessment = assessmentMap.get(componentCode);
    if (!assessment) return null;
    
    const variant = 
      assessment.condition === "good" ? "default" :
      assessment.condition === "fair" ? "secondary" :
      assessment.condition === "poor" ? "destructive" : "outline";
    
    return <Badge variant={variant} className="ml-2">{assessment.condition}</Badge>;
  };

  if (authLoading || projectLoading || componentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <p className="text-muted-foreground mb-4">
            {projectError?.message || "The project you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Button onClick={() => setLocation("/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 px-3 md:px-0">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Building Component Assessment</h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Left: Component Selection */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl">UNIFORMAT II Components</CardTitle>
              <CardDescription className="text-sm">
                Select a component to assess. Components are organized by Major Group, Group, and Individual Element.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {componentsByLevel.level1.map((majorGroup) => (
                  <AccordionItem key={majorGroup.code} value={majorGroup.code}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">
                          {majorGroup.code} - {majorGroup.name}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Accordion type="single" collapsible className="w-full pl-4">
                        {componentsByLevel.level2
                          .filter(group => group.parentCode === majorGroup.code)
                          .map((group) => (
                            <AccordionItem key={group.code} value={group.code}>
                              <AccordionTrigger className="hover:no-underline text-sm">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <span>
                                    {group.code} - {group.name}
                                  </span>
                                  {getConditionBadge(group.code)}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pl-4">
                                  {componentsByLevel.level3
                                    .filter(element => element.parentCode === group.code)
                                    .map((element) => (
                                      <Button
                                        key={element.code}
                                        variant={selectedComponent === element.code ? "default" : "outline"}
                                        className="w-full justify-start text-left h-auto py-2"
                                        onClick={() => loadAssessment(element.code, element.name)}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="text-xs">
                                            <div className="font-medium">{element.code}</div>
                                            <div className="text-muted-foreground">{element.name}</div>
                                          </div>
                                          {getConditionBadge(element.code)}
                                        </div>
                                      </Button>
                                    ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Right: Assessment Form */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Component Assessment</CardTitle>
              <CardDescription className="text-sm">
                {selectedComponent 
                  ? `Assessing component: ${selectedComponent}`
                  : "Select a component from the left to begin assessment"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6">
              {selectedComponent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition Rating *</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger id="condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="not_assessed">Not Assessed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observations</Label>
                    <Textarea
                      id="observations"
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Describe the current condition, any visible defects, maintenance history, etc."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="remainingUsefulLife">Remaining Useful Life (years)</Label>
                      <Input
                        id="remainingUsefulLife"
                        type="number"
                        value={remainingUsefulLife}
                        onChange={(e) => setRemainingUsefulLife(e.target.value)}
                        placeholder="e.g., 10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedUsefulLife">Expected Useful Life (years)</Label>
                      <Input
                        id="expectedUsefulLife"
                        type="number"
                        value={expectedUsefulLife}
                        onChange={(e) => setExpectedUsefulLife(e.target.value)}
                        placeholder="e.g., 25"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button 
                      onClick={handleSaveAssessment} 
                      disabled={upsertAssessment.isPending}
                      className="flex-1"
                    >
                      {upsertAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Assessment
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setLocation(`/projects/${projectId}`)}
                    >
                      Done
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      After saving, you can add deficiencies for this component from the project detail page.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a component from the left panel to begin assessment
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assessment Progress */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-lg md:text-xl">Assessment Progress</CardTitle>
            <CardDescription className="text-sm">
              {existingAssessments?.length || 0} components assessed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              <div className="p-3 border rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-green-600">
                  {existingAssessments?.filter(a => a.condition === "good").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Good Condition</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {existingAssessments?.filter(a => a.condition === "fair").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Fair Condition</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {existingAssessments?.filter(a => a.condition === "poor").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Poor Condition</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {existingAssessments?.filter(a => a.condition === "not_assessed").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Not Assessed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Dialog */}
      <AssessmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        componentCode={selectedComponent}
        componentName={selectedComponentName}
        existingAssessment={assessmentMap.get(selectedComponent)}
        onSuccess={refetchAssessments}
      />
    </DashboardLayout>
  );
}
