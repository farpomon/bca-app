import { Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

interface BulkDownloadButtonProps {
  assessmentId: number;
}

export function BulkDownloadButton({ assessmentId }: BulkDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { data: documents } = trpc.assessmentDocuments.list.useQuery({
    assessmentId,
  });

  const downloadZip = trpc.assessmentDocuments.downloadAllAsZip.useMutation({
    onSuccess: (result) => {
      // Download the ZIP file
      const link = document.createElement("a");
      link.href = result.url;
      link.download = result.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Documents downloaded successfully");
      setIsDownloading(false);
    },
    onError: (error) => {
      toast.error(`Download failed: ${error.message}`);
      setIsDownloading(false);
    },
  });

  const handleDownload = () => {
    if (!documents || documents.length === 0) {
      toast.error("No documents to download");
      return;
    }
    
    setIsDownloading(true);
    downloadZip.mutate({ assessmentId });
  };

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Creating ZIP...
        </>
      ) : (
        <>
          <Archive className="h-4 w-4 mr-2" />
          Download All ({documents.length})
        </>
      )}
    </Button>
  );
}
