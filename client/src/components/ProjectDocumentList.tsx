import { FileText, FileSpreadsheet, FileImage, File as FileIcon, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useState } from "react";
import { toast } from "sonner";

interface Document {
  id: number;
  fileName: string;
  url: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: number;
  description: string | null;
  createdAt: string;
}

interface ProjectDocumentListProps {
  documents: Document[];
  onDelete: (documentId: number) => Promise<void>;
  isLoading?: boolean;
}

/**
 * ProjectDocumentList - Display list of uploaded documents with download/delete actions
 * 
 * Features:
 * - File type icons
 * - File size display
 * - Download functionality
 * - Delete with confirmation
 * - Empty state
 */
export function ProjectDocumentList({ documents, onDelete, isLoading = false }: ProjectDocumentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    if (mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    }
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    }
    if (mimeType.includes("image")) {
      return <FileImage className="h-8 w-8 text-purple-500" />;
    }
    return <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = (url: string, fileName: string) => {
    // Open in new tab for download
    window.open(url, "_blank");
  };

  const handleDeleteClick = (documentId: number) => {
    setSelectedDocId(documentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedDocId === null) return;

    setIsDeleting(true);
    try {
      await onDelete(selectedDocId);
      toast.success("Document deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedDocId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <FileIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => (
          <Card key={doc.id} className="p-4">
            <div className="flex items-start gap-3">
              {getFileIcon(doc.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>{formatDate(doc.createdAt)}</span>
                </div>
                {doc.description && (
                  <p className="text-xs text-muted-foreground mt-2">{doc.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc.url, doc.fileName)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteClick(doc.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
