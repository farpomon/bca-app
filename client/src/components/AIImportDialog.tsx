import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, FileText, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AIImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ExtractedData = {
  project: {
    name: string;
    address?: string | null;
    clientName?: string | null;
    propertyType?: string | null;
    constructionType?: string | null;
    yearBuilt?: number | null;
    numberOfUnits?: number | null;
    numberOfStories?: number | null;
    observations?: string | null;
  };
  assessments: Array<{
    componentCode: string;
    componentName: string;
    componentLocation?: string | null;
    condition: "excellent" | "good" | "fair" | "poor" | "critical";
    conditionPercentage?: number | null;
    observations?: string | null;
    recommendations?: string | null;
    remainingUsefulLife?: number | null;
    expectedUsefulLife?: number | null;
    estimatedRepairCost?: number | null;
    replacementValue?: number | null;
  }>;
  deficiencies: Array<{
    componentCode: string;
    title: string;
    description: string;
    location?: string | null;
    severity: "low" | "medium" | "high" | "critical";
    priority: "immediate" | "short_term" | "medium_term" | "long_term";
    estimatedCost?: number | null;
    recommendedAction?: string | null;
  }>;
  confidence: "high" | "medium" | "low";
  warnings: string[];
};

export function AIImportDialog({ open, onOpenChange, onSuccess }: AIImportDialogProps) {
  const [step, setStep] = useState<"upload" | "processing" | "preview">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);

  const parseDocumentMutation = trpc.projects.parseDocument.useMutation();
  const commitImportMutation = trpc.projects.commitAIImport.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      
      if (!validTypes.includes(droppedFile.type)) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      
      if (droppedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      setFile(droppedFile);
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) return;

    setStep("processing");
    setUploadProgress(0);

    try {
      // Upload file to storage
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(30);

      // Upload to server (you'll need to implement this endpoint)
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const { url: fileUrl } = await uploadResponse.json();
      setUploadProgress(50);

      // Parse document with AI
      const extracted = await parseDocumentMutation.mutateAsync({
        fileUrl,
        mimeType: file.type,
      });

      setUploadProgress(100);
      setExtractedData(extracted);
      setEditedData(extracted);
      setStep("preview");
      
      toast.success("Document parsed successfully!");
    } catch (error) {
      console.error("Upload/parse error:", error);
      toast.error("Failed to parse document. Please try again.");
      setStep("upload");
    }
  };

  const handleConfirmImport = async () => {
    if (!editedData) return;

    try {
      const result = await commitImportMutation.mutateAsync(editedData);
      
      toast.success(
        `Project imported successfully! ${result.assessmentCount} assessments and ${result.deficiencyCount} deficiencies added.`
      );
      
      onOpenChange(false);
      onSuccess?.();
      
      // Reset state
      setStep("upload");
      setFile(null);
      setExtractedData(null);
      setEditedData(null);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import project. Please try again.");
    }
  };

  const handleCancel = () => {
    setStep("upload");
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Import
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or Word BCA report and let AI extract the data automatically
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {file ? file.name : "Drop your document here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PDF and Word documents (max 10MB)
              </p>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button onClick={handleUploadAndParse} disabled={parseDocumentMutation.isPending}>
                  {parseDocumentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Parse with AI
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-medium">AI is analyzing your document...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Extracting project data, assessments, and deficiencies
                </p>
              </div>
              <div className="w-full max-w-md">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {uploadProgress}% complete
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && editedData && (
          <div className="space-y-6">
            {/* Confidence indicator */}
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                AI extraction confidence: <strong className="capitalize">{extractedData?.confidence}</strong>
                {extractedData?.warnings && extractedData.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {extractedData.warnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Project info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Project Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Project Name *</Label>
                  <Input
                    value={editedData.project.name}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        project: { ...editedData.project, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Client Name</Label>
                  <Input
                    value={editedData.project.clientName || ""}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        project: { ...editedData.project, clientName: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={editedData.project.address || ""}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        project: { ...editedData.project, address: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Assessments</p>
                <p className="text-2xl font-bold">{editedData.assessments.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deficiencies</p>
                <p className="text-2xl font-bold">{editedData.deficiencies.length}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={commitImportMutation.isPending || !editedData.project.name}
              >
                {commitImportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm Import
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
