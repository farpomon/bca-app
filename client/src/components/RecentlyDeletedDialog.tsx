/**
 * RecentlyDeletedDialog - Shows soft-deleted photos and documents with restore/permanent delete options
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { 
  Image, 
  FileText, 
  RotateCcw, 
  Trash2, 
  Clock,
  ImageOff,
  FileX
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentlyDeletedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  assetId?: number;
}

export function RecentlyDeletedDialog({
  open,
  onOpenChange,
  projectId,
  assetId,
}: RecentlyDeletedDialogProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false);
  const [deleteType, setDeleteType] = useState<"photo" | "document">("photo");
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  const utils = trpc.useUtils();

  // Fetch recently deleted photos
  const { data: deletedPhotos = [], isLoading: loadingPhotos } = trpc.photos.recentlyDeleted.useQuery(
    { projectId },
    { enabled: open }
  );

  // Fetch recently deleted documents (if assetId provided)
  const { data: deletedDocuments = [], isLoading: loadingDocuments } = trpc.assetDocuments.recentlyDeleted.useQuery(
    { assetId: assetId || 0 },
    { enabled: open && !!assetId }
  );

  // Restore photo mutation
  const restorePhotoMutation = trpc.photos.restore.useMutation({
    onSuccess: () => {
      utils.photos.recentlyDeleted.invalidate();
      utils.photos.list.invalidate();
      utils.photos.byAsset.invalidate();
      toast.success("Photo restored successfully");
    },
    onError: (error) => {
      toast.error(`Failed to restore photo: ${error.message}`);
    },
  });

  // Restore document mutation
  const restoreDocumentMutation = trpc.assetDocuments.restore.useMutation({
    onSuccess: () => {
      utils.assetDocuments.recentlyDeleted.invalidate();
      utils.assetDocuments.list.invalidate();
      toast.success("Document restored successfully");
    },
    onError: (error) => {
      toast.error(`Failed to restore document: ${error.message}`);
    },
  });

  // Permanent delete photo mutation
  const permanentDeletePhotoMutation = trpc.photos.permanentDelete.useMutation({
    onSuccess: () => {
      utils.photos.recentlyDeleted.invalidate();
      toast.success("Photo permanently deleted");
      setSelectedPhotos([]);
    },
    onError: (error) => {
      toast.error(`Failed to delete photo: ${error.message}`);
    },
  });

  // Permanent delete document mutation
  const permanentDeleteDocumentMutation = trpc.assetDocuments.permanentDelete.useMutation({
    onSuccess: () => {
      utils.assetDocuments.recentlyDeleted.invalidate();
      toast.success("Document permanently deleted");
      setSelectedDocuments([]);
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });

  const handleRestorePhoto = (photoId: number) => {
    restorePhotoMutation.mutate({ id: photoId });
  };

  const handleRestoreDocument = (documentId: number) => {
    restoreDocumentMutation.mutate({ documentId });
  };

  const handlePermanentDeletePhotos = () => {
    setDeleteType("photo");
    setDeleteIds(selectedPhotos.length > 0 ? selectedPhotos : []);
    setConfirmPermanentDelete(true);
  };

  const handlePermanentDeleteDocuments = () => {
    setDeleteType("document");
    setDeleteIds(selectedDocuments.length > 0 ? selectedDocuments : []);
    setConfirmPermanentDelete(true);
  };

  const confirmPermanentDeleteAction = async () => {
    if (deleteType === "photo") {
      for (const id of deleteIds) {
        await permanentDeletePhotoMutation.mutateAsync({ id });
      }
    } else {
      for (const id of deleteIds) {
        await permanentDeleteDocumentMutation.mutateAsync({ documentId: id });
      }
    }
    setConfirmPermanentDelete(false);
    setDeleteIds([]);
  };

  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const toggleDocumentSelection = (docId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectAllPhotos = () => {
    if (selectedPhotos.length === deletedPhotos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(deletedPhotos.map(p => p.id));
    }
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.length === deletedDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(deletedDocuments.map(d => d.id));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-muted-foreground" />
              Recently Deleted
            </DialogTitle>
            <DialogDescription>
              Items here will be automatically deleted after 30 days. You can restore them or delete permanently.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="photos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="photos" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Photos ({deletedPhotos.length})
              </TabsTrigger>
              {assetId && (
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents ({deletedDocuments.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="photos" className="mt-4">
              {deletedPhotos.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPhotos.length === deletedPhotos.length && deletedPhotos.length > 0}
                      onCheckedChange={selectAllPhotos}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedPhotos.length > 0 ? `${selectedPhotos.length} selected` : "Select all"}
                    </span>
                  </div>
                  {selectedPhotos.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handlePermanentDeletePhotos}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Permanently
                    </Button>
                  )}
                </div>
              )}

              <ScrollArea className="h-[400px]">
                {loadingPhotos ? (
                  <div className="flex items-center justify-center h-32">
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : deletedPhotos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <ImageOff className="h-12 w-12 mb-2" />
                    <p>No deleted photos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {deletedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative border rounded-lg overflow-hidden group"
                      >
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedPhotos.includes(photo.id)}
                            onCheckedChange={() => togglePhotoSelection(photo.id)}
                          />
                        </div>
                        <img
                          src={photo.url}
                          alt={photo.caption || "Deleted photo"}
                          className="w-full h-32 object-cover opacity-60"
                        />
                        <div className="p-2 bg-muted/50">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Deleted {photo.deletedAt ? formatDistanceToNow(new Date(photo.deletedAt), { addSuffix: true }) : "recently"}
                          </p>
                          <div className="flex gap-1 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              onClick={() => handleRestorePhoto(photo.id)}
                              disabled={restorePhotoMutation.isPending}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setDeleteType("photo");
                                setDeleteIds([photo.id]);
                                setConfirmPermanentDelete(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {assetId && (
              <TabsContent value="documents" className="mt-4">
                {deletedDocuments.length > 0 && (
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedDocuments.length === deletedDocuments.length && deletedDocuments.length > 0}
                        onCheckedChange={selectAllDocuments}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedDocuments.length > 0 ? `${selectedDocuments.length} selected` : "Select all"}
                      </span>
                    </div>
                    {selectedDocuments.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handlePermanentDeleteDocuments}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Permanently
                      </Button>
                    )}
                  </div>
                )}

                <ScrollArea className="h-[400px]">
                  {loadingDocuments ? (
                    <div className="flex items-center justify-center h-32">
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : deletedDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <FileX className="h-12 w-12 mb-2" />
                      <p>No deleted documents</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deletedDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={() => toggleDocumentSelection(doc.id)}
                          />
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Deleted {doc.deletedAt ? formatDistanceToNow(new Date(doc.deletedAt), { addSuffix: true }) : "recently"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreDocument(doc.id)}
                              disabled={restoreDocumentMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setDeleteType("document");
                                setDeleteIds([doc.id]);
                                setConfirmPermanentDelete(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={confirmPermanentDelete}
        onOpenChange={setConfirmPermanentDelete}
        onConfirm={confirmPermanentDeleteAction}
        itemCount={deleteIds.length}
        itemType={deleteType}
        isPermanent={true}
        isLoading={permanentDeletePhotoMutation.isPending || permanentDeleteDocumentMutation.isPending}
      />
    </>
  );
}
