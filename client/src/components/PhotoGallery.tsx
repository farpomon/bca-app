import { useState } from "react";
import AIAssessmentDialog from "@/components/AIAssessmentDialog";
import PhotoAnnotator from "@/components/PhotoAnnotator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Upload, X, Loader2, Image as ImageIcon, ZoomIn } from "lucide-react";
import { toast } from "sonner";

interface PhotoGalleryProps {
  projectId: number;
  deficiencyId?: number;
  componentCode?: string;
}

export default function PhotoGallery({ projectId, deficiencyId, componentCode }: PhotoGalleryProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: boolean}>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string>("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedPhotoForAI, setSelectedPhotoForAI] = useState<{ id: number; url: string } | null>(null);
  const [annotatorOpen, setAnnotatorOpen] = useState(false);
  const [selectedPhotoForAnnotation, setSelectedPhotoForAnnotation] = useState<{ id: number; url: string } | null>(null);

  const { data: photos, refetch } = trpc.photos.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const uploadPhoto = trpc.photos.upload.useMutation({
    onError: (error) => {
      toast.error("Failed to upload photo: " + error.message);
    },
  });

  const deletePhoto = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete photo: " + error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file size (16MB limit)
      if (file.size > 16 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 16MB`);
        return false;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: Only image files are allowed`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
    setUploadDialogOpen(true);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of selectedFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: true }));
        
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            uploadPhoto.mutate({
              projectId,
              deficiencyId,
              componentCode,
              fileData: base64!,
              fileName: file.name,
              mimeType: file.type,
              caption: caption || undefined,
            }, {
              onSuccess: () => {
                successCount++;
                setUploadProgress(prev => ({ ...prev, [file.name]: false }));
                resolve();
              },
              onError: () => {
                failCount++;
                setUploadProgress(prev => ({ ...prev, [file.name]: false }));
                reject();
              }
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (error) {
        // Error already counted in failCount
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} photo(s) uploaded successfully`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} photo(s) failed to upload`);
    }

    // Reset state
    setUploadDialogOpen(false);
    setSelectedFiles([]);
    setCaption("");
    setPreviewUrls([]);
    setUploadProgress({});
    refetch();
  };

  const filteredPhotos = deficiencyId
    ? photos?.filter(p => p.deficiencyId === deficiencyId)
    : componentCode
    ? photos?.filter(p => p.componentCode === componentCode)
    : photos;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Photo Gallery</CardTitle>
            <CardDescription>
              {filteredPhotos?.length || 0} photos
            </CardDescription>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Photo</DialogTitle>
                <DialogDescription>
                  Add a photo to document this assessment
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="photo">Photo Files</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop photos here, or click to browse
                    </p>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('photo')?.click()}
                    >
                      Browse Files
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 16MB per file. Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>

                {previewUrls.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Photos ({selectedFiles.length})</Label>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative border rounded-lg p-1 group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {uploadProgress[selectedFiles[index]?.name] && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Describe what this photo shows..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setSelectedFiles([]);
                    setCaption("");
                    setPreviewUrls([]);
                    setUploadProgress({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploadPhoto.isPending}
                >
                  {uploadPhoto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPhotos && filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div
                  className="aspect-square border rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setViewerImage(photo.url);
                    setViewerOpen(true);
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Project photo"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {photo.caption && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {photo.caption}
                  </p>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this photo?")) {
                      deletePhoto.mutate({ id: photo.id });
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => {
                    setViewerImage(photo.url);
                    setViewerOpen(true);
                  }}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="default"
                    size="icon"
                    className="h-7 w-7 bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoForAnnotation({ id: photo.id, url: photo.url });
                      setAnnotatorOpen(true);
                    }}
                    title="Annotate photo"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-7 w-7 bg-purple-600 hover:bg-purple-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoForAI({ id: photo.id, url: photo.url });
                      setAiDialogOpen(true);
                    }}
                    title="Assess with AI"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No photos yet</p>
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload First Photo
            </Button>
          </div>
        )}
      </CardContent>

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo Viewer</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <img
              src={viewerImage}
              alt="Full size"
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assessment Dialog */}
      {selectedPhotoForAI && (
        <AIAssessmentDialog
          photoId={selectedPhotoForAI.id}
          photoUrl={selectedPhotoForAI.url}
          projectId={projectId}
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          onDeficienciesCreated={() => {
            refetch();
          }}
        />
      )}

      {/* Photo Annotator Dialog */}
      {selectedPhotoForAnnotation && (
        <PhotoAnnotator
          photoId={selectedPhotoForAnnotation.id}
          photoUrl={selectedPhotoForAnnotation.url}
          projectId={projectId}
          open={annotatorOpen}
          onOpenChange={setAnnotatorOpen}
          onSaved={() => {
            refetch();
          }}
        />
      )}
    </Card>
  );
}
