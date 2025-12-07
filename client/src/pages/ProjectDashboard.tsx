import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { FCIGauge } from "@/components/FCIGauge";
import { ConditionMatrix } from "@/components/ConditionMatrix";
import { FinancialPlanning } from "@/components/FinancialPlanning";
import OverallConditionWidget from "@/components/OverallConditionWidget";

export default function ProjectDashboard() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);

  const { user, loading: authLoading } = useAuth();
  
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!user && !isNaN(projectId), retry: false }
  );

  const { data: fciData, isLoading: fciLoading } = trpc.projects.fci.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const { data: financialData, isLoading: financialLoading } = trpc.projects.financialPlanning.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const { data: conditionData, isLoading: conditionLoading } = trpc.projects.conditionMatrix.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  if (authLoading || projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Project not found</p>
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/projects/${projectId}`)}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.address}</p>
          </div>
        </div>

        {/* Overall Building Condition */}
        <OverallConditionWidget projectId={projectId} />

        {/* FCI Gauge - Full Width */}
        <FCIGauge data={fciData} isLoading={fciLoading} />

        {/* Condition Matrix */}
        <ConditionMatrix data={conditionData} isLoading={conditionLoading} />

        {/* Financial Planning */}
        <FinancialPlanning data={financialData} isLoading={financialLoading} />
      </div>
    </DashboardLayout>
  );
}
