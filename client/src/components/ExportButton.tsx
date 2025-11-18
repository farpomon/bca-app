import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  projectId: number;
  type: "deficiencies" | "assessments" | "costs";
  label: string;
}

export default function ExportButton({ projectId, type, label }: ExportButtonProps) {
  const { data, isLoading, refetch } = trpc.exports[type].useQuery(
    { projectId },
    { enabled: false } // Don't auto-fetch, only on button click
  );

  const handleExport = async () => {
    try {
      const result = await refetch();
      if (result.data) {
        // Create blob and download
        const blob = new Blob([result.data.csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success(`${label} exported successfully`);
      }
    } catch (error) {
      toast.error(`Failed to export ${label.toLowerCase()}`);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
