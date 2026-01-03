import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, X, Download, Trash2, Image as ImageIcon, MapPin, ExternalLink, RotateCcw, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { RecentlyDeletedDialog } from "./RecentlyDeletedDialog";

interface AssetPhotoGalleryProps {
  assetId: number;
  projectId: number;
}

// Helper function to format coordinates
function formatCoordinates(lat: string | number | null, lng: string | number | null): string | null {
  if (!lat || !lng) return null;
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (isNaN(latNum) || isNaN(lngNum)) return null;
  
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lngDir = lngNum >= 0 ? 'E' : 'W';
  return `${Math.abs(latNum).toFixed(6)}° ${latDir}, ${Math.abs(lngNum).toFixed(6)}° ${lngDir}`;
}

// Helper function to create Google Maps URL
function getGoogleMapsUrl(lat: string | number | null, lng: string | number | null): string | null {
  if (!lat || !lng) return null;
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (isNaN(latNum) || isNaN(lngNum)) return null;
  return `https://www.google.com/maps?q=${latNum},${lngNum}`;
}

export default function AssetPhotoGallery({ assetId, projectId }: AssetPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isRecentlyDeletedOpen, setIsRecentlyDeletedOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  
  const { data: photos, isLoading } = trpc.photos.byAsset.useQuery({ assetId, projectId });
  const utils = trpc.useUtils();
  
  const deletePhotoMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success('Photo moved to Recently Deleted');
      utils.photos.byAsset.invalidate({ assetId, projectId });
      utils.photos.recentlyDeleted.invalidate({ projectId });
      setIsDeleteDialogOpen(false);
      setSelectedPhoto(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete photo: ${error.message}`);
    }
  });

  const bulkDeleteMutation = trpc.photos.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} photos moved to Recently Deleted`);
      utils.photos.byAsset.invalidate({ assetId, projectId });
      utils.photos.recentlyDeleted.invalidate({ projectId });
      setIsBulkDeleteDialogOpen(false);
      setSelectedPhotos([]);
      setSelectionMode(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete photos: ${error.message}`);
    }
  });

  const handleDelete = () => {
    if (selectedPhoto) {
      deletePhotoMutation.mutate({ id: selectedPhoto.id });
    }
  };

  const handleBulkDelete = () => {
    if (selectedPhotos.length > 0) {
      bulkDeleteMutation.mutate({ ids: selectedPhotos });
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const togglePhotoSelection = (photoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const toggleSelectAll = () => {
    if (photos && selectedPhotos.length === photos.length) {
      setSelectedPhotos([]);
    } else if (photos) {
      setSelectedPhotos(photos.map(p => p.id));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPhotos([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          No photos uploaded yet. Use the upload section above to add photos.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRecentlyDeletedOpen(true)}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          View Recently Deleted
        </Button>
        <RecentlyDeletedDialog
          open={isRecentlyDeletedOpen}
          onOpenChange={setIsRecentlyDeletedOpen}
          projectId={projectId}
          assetId={assetId}
        />
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedPhotos.length === photos.length ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedPhotos.length} selected
              </span>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Select
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectionMode && selectedPhotos.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedPhotos.length})
            </Button>
          )}
          {selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSelectionMode}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRecentlyDeletedOpen(true)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Recently Deleted
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => {
          const hasLocation = photo.latitude && photo.longitude;
          const isSelected = selectedPhotos.includes(photo.id);
          return (
            <Card 
              key={photo.id} 
              className={`cursor-pointer hover:shadow-lg transition-all ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={(e) => {
                if (selectionMode) {
                  togglePhotoSelection(photo.id, e);
                } else {
                  setSelectedPhoto(photo);
                }
              }}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {selectionMode && (
                    <div 
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => togglePhotoSelection(photo.id, e)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="h-5 w-5 bg-white/90"
                      />
                    </div>
                  )}
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Asset photo'}
                    className={`w-full h-full object-cover rounded-t-lg ${
                      isSelected ? 'opacity-75' : ''
                    }`}
                  />
                  {/* Location indicator badge */}
                  {hasLocation && (
                    <div className="absolute top-2 right-2 bg-green-600/90 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>GPS</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      {photo.caption || 'No caption'}
                    </p>
                    <p className="text-white/70 text-xs">
                      {new Date(photo.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Photo Preview Dialog */}
      <Dialog open={!!selectedPhoto && !selectionMode} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.caption || 'Photo'}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Asset photo'}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Uploaded: {new Date(selectedPhoto.createdAt).toLocaleString()}</p>
                  
                  {/* Location display */}
                  {selectedPhoto.latitude && selectedPhoto.longitude ? (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-muted/50 rounded-md">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {formatCoordinates(selectedPhoto.latitude, selectedPhoto.longitude)}
                        </p>
                        {selectedPhoto.altitude && (
                          <p className="text-xs">
                            Altitude: {parseFloat(selectedPhoto.altitude).toFixed(1)}m
                          </p>
                        )}
                        {selectedPhoto.locationAccuracy && (
                          <p className="text-xs">
                            Accuracy: ±{parseFloat(selectedPhoto.locationAccuracy).toFixed(0)}m
                          </p>
                        )}
                        <a
                          href={getGoogleMapsUrl(selectedPhoto.latitude, selectedPhoto.longitude) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Google Maps
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      No location data
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedPhoto.url, `photo-${selectedPhoto.id}.jpg`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        itemType="photo"
        isLoading={deletePhotoMutation.isPending}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        itemCount={selectedPhotos.length}
        itemType="photo"
        isLoading={bulkDeleteMutation.isPending}
      />

      {/* Recently Deleted Dialog */}
      <RecentlyDeletedDialog
        open={isRecentlyDeletedOpen}
        onOpenChange={setIsRecentlyDeletedOpen}
        projectId={projectId}
        assetId={assetId}
      />
    </>
  );
}
