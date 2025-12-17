import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X, Download, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AssetPhotoGalleryProps {
  assetId: number;
}

export default function AssetPhotoGallery({ assetId }: AssetPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: photos, isLoading } = trpc.photos.byAsset.useQuery({ assetId });
  const utils = trpc.useUtils();
  
  const deletePhotoMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success('Photo deleted successfully');
      utils.photos.byAsset.invalidate({ assetId });
      setIsDeleteDialogOpen(false);
      setSelectedPhoto(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete photo: ${error.message}`);
    }
  });

  const handleDelete = () => {
    if (selectedPhoto) {
      deletePhotoMutation.mutate({ id: selectedPhoto.id });
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
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
        <p className="text-sm text-muted-foreground">
          No photos uploaded yet. Use the upload section above to add photos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <Card 
            key={photo.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedPhoto(photo)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <img
                  src={photo.url}
                  alt={photo.caption || 'Asset photo'}
                  className="w-full h-full object-cover rounded-t-lg"
                />
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
        ))}
      </div>

      {/* Photo Preview Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
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
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Uploaded: {new Date(selectedPhoto.createdAt).toLocaleString()}</p>
                  {selectedPhoto.location && <p>Location: {selectedPhoto.location}</p>}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this photo? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deletePhotoMutation.isPending}
            >
              {deletePhotoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
