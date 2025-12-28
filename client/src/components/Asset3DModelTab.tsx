import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ModelViewer } from "@/components/ModelViewer";
import { ModelUploadDialog } from "@/components/ModelUploadDialog";
import { ConversionStatusBar } from "@/components/ConversionStatusBar";
import { 
  Upload, 
  Loader2, 
  Box, 
  Trash2, 
  CheckCircle2, 
  History,
  MoreVertical,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Asset3DModelTabProps {
  assetId: number;
  projectId: number;
}

export function Asset3DModelTab({ assetId, projectId }: Asset3DModelTabProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteModelId, setDeleteModelId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch active model for this specific asset
  const { data: activeModel, isLoading: modelLoading } = trpc.models.getActive.useQuery(
    { projectId, assetId },
    { enabled: !!projectId && !!assetId }
  );

  // Fetch all models for this specific asset's history
  const { data: models = [], isLoading: modelsLoading } = trpc.models.list.useQuery(
    { projectId, assetId },
    { enabled: !!projectId && !!assetId }
  );

  // Fetch annotations for the active model
  const { data: annotations = [] } = trpc.models.annotations.list.useQuery(
    { modelId: activeModel?.id || 0 },
    { enabled: !!activeModel?.id }
  );

  // Delete mutation
  const deleteMutation = trpc.models.delete.useMutation({
    onSuccess: () => {
      toast.success("Model deleted successfully");
      utils.models.list.invalidate({ projectId, assetId });
      utils.models.getActive.invalidate({ projectId, assetId });
      setDeleteModelId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete model: ${error.message}`);
    },
  });

  // Set active mutation
  const setActiveMutation = trpc.models.updateMetadata.useMutation({
    onSuccess: () => {
      toast.success("Model set as active");
      utils.models.list.invalidate({ projectId, assetId });
      utils.models.getActive.invalidate({ projectId, assetId });
    },
    onError: (error) => {
      toast.error(`Failed to set active model: ${error.message}`);
    },
  });

  const handleSetActive = (modelId: number) => {
    // First, deactivate all models, then activate the selected one
    setActiveMutation.mutate({ id: modelId, isActive: true });
  };

  const handleDeleteModel = () => {
    if (deleteModelId) {
      deleteMutation.mutate({ id: deleteModelId });
    }
  };

  const handleAnnotationClick = (annotationId: number) => {
    const annotation = annotations.find((a) => a.id === annotationId);
    if (annotation) {
      toast.info(`Annotation: ${annotation.title}`, {
        description: annotation.description || annotation.annotationType,
      });
    }
  };

  if (modelLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading 3D model...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                3D Digital Twin
              </CardTitle>
              <CardDescription>
                Interactive 3D model with clickable annotations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {models.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="mr-2 h-4 w-4" />
                  History ({models.length})
                </Button>
              )}
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Model
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Active Model Info */}
        {activeModel && (
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Active
                </Badge>
                <div>
                  <p className="font-medium">{activeModel.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Version {activeModel.version} • {activeModel.format.toUpperCase()} •{" "}
                    {activeModel.fileSize ? `${(activeModel.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteModelId(activeModel.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Model
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Conversion Status Bar */}
      {activeModel && activeModel.apsTranslationStatus && activeModel.apsTranslationStatus !== 'success' && (
        <ConversionStatusBar
          modelId={activeModel.id}
          apsTranslationStatus={activeModel.apsTranslationStatus}
          apsTranslationProgress={activeModel.apsTranslationProgress}
          onStatusChange={() => {
            utils.models.getActive.invalidate({ projectId });
            utils.models.list.invalidate({ projectId });
          }}
        />
      )}

      {/* 3D Viewer */}
      {activeModel ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ModelViewer
              modelUrl={activeModel.fileUrl}
              modelFormat={activeModel.format}
              modelId={activeModel.id}
              apsUrn={activeModel.apsUrn}
              apsTranslationStatus={activeModel.apsTranslationStatus}
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
              onAnnotationClick={handleAnnotationClick}
              onApsStatusChange={() => {
                // Refetch model data when APS conversion starts
                utils.models.getActive.invalidate({ projectId });
                utils.models.list.invalidate({ projectId });
              }}
              height="500px"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Box className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No 3D Model Available</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Upload a 3D model of your asset to enable immersive visualization. 
                  Supported formats include GLB, GLTF, FBX, OBJ, SketchUp (SKP), Revit (RVT/RFA), and DWG/DXF.
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Your First Model
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model History */}
      {showHistory && models.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model History</CardTitle>
            <CardDescription>
              All uploaded 3D models for this asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    model.isActive ? "bg-accent border-primary/20" : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Box className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        {model.isActive === 1 && (
                          <Badge variant="default" className="bg-green-500 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Version {model.version} • {model.format.toUpperCase()} •{" "}
                        {new Date(model.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {model.isActive !== 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(model.id)}
                        disabled={setActiveMutation.isPending}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Set Active
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteModelId(model.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <ModelUploadDialog
        projectId={projectId}
        assetId={assetId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteModelId} onOpenChange={() => setDeleteModelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete 3D Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this 3D model? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
