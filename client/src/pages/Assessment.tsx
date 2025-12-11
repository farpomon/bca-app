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
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null);



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

  // Get assessment summary for a major group (level 1)
  const getMajorGroupSummary = (majorGroupCode: string) => {
    if (!existingAssessments || !components) return { good: 0, fair: 0, poor: 0, total: 0 };
    
    // Get all components that belong to this major group
    const groupComponents = components.filter(c => c.code.startsWith(majorGroupCode));
    const groupCodes = new Set(groupComponents.map(c => c.code));
    
    // Count assessments for these components
    const assessments = existingAssessments.filter(a => groupCodes.has(a.componentCode));
    
    return {
      good: assessments.filter(a => a.condition === 'good').length,
      fair: assessments.filter(a => a.condition === 'fair').length,
      poor: assessments.filter(a => a.condition === 'poor').length,
      total: assessments.length
    };
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
                          <div className="flex items-center gap-2">
                            {(() => {
                              const summary = getMajorGroupSummary(majorGroup.code);
                              if (summary.total === 0) return null;
                              return (
                                <div className="flex items-center gap-1 text-xs">
                                  {summary.good > 0 && (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                      {summary.good}
                                    </Badge>
                                  )}
                                  {summary.fair > 0 && (
                                    <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                      {summary.fair}
                                    </Badge>
                                  )}
                                  {summary.poor > 0 && (
                                    <Badge variant="destructive">
                                      {summary.poor}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()}
                            {getConditionBadge(majorGroup.code)}
                          </div>
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
              {/* Good Condition */}
              <button
                className="p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                onClick={() => setExpandedCondition(expandedCondition === 'good' ? null : 'good')}
              >
                <div className="text-xl md:text-2xl font-bold text-green-600">
                  {existingAssessments?.filter(a => a.condition === "good").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Good Condition</div>
              </button>
              
              {/* Fair Condition */}
              <button
                className="p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                onClick={() => setExpandedCondition(expandedCondition === 'fair' ? null : 'fair')}
              >
                <div className="text-2xl font-bold text-yellow-600">
                  {existingAssessments?.filter(a => a.condition === "fair").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Fair Condition</div>
              </button>
              
              {/* Poor Condition */}
              <button
                className="p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                onClick={() => setExpandedCondition(expandedCondition === 'poor' ? null : 'poor')}
              >
                <div className="text-2xl font-bold text-red-600">
                  {existingAssessments?.filter(a => a.condition === "poor").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Poor Condition</div>
              </button>
              
              {/* Not Assessed */}
              <button
                className="p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                onClick={() => setExpandedCondition(expandedCondition === 'not_assessed' ? null : 'not_assessed')}
              >
                <div className="text-2xl font-bold text-gray-600">
                  {existingAssessments?.filter(a => a.condition === "not_assessed").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Not Assessed</div>
              </button>
            </div>
            
            {/* Expanded Component List */}
            {expandedCondition && (
              <div className="mt-4 space-y-2 border-t pt-4">
                <h4 className="font-semibold text-sm mb-2">
                  {expandedCondition === 'good' && 'Components in Good Condition'}
                  {expandedCondition === 'fair' && 'Components in Fair Condition'}
                  {expandedCondition === 'poor' && 'Components in Poor Condition'}
                  {expandedCondition === 'not_assessed' && 'Not Assessed Components'}
                </h4>
                <div className="space-y-1">
                  {existingAssessments
                    ?.filter(a => a.condition === expandedCondition && a.componentCode)
                    .map(assessment => {
                      const component = components?.find(c => c.code === assessment.componentCode);
                      const componentCode = assessment.componentCode!; // Assert non-null after filter
                      return (
                        <Button
                          key={componentCode}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 hover:bg-accent"
                          onClick={() => {
                            loadAssessment(componentCode, component?.name || componentCode);
                            setExpandedCondition(null);
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="font-medium text-sm">{assessment.componentCode}</div>
                              <div className="text-xs text-muted-foreground">{component?.name || 'Unknown Component'}</div>
                            </div>
                            {assessment.componentCode && getConditionBadge(assessment.componentCode)}
                          </div>
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}
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
