import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ModelViewer } from "@/components/ModelViewer";
import { ModelUploadDialog } from "@/components/ModelUploadDialog";
import { ArrowLeft, Upload, Loader2, Box } from "lucide-react";

export default function Model3DViewer() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);
  const { user, loading: authLoading } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!user && !isNaN(projectId), retry: false }
  );

  const { data: activeModel, isLoading: modelLoading } = trpc.models.getActive.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const { data: models = [], isLoading: modelsLoading } = trpc.models.list.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const { data: annotations = [] } = trpc.models.annotations.list.useQuery(
    { modelId: activeModel?.id || 0 },
    { enabled: !!activeModel }
  );

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => setLocation("/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 space-y-6">
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Box className="h-8 w-8" />
              3D Digital Twin
            </h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Model
          </Button>
        </div>

        {/* Model Viewer */}
        {modelLoading ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading 3D model...</p>
            </div>
          </Card>
        ) : activeModel ? (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-semibold">{activeModel.name}</h2>
                  {activeModel.description && (
                    <p className="text-sm text-muted-foreground">{activeModel.description}</p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Version {activeModel.version} • {activeModel.format.toUpperCase()}
                </div>
              </div>
            </Card>

            <ModelViewer
              modelUrl={activeModel.fileUrl}
              annotations={annotations.map((a) => ({
                id: a.id,
                title: a.title,
                position: {
                  x: parseFloat(a.positionX),
                  y: parseFloat(a.positionY),
                  z: parseFloat(a.positionZ),
                },
                type: a.annotationType,
              }))}
              onAnnotationClick={(id) => {
                console.log("Annotation clicked:", id);
              }}
            />
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Box className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No 3D Model Available</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a 3D model of your facility to enable immersive visualization and collaboration.
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Your First Model
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Model History */}
        {models.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Model History</h3>
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    model.isActive ? "bg-accent" : "bg-card"
                  }`}
                >
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Version {model.version} • {model.format.toUpperCase()} •
                      Uploaded {new Date(model.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {model.isActive && (
                    <span className="text-xs font-medium text-primary">Active</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <ModelUploadDialog
        projectId={projectId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}
