import { FileText, Download, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";

interface DocumentListProps {
  assessmentId: number;
}

export function DocumentList({ assessmentId }: DocumentListProps) {
  const utils = trpc.useUtils();
  
  const { data: documents, isLoading } = trpc.assessmentDocuments.list.useQuery({
    assessmentId,
  });

  const deleteMutation = trpc.assessmentDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      utils.assessmentDocuments.list.invalidate({ assessmentId });
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
        Loading documents...
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
        No documents uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.fileName}</p>
              {doc.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {doc.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                </span>
                <span>
                  {format(new Date(doc.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(doc.url, "_blank")}
                title="View document"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(doc.url, doc.fileName)}
                title="Download document"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this document?")) {
                    deleteMutation.mutate({ documentId: doc.id });
                  }
                }}
                title="Delete document"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
