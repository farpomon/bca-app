import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, FileText, AlertCircle, CheckCircle2, Sparkles, HardDrive, Pause, Play, RefreshCw, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIImportDialogEnhancedProps {
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
    condition: "good" | "fair" | "poor" | "not_assessed";
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
    title?: string | null;
    description?: string | null;
    location?: string | null;
    severity: "low" | "medium" | "high" | "critical";
    priority: "immediate" | "short_term" | "medium_term" | "long_term";
    estimatedCost?: number | null;
    recommendedAction?: string | null;
  }>;
  photos?: Array<{
    url: string;
    fileKey: string;
    caption?: string | null;
    context?: string | null;
    componentCode?: string | null;
  }>;
  confidence?: "high" | "medium" | "low";
  warnings?: string[];
};

interface ChunkedUploadState {
  status: 'idle' | 'initializing' | 'uploading' | 'paused' | 'completing' | 'complete' | 'error';
  sessionId: string | null;
  filename: string | null;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  error: string | null;
}

const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
const STANDARD_MAX_SIZE = 10 * 1024 * 1024; // 10MB for standard upload
const CHUNKED_MAX_SIZE = 100 * 1024 * 1024; // 100MB for chunked upload

export function AIImportDialogEnhanced({ open, onOpenChange, onSuccess }: AIImportDialogEnhancedProps) {
  const [step, setStep] = useState<"upload" | "processing" | "preview">("upload");
  const [uploadMode, setUploadMode] = useState<"standard" | "chunked">("standard");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  
  // Chunked upload state
  const [chunkedState, setChunkedState] = useState<ChunkedUploadState>({
    status: 'idle',
    sessionId: null,
    filename: null,
    totalChunks: 0,
    uploadedChunks: 0,
    progress: 0,
    error: null,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // @ts-ignore - Type will be available after server restart
  const parseDocumentMutation = trpc.buildingSections.parseDocument.useMutation();
  // @ts-ignore - Type will be available after server restart  
  const commitImportMutation = trpc.buildingSections.commitAIImport.useMutation();

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setUploadProgress(0);
    setExtractedData(null);
    setEditedData(null);
    setChunkedState({
      status: 'idle',
      sessionId: null,
      filename: null,
      totalChunks: 0,
      uploadedChunks: 0,
      progress: 0,
      error: null,
    });
    setIsPaused(false);
    setAbortController(null);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Validate file type
    const validTypes = ["application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Please upload a PDF document");
      return;
    }

    // Determine upload mode based on file size
    const maxSize = uploadMode === "chunked" ? CHUNKED_MAX_SIZE : STANDARD_MAX_SIZE;
    
    if (selectedFile.size > maxSize) {
      if (uploadMode === "standard" && selectedFile.size <= CHUNKED_MAX_SIZE) {
        toast.info("File is large. Switching to chunked upload mode for better reliability.");
        setUploadMode("chunked");
      } else {
        toast.error(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
    }

    // Auto-switch to chunked mode for files > 5MB
    if (selectedFile.size > 5 * 1024 * 1024 && uploadMode === "standard") {
      setUploadMode("chunked");
    }

    setFile(selectedFile);
  };

  // Standard upload handler
  const handleStandardUpload = async () => {
    if (!file) return;

    setStep("processing");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(30);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const { url: fileUrl } = await uploadResponse.json();
      setUploadProgress(50);

      const extracted = await parseDocumentMutation.mutateAsync({
        fileUrl,
        mimeType: file.type,
      });

      setUploadProgress(100);
      setExtractedData(extracted);
      setEditedData(extracted);
      setStep("preview");
      
      toast.success("Document parsed successfully!");
    } catch (error: any) {
      console.error("Upload/parse error:", error);
      
      let errorMessage = "Failed to parse document. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 6000,
        description: "Please check the document format and try again."
      });
      
      resetState();
    }
  };

  // Chunked upload handlers
  const initChunkedSession = async (file: File): Promise<{ sessionId: string; totalChunks: number } | null> => {
    try {
      const response = await fetch('/api/upload/chunked/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          totalSize: file.size,
          chunkSize: DEFAULT_CHUNK_SIZE,
          metadata: { type: 'ai-document-import' },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize upload');
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ChunkedUpload] Init failed:', error);
      return null;
    }
  };

  const uploadChunk = async (
    sessionId: string,
    file: File,
    chunkIndex: number,
    signal: AbortSignal
  ): Promise<boolean> => {
    const start = chunkIndex * DEFAULT_CHUNK_SIZE;
    const end = Math.min(start + DEFAULT_CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    
    try {
      const response = await fetch(`/api/upload/chunked/${sessionId}/chunk`, {
        method: 'POST',
        body: formData,
        signal,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload chunk');
      }
      
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return false;
      }
      console.error(`[ChunkedUpload] Chunk ${chunkIndex} failed:`, error);
      return false;
    }
  };

  const completeChunkedUpload = async (sessionId: string): Promise<{ url: string; filename: string } | null> => {
    try {
      const response = await fetch(`/api/upload/chunked/${sessionId}/complete`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete upload');
      }
      
      const result = await response.json();
      return result.file;
    } catch (error) {
      console.error('[ChunkedUpload] Complete failed:', error);
      return null;
    }
  };

  const handleChunkedUpload = async () => {
    if (!file) return;

    setStep("processing");
    setChunkedState(prev => ({
      ...prev,
      status: 'initializing',
      filename: file.name,
      error: null,
    }));

    try {
      // Initialize session
      const session = await initChunkedSession(file);
      if (!session) {
        throw new Error('Failed to initialize upload session');
      }

      const { sessionId, totalChunks } = session;
      
      setChunkedState(prev => ({
        ...prev,
        status: 'uploading',
        sessionId,
        totalChunks,
      }));

      // Upload chunks
      const controller = new AbortController();
      setAbortController(controller);
      
      let uploadedCount = 0;

      for (let i = 0; i < totalChunks; i++) {
        // Check for pause
        while (isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (controller.signal.aborted) return;
        }

        if (controller.signal.aborted) return;

        const success = await uploadChunk(sessionId, file, i, controller.signal);
        
        if (!success) {
          if (controller.signal.aborted) return;
          
          // Retry once
          const retrySuccess = await uploadChunk(sessionId, file, i, controller.signal);
          if (!retrySuccess) {
            throw new Error(`Failed to upload chunk ${i + 1}`);
          }
        }

        uploadedCount++;
        const progress = (uploadedCount / totalChunks) * 100;
        
        setChunkedState(prev => ({
          ...prev,
          uploadedChunks: uploadedCount,
          progress,
        }));
      }

      // Complete upload
      setChunkedState(prev => ({ ...prev, status: 'completing' }));
      
      const result = await completeChunkedUpload(sessionId);
      if (!result) {
        throw new Error('Failed to complete upload');
      }

      setChunkedState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
      }));

      // Now parse the document
      setUploadProgress(50);
      
      const extracted = await parseDocumentMutation.mutateAsync({
        fileUrl: result.url,
        mimeType: file.type,
      });

      setUploadProgress(100);
      setExtractedData(extracted);
      setEditedData(extracted);
      setStep("preview");
      
      toast.success("Large document uploaded and parsed successfully!");
    } catch (error: any) {
      console.error("Chunked upload/parse error:", error);
      
      setChunkedState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Upload failed',
      }));
      
      toast.error(error.message || "Failed to upload document", {
        duration: 6000,
      });
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    setChunkedState(prev => ({
      ...prev,
      status: isPaused ? 'uploading' : 'paused',
    }));
  };

  const handleCancelChunked = async () => {
    abortController?.abort();
    
    if (chunkedState.sessionId) {
      try {
        await fetch(`/api/upload/chunked/${chunkedState.sessionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('[ChunkedUpload] Cancel failed:', error);
      }
    }
    
    resetState();
  };

  const handleUploadAndParse = async () => {
    if (uploadMode === "chunked") {
      await handleChunkedUpload();
    } else {
      await handleStandardUpload();
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
      resetState();
    } catch (error: any) {
      console.error("Import error:", error);
      
      let errorMessage = "Failed to import project. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  const handleCancel = () => {
    if (chunkedState.status === 'uploading' || chunkedState.status === 'paused') {
      handleCancelChunked();
    } else {
      resetState();
      onOpenChange(false);
    }
  };

  const getFileSizeDisplay = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
            Upload a PDF BCA report and let AI extract the data automatically
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            {/* Upload Mode Tabs */}
            <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "standard" | "chunked")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="standard" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Standard Upload
                </TabsTrigger>
                <TabsTrigger value="chunked" className="gap-2">
                  <HardDrive className="h-4 w-4" />
                  Large File Upload
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="standard" className="mt-4">
                <Alert>
                  <AlertDescription>
                    Standard upload supports files up to <strong>10MB</strong>. For larger documents, use Large File Upload.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              <TabsContent value="chunked" className="mt-4">
                <Alert>
                  <AlertDescription>
                    Large File Upload supports files up to <strong>100MB</strong> with pause/resume capability and better reliability for large BCA documents.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => document.getElementById("file-input-enhanced")?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {file ? file.name : "Drop your document here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground">
                PDF documents only (max {uploadMode === "chunked" ? "100MB" : "10MB"})
              </p>
              <input
                id="file-input-enhanced"
                type="file"
                accept=".pdf,application/pdf"
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
                    {getFileSizeDisplay(file.size)}
                    {file.size > 5 * 1024 * 1024 && uploadMode === "chunked" && (
                      <span className="ml-2 text-amber-600">(Using chunked upload)</span>
                    )}
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
            {uploadMode === "chunked" && chunkedState.status !== 'idle' ? (
              // Chunked upload progress
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {chunkedState.status === 'complete' ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : chunkedState.status === 'error' ? (
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  ) : chunkedState.status === 'paused' ? (
                    <Pause className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{chunkedState.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {chunkedState.status === 'initializing' && 'Initializing upload...'}
                      {chunkedState.status === 'uploading' && `Uploading: ${chunkedState.uploadedChunks}/${chunkedState.totalChunks} chunks`}
                      {chunkedState.status === 'paused' && 'Upload paused'}
                      {chunkedState.status === 'completing' && 'Finalizing upload...'}
                      {chunkedState.status === 'complete' && 'Upload complete! Parsing document...'}
                      {chunkedState.status === 'error' && (chunkedState.error || 'Upload failed')}
                    </p>
                  </div>
                  {(chunkedState.status === 'uploading' || chunkedState.status === 'paused') && (
                    <Button variant="ghost" size="sm" onClick={handleCancelChunked}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Progress value={chunkedState.progress} className="h-2" />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{chunkedState.progress.toFixed(1)}%</span>
                  <span>{chunkedState.uploadedChunks}/{chunkedState.totalChunks} chunks</span>
                </div>
                
                <div className="flex gap-2">
                  {chunkedState.status === 'uploading' && (
                    <Button variant="outline" size="sm" onClick={handlePauseResume}>
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  
                  {chunkedState.status === 'paused' && (
                    <Button variant="outline" size="sm" onClick={handlePauseResume}>
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  )}
                  
                  {chunkedState.status === 'error' && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleChunkedUpload}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                      <Button variant="ghost" size="sm" onClick={resetState}>
                        Start Over
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // Standard upload progress
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-lg font-medium">AI is analyzing your document...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Extracting project data, assessments, and deficiencies
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {uploadProgress}% complete
                  </p>
                </div>
              </div>
            )}
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
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Assessments</p>
                <p className="text-2xl font-bold">{editedData.assessments.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deficiencies</p>
                <p className="text-2xl font-bold">{editedData.deficiencies.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Photos</p>
                <p className="text-2xl font-bold">{editedData.photos?.length || 0}</p>
              </div>
            </div>

            {/* Cost Summary */}
            {(() => {
              const totalRepairCost = editedData.assessments.reduce((sum, a) => sum + (a.estimatedRepairCost || 0), 0);
              const totalReplacementValue = editedData.assessments.reduce((sum, a) => sum + (a.replacementValue || 0), 0);
              if (totalRepairCost > 0 || totalReplacementValue > 0) {
                return (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Repair Cost</p>
                      <p className="text-xl font-bold text-amber-600">
                        ${totalRepairCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Replacement Value</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${totalReplacementValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Assessments Preview */}
            {editedData.assessments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Extracted Assessments ({editedData.assessments.length})</h3>
                <div className="max-h-60 overflow-y-auto space-y-2 bg-muted/30 p-3 rounded-lg">
                  {editedData.assessments.map((assessment, index) => (
                    <div key={index} className="bg-background p-3 rounded border text-sm">
                      <div className="font-medium">
                        {assessment.componentCode} - {assessment.componentName}
                      </div>
                      {assessment.componentLocation && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Location: {assessment.componentLocation}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                        <span className="font-medium">Condition: <span className="font-normal capitalize">{assessment.condition}</span></span>
                        {assessment.estimatedRepairCost != null && assessment.estimatedRepairCost > 0 && (
                          <span className="font-medium">Repair: <span className="font-normal text-amber-600">${assessment.estimatedRepairCost.toLocaleString()}</span></span>
                        )}
                        {assessment.replacementValue != null && assessment.replacementValue > 0 && (
                          <span className="font-medium">Replacement: <span className="font-normal text-blue-600">${assessment.replacementValue.toLocaleString()}</span></span>
                        )}
                        {assessment.remainingUsefulLife && (
                          <span className="font-medium">RUL: <span className="font-normal">{assessment.remainingUsefulLife} years</span></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
