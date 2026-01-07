import { Image, Download, Trash2, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PhotoListProps {
  assessmentId: number;
  projectId: number;
}

type PhotoFilter = "all" | "jpg" | "png" | "gif";

const getPhotoType = (mimeType: string): PhotoFilter => {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  return "all";
};

export function PhotoList({ assessmentId, projectId }: PhotoListProps) {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<PhotoFilter>("all");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const { data: photos, isLoading } = trpc.photos.byAssessment.useQuery({
    assessmentId,
    projectId,
  });

  const deleteMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted");
      utils.photos.byAssessment.invalidate({ assessmentId, projectId });
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading photos...
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
        No photos uploaded yet
      </div>
    );
  }

  // Filter photos by type
  const filteredPhotos = photos.filter((photo) => {
    if (filter === "all") return true;
    return getPhotoType(photo.mimeType || "") === filter;
  });

  return (
    <>
      <div className="space-y-3">
        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(value) => setFilter(value as PhotoFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Photos</SelectItem>
              <SelectItem value="jpg">JPG/JPEG</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="gif">GIF</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredPhotos.length} of {photos.length} photos
          </span>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="p-3">
              <div className="space-y-2">
                {/* Photo Thumbnail */}
                <div 
                  className="relative aspect-video bg-muted rounded-md overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedPhoto(photo.url)}
                >
                  <img 
                    src={photo.url} 
                    alt={photo.caption || "Assessment photo"} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Photo Info */}
                <div className="space-y-1">
                  {photo.caption && (
                    <p className="text-sm font-medium line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>
                        {photo.fileSize ? (photo.fileSize / 1024 / 1024).toFixed(2) : "0.00"} MB
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(photo.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  {/* GPS Location Display */}
                  {(photo.latitude && photo.longitude) && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span title="GPS Coordinates">
                        {parseFloat(photo.latitude).toFixed(6)}, {parseFloat(photo.longitude).toFixed(6)}
                      </span>
                      {photo.altitude && (
                        <span className="ml-1" title="Altitude">
                          (Alt: {parseFloat(photo.altitude).toFixed(1)}m)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPhoto(photo.url)}
                    title="View full size"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(photo.url, `photo-${photo.id}.${photo.mimeType?.split('/')[1] || 'jpg'}`)}
                    title="Download photo"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this photo?")) {
                        deleteMutation.mutate({ id: photo.id });
                      }
                    }}
                    title="Delete photo"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Full Size Photo Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <img 
              src={selectedPhoto} 
              alt="Full size photo" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
