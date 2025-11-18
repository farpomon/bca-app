import { useState } from "react";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string>("");

  const { data: photos, refetch } = trpc.photos.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const uploadPhoto = trpc.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded successfully");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setCaption("");
      setPreviewUrl(null);
      refetch();
    },
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
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File size must be less than 16MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhoto.mutate({
        projectId,
        deficiencyId,
        componentCode,
        fileData: base64!,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        caption: caption || undefined,
      });
    };
    reader.readAsDataURL(selectedFile);
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
                  <Label htmlFor="photo">Photo File</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 16MB. Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>

                {previewUrl && (
                  <div className="border rounded-lg p-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-contain"
                    />
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
                    setSelectedFile(null);
                    setCaption("");
                    setPreviewUrl(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadPhoto.isPending}
                >
                  {uploadPhoto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload
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
    </Card>
  );
}
