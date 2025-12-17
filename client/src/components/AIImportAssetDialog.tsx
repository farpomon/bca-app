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
    onSuccess: (data) => {
      const message = data.assessmentsCreated > 0 
        ? `Asset created successfully with ${data.assessmentsCreated} assessment${data.assessmentsCreated !== 1 ? 's' : ''}`
        : "Asset created successfully";
      toast.success(message);
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
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only PDF documents are supported");
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

  const [saveAssessments, setSaveAssessments] = useState(true);

  const handleSave = () => {
    if (!extractedData) return;

    // Extract asset data (handle both old flat structure and new nested structure)
    const assetData = extractedData.asset || extractedData;
    const assessmentsToSave = saveAssessments ? (extractedData.assessments || []) : [];

    createAsset.mutate({
      projectId,
      name: assetData.name || "Unnamed Asset",
      description: assetData.description || undefined,
      assetType: assetData.assetType || undefined,
      address: assetData.address || undefined,
      yearBuilt: assetData.yearBuilt || undefined,
      grossFloorArea: assetData.grossFloorArea || undefined,
      numberOfStories: assetData.numberOfStories || undefined,
      constructionType: assetData.constructionType || undefined,
      status: "active",
      assessments: assessmentsToSave.length > 0 ? assessmentsToSave : undefined,
    });
  };

  const handleClose = () => {
    setFile(null);
    setExtractedData(null);
    setIsProcessing(false);
    onOpenChange(false);
  };

  const handleFieldChange = (field: string, value: any) => {
    setExtractedData((prev: any) => {
      // Handle nested asset structure
      if (prev.asset) {
        return {
          ...prev,
          asset: {
            ...prev.asset,
            [field]: value,
          },
        };
      }
      // Handle flat structure (backward compatibility)
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Get asset data (handle both structures)
  const assetData = extractedData?.asset || extractedData;
  const assessments = extractedData?.assessments || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Import Asset
          </DialogTitle>
          <DialogDescription>
            Upload a PDF document containing asset information. AI will extract the details automatically.
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
                  accept=".pdf,application/pdf"
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
                  PDF documents only (max 10MB)
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
                    value={assetData?.name || ""}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Enter asset name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assetType">Asset Type</Label>
                  <Input
                    id="assetType"
                    value={assetData?.assetType || ""}
                    onChange={(e) => handleFieldChange("assetType", e.target.value)}
                    placeholder="e.g., Office Building, School, Hospital"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={assetData?.address || ""}
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
                      value={assetData?.yearBuilt || ""}
                      onChange={(e) => handleFieldChange("yearBuilt", parseInt(e.target.value) || null)}
                      placeholder="e.g., 1995"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grossFloorArea">Gross Floor Area (sq ft)</Label>
                    <Input
                      id="grossFloorArea"
                      type="number"
                      value={assetData?.grossFloorArea || ""}
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
                      value={assetData?.numberOfStories || ""}
                      onChange={(e) => handleFieldChange("numberOfStories", parseInt(e.target.value) || null)}
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="constructionType">Construction Type</Label>
                    <Input
                      id="constructionType"
                      value={assetData?.constructionType || ""}
                      onChange={(e) => handleFieldChange("constructionType", e.target.value)}
                      placeholder="e.g., Steel Frame"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={assetData?.description || ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Enter description"
                    rows={4}
                  />
                </div>

                {/* Assessments Preview */}
                {assessments.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">UNIFORMAT II Assessments</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {assessments.length} component assessment{assessments.length !== 1 ? 's' : ''} found in document
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="saveAssessments"
                          checked={saveAssessments}
                          onChange={(e) => setSaveAssessments(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="saveAssessments" className="cursor-pointer text-sm font-normal">
                          Import assessments
                        </Label>
                      </div>
                    </div>

                    {saveAssessments && (
                      <div className="max-h-60 overflow-y-auto space-y-2 bg-muted/30 p-3 rounded-lg">
                        {assessments.map((assessment: any, index: number) => (
                          <div key={index} className="bg-background p-3 rounded border text-sm">
                            <div className="font-medium">
                              {assessment.componentCode} - {assessment.componentName}
                            </div>
                            {assessment.componentLocation && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Location: {assessment.componentLocation}
                              </div>
                            )}
                            <div className="flex gap-4 mt-2 text-xs">
                              <span className="font-medium">Condition: <span className="font-normal capitalize">{assessment.condition}</span></span>
                              {assessment.estimatedRepairCost && (
                                <span className="font-medium">Cost: <span className="font-normal">${assessment.estimatedRepairCost.toLocaleString()}</span></span>
                              )}
                              {assessment.remainingUsefulLife && (
                                <span className="font-medium">RUL: <span className="font-normal">{assessment.remainingUsefulLife} years</span></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!assetData?.name || createAsset.isPending}
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
