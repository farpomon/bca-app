import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, Loader2, FileText, Sparkles } from "lucide-react";

interface AIImportAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSuccess: () => void;
}

export function AIImportAssetDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: AIImportAssetDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiImport = trpc.assets.aiImport.useMutation({
    onSuccess: (data) => {
      setExtractedData(data.extractedData);
      setIsProcessing(false);
      toast.success("Document parsed successfully! Review the extracted information.");
    },
    onError: (error) => {
      toast.error(`Failed to parse document: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const createAsset = trpc.assets.create.useMutation({
    onSuccess: () => {
      toast.success("Asset created successfully");
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast.error(`Failed to create asset: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only PDF and Word documents are supported");
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsProcessing(true);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const base64Content = base64.split(",")[1]; // Remove data:mime;base64, prefix

      aiImport.mutate({
        projectId,
        fileContent: base64Content,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!extractedData) return;

    createAsset.mutate({
      projectId,
      name: extractedData.name || "Unnamed Asset",
      description: extractedData.description || undefined,
      assetType: extractedData.assetType || undefined,
      address: extractedData.address || undefined,
      yearBuilt: extractedData.yearBuilt || undefined,
      grossFloorArea: extractedData.grossFloorArea || undefined,
      numberOfStories: extractedData.numberOfStories || undefined,
      constructionType: extractedData.constructionType || undefined,
      status: "active",
    });
  };

  const handleClose = () => {
    setFile(null);
    setExtractedData(null);
    setIsProcessing(false);
    onOpenChange(false);
  };

  const handleFieldChange = (field: string, value: any) => {
    setExtractedData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Import Asset
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or Word document containing asset information. AI will extract the details automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          {!extractedData && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  {file ? file.name : "Click to upload or drag and drop"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF or Word documents (max 10MB)
                </p>
              </div>

              {file && (
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
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
              )}
            </div>
          )}

          {/* Extracted Data Form */}
          {extractedData && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">✓ Document parsed successfully</p>
                <p className="text-xs text-muted-foreground">
                  Review and edit the extracted information below, then save to create the asset.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={extractedData.name || ""}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Enter asset name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assetType">Asset Type</Label>
                  <Input
                    id="assetType"
                    value={extractedData.assetType || ""}
                    onChange={(e) => handleFieldChange("assetType", e.target.value)}
                    placeholder="e.g., Office Building, School, Hospital"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={extractedData.address || ""}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    placeholder="Enter address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yearBuilt">Year Built</Label>
                    <Input
                      id="yearBuilt"
                      type="number"
                      value={extractedData.yearBuilt || ""}
                      onChange={(e) => handleFieldChange("yearBuilt", parseInt(e.target.value) || null)}
                      placeholder="e.g., 1995"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grossFloorArea">Gross Floor Area (sq ft)</Label>
                    <Input
                      id="grossFloorArea"
                      type="number"
                      value={extractedData.grossFloorArea || ""}
                      onChange={(e) => handleFieldChange("grossFloorArea", parseInt(e.target.value) || null)}
                      placeholder="e.g., 50000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numberOfStories">Number of Stories</Label>
                    <Input
                      id="numberOfStories"
                      type="number"
                      value={extractedData.numberOfStories || ""}
                      onChange={(e) => handleFieldChange("numberOfStories", parseInt(e.target.value) || null)}
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="constructionType">Construction Type</Label>
                    <Input
                      id="constructionType"
                      value={extractedData.constructionType || ""}
                      onChange={(e) => handleFieldChange("constructionType", e.target.value)}
                      placeholder="e.g., Steel Frame"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={extractedData.description || ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Enter description"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!extractedData.name || createAsset.isPending}
                  className="flex-1"
                >
                  {createAsset.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Asset"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
