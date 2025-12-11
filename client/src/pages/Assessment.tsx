import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { useParams, useLocation } from "wouter";

import { useState, useMemo } from "react";
import { AssessmentDialog } from "@/components/AssessmentDialog";
import { AddCustomComponentDialog } from "@/components/AddCustomComponentDialog";

export default function Assessment() {
  const { id, assetId } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);
  const assetIdNum = parseInt(assetId!);

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
  const [customComponentDialogOpen, setCustomComponentDialogOpen] = useState(false);



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

        {/* Component Selection - Full Width */}
        <Card>
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">UNIFORMAT II Components</CardTitle>
                  <CardDescription className="text-sm">
                    Select a component to assess. Components are organized by Major Group, Group, and Individual Element.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomComponentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Custom
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {componentsByLevel.level1.map((majorGroup) => {
                  // Get level 2 components that belong to this major group
                  const level2Components = componentsByLevel.level2.filter(
                    c => c.code.startsWith(majorGroup.code)
                  );
                  
                  return (
                    <AccordionItem key={majorGroup.code} value={majorGroup.code}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold text-lg">{majorGroup.code}</div>
                            <div className="text-sm text-muted-foreground">{majorGroup.name}</div>
                          </div>
                          {getConditionBadge(majorGroup.code)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          {/* Level 2 components */}
                          {level2Components.map((level2) => {
                            // Get level 3 components that belong to this level 2 component
                            const level3Components = componentsByLevel.level3.filter(
                              c => c.code.startsWith(level2.code)
                            );
                            
                            return (
                              <div key={level2.code} className="space-y-1">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-left h-auto py-2 hover:bg-accent"
                                  onClick={() => loadAssessment(level2.code, level2.name)}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <div className="font-medium text-sm">{level2.code}</div>
                                      <div className="text-xs text-muted-foreground">{level2.name}</div>
                                    </div>
                                    {getConditionBadge(level2.code)}
                                  </div>
                                </Button>
                                
                                {/* Level 3 components */}
                                {level3Components.length > 0 && (
                                  <div className="pl-4 space-y-1">
                                    {level3Components.map((level3) => (
                                      <Button
                                        key={level3.code}
                                        variant="ghost"
                                        className="w-full justify-start text-left h-auto py-2 hover:bg-accent"
                                        onClick={() => loadAssessment(level3.code, level3.name)}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div>
                                            <div className="font-medium text-xs">{level3.code}</div>
                                            <div className="text-xs text-muted-foreground">{level3.name}</div>
                                          </div>
                                          {getConditionBadge(level3.code)}
                                        </div>
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
        </Card>

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
        assetId={assetIdNum}
        componentCode={selectedComponent}
        componentName={selectedComponentName}
        existingAssessment={assessmentMap.get(selectedComponent)}
        onSuccess={refetchAssessments}
      />

      {/* Add Custom Component Dialog */}
      <AddCustomComponentDialog
        open={customComponentDialogOpen}
        onOpenChange={setCustomComponentDialogOpen}
        projectId={projectId}
        parentComponents={[
          ...componentsByLevel.level1.map(c => ({ code: c.code, name: c.name })),
          ...componentsByLevel.level2.map(c => ({ code: c.code, name: c.name })),
        ]}
        onSuccess={() => {
          // Refetch components to show the new custom component
          window.location.reload();
        }}
      />
    </DashboardLayout>
  );
}
