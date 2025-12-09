import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Upload, X, Sparkles, Mic } from "lucide-react";
import { ValidationWarning } from "@/components/ValidationWarning";
import { RichTextEditor } from "@/components/RichTextEditor";
import { VoiceRecorder } from "@/components/VoiceRecorder";

interface AssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  assetId: number;
  componentCode: string;
  componentName: string;
  existingAssessment?: {
    condition: string;
    conditionPercentage?: string | null;
    componentName?: string | null;
    componentLocation?: string | null;
    observations?: string | null;
    recommendations?: string | null;
    remainingUsefulLife?: number | null;
    expectedUsefulLife?: number | null;
    reviewYear?: number | null;
    lastTimeAction?: number | null;
    estimatedRepairCost?: number | null;
    replacementValue?: number | null;
    actionYear?: number | null;
  };
  onSuccess: () => void;
}

// Condition percentage mappings based on Maben report
const CONDITION_PERCENTAGES: Record<string, string> = {
  "good": "90-75% of ESL",
  "fair": "75-50% of ESL",
  "poor": "50-25% of ESL",
  "not_assessed": "",
};

export function AssessmentDialog({
  open,
  onOpenChange,
  projectId,
  assetId,
  componentCode,
  componentName,
  existingAssessment,
  onSuccess,
}: AssessmentDialogProps) {
  const [condition, setCondition] = useState(existingAssessment?.condition || "not_assessed");
  const [status, setStatus] = useState<"initial" | "active" | "completed">("initial");
  const [componentNameField, setComponentNameField] = useState("");
  const [componentLocationField, setComponentLocationField] = useState("");

  // Sync state when existingAssessment changes (for edit mode)
  useEffect(() => {
    if (existingAssessment) {
      setCondition(existingAssessment.condition || "not_assessed");
      setComponentNameField(existingAssessment.componentName || "");
      setComponentLocationField(existingAssessment.componentLocation || "");
      setObservations(existingAssessment.observations || "");
      setRecommendations(existingAssessment.recommendations || "");
      setRemainingUsefulLife(existingAssessment.remainingUsefulLife?.toString() || "");
      setEstimatedServiceLife(existingAssessment.expectedUsefulLife?.toString() || "");
      setReviewYear(existingAssessment.reviewYear?.toString() || new Date().getFullYear().toString());
      setLastTimeAction(existingAssessment.lastTimeAction?.toString() || "");
      setEstimatedRepairCost(existingAssessment.estimatedRepairCost?.toString() || "");
      setReplacementValue(existingAssessment.replacementValue?.toString() || "");
      setActionYear(existingAssessment.actionYear?.toString() || "");
    } else {
      // Reset to defaults for new assessment
      setCondition("not_assessed");
      setComponentNameField("");
      setComponentLocationField("");
      setObservations("");
      setRecommendations("");
      setRemainingUsefulLife("");
      setEstimatedServiceLife("");
      setReviewYear(new Date().getFullYear().toString());
      setLastTimeAction("");
      setEstimatedRepairCost("");
      setReplacementValue("");
      setActionYear("");
    }
  }, [existingAssessment, open]);

  const [observations, setObservations] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [remainingUsefulLife, setRemainingUsefulLife] = useState("");
  const [estimatedServiceLife, setEstimatedServiceLife] = useState("");
  const [reviewYear, setReviewYear] = useState(new Date().getFullYear().toString());
  const [lastTimeAction, setLastTimeAction] = useState("");
  const [estimatedRepairCost, setEstimatedRepairCost] = useState("");
  const [replacementValue, setReplacementValue] = useState("");
  const [actionYear, setActionYear] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [photoGeolocation, setPhotoGeolocation] = useState<{
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy: number;
  } | null>(null);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [validationOverrides, setValidationOverrides] = useState<Map<number, string>>(new Map());
  const [showObservationsVoice, setShowObservationsVoice] = useState(false);
  const [showRecommendationsVoice, setShowRecommendationsVoice] = useState(false);

  const upsertAssessment = trpc.assessments.upsert.useMutation();
  const checkValidation = trpc.validation.check.useMutation();
  const logOverride = trpc.validation.logOverride.useMutation();

  const uploadPhoto = trpc.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Assessment and photo saved successfully");
      onSuccess();
      handleClose();
      setUploadingPhoto(false);
    },
    onError: (error) => {
      toast.error("Failed to upload photo: " + error.message);
      setUploadingPhoto(false);
    },
  });

  const handleSaveWithPhoto = async () => {
    // First save the assessment to get the assessment ID
    try {
      const result = await upsertAssessment.mutateAsync({
        projectId,
        assetId,
        componentCode,
        condition: condition as "good" | "fair" | "poor" | "not_assessed",
        status: status,
        conditionPercentage: CONDITION_PERCENTAGES[condition] || undefined,
        componentName: componentNameField || undefined,
        componentLocation: componentLocationField || undefined,
        observations: observations || undefined,
        recommendations: recommendations || undefined,
        remainingUsefulLife: remainingUsefulLife ? parseInt(remainingUsefulLife) : undefined,
        expectedUsefulLife: estimatedServiceLife ? parseInt(estimatedServiceLife) : undefined,
        reviewYear: reviewYear ? parseInt(reviewYear) : undefined,
        lastTimeAction: lastTimeAction ? parseInt(lastTimeAction) : undefined,
        estimatedRepairCost: estimatedRepairCost ? parseFloat(estimatedRepairCost) : undefined,
        replacementValue: replacementValue ? parseFloat(replacementValue) : undefined,
        actionYear: actionYear ? parseInt(actionYear) : undefined,
      });

      // Then upload photo with the assessment ID
      if (photoFile) {
        setUploadingPhoto(true);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadPhoto.mutate({
            projectId,
            assessmentId: result.id, // Link photo to assessment
            fileData: base64,
            fileName: photoFile.name,
            mimeType: photoFile.type,
            componentCode,
            caption: `${componentCode} - ${componentName}`,
            latitude: photoGeolocation?.latitude,
            longitude: photoGeolocation?.longitude,
            altitude: photoGeolocation?.altitude,
            locationAccuracy: photoGeolocation?.accuracy,
            performOCR: true, // Enable OCR for all uploaded photos
          });
        };
        reader.readAsDataURL(photoFile);
      } else {
        toast.success("Assessment saved successfully");
        onSuccess();
        handleClose();
      }
    } catch (error: any) {
      toast.error("Failed to save assessment: " + error.message);
    }
  };

  const handleSave = async () => {
    // Build assessment data
    const assessmentData = {
      componentCode,
      condition,
      assessedAt: new Date(),
      lastTimeAction: lastTimeAction ? parseInt(lastTimeAction) : undefined,
      remainingUsefulLife: remainingUsefulLife ? parseInt(remainingUsefulLife) : undefined,
      expectedUsefulLife: estimatedServiceLife ? parseInt(estimatedServiceLife) : undefined,
      estimatedRepairCost: estimatedRepairCost ? parseFloat(estimatedRepairCost) : undefined,
      replacementValue: replacementValue ? parseFloat(replacementValue) : undefined,
      actionYear: actionYear ? parseInt(actionYear) : undefined,
    };

    // Check validation rules
    try {
      const results = await checkValidation.mutateAsync({
        projectId,
        assessmentData,
      });

      // Filter out already overridden warnings
      const activeResults = results.filter(
        (r: any) => !r.ruleId || !validationOverrides.has(r.ruleId)
      );

      if (activeResults.length > 0) {
        // Show validation warnings
        setValidationResults(activeResults);
        setShowValidation(true);
        return;
      }
    } catch (error) {
      console.error("Validation check failed:", error);
      // Continue with save even if validation fails
    }

    // No validation issues or all overridden, proceed with save
    proceedWithSave();
  };

  const proceedWithSave = () => {
    if (photoFile) {
      // If there's a photo, use the async handler to link it to the assessment
      handleSaveWithPhoto();
    } else {
      // No photo, just save the assessment
      upsertAssessment.mutate({
        projectId,
        assetId,
        componentCode,
        condition: condition as "good" | "fair" | "poor" | "not_assessed",
        conditionPercentage: CONDITION_PERCENTAGES[condition] || undefined,
        componentName: componentNameField || undefined,
        componentLocation: componentLocationField || undefined,
        observations: observations || undefined,
        recommendations: recommendations || undefined,
        remainingUsefulLife: remainingUsefulLife ? parseInt(remainingUsefulLife) : undefined,
        expectedUsefulLife: estimatedServiceLife ? parseInt(estimatedServiceLife) : undefined,
        reviewYear: reviewYear ? parseInt(reviewYear) : undefined,
        lastTimeAction: lastTimeAction ? parseInt(lastTimeAction) : undefined,
        estimatedRepairCost: estimatedRepairCost ? parseFloat(estimatedRepairCost) : undefined,
        replacementValue: replacementValue ? parseFloat(replacementValue) : undefined,
        actionYear: actionYear ? parseInt(actionYear) : undefined,
        hasValidationOverrides: validationOverrides.size > 0 ? 1 : 0,
        validationWarnings: validationOverrides.size > 0 ? JSON.stringify(Array.from(validationOverrides.keys())) : undefined,
      });
    }
  };

  const handleValidationOverride = async (ruleId: number, justification: string) => {
    // Log the override
    try {
      await logOverride.mutateAsync({
        ruleId,
        projectId,
        fieldName: validationResults.find((r: any) => r.ruleId === ruleId)?.field || "unknown",
        originalValue: "",
        overriddenValue: "",
        justification,
      });

      // Mark as overridden
      setValidationOverrides((prev) => {
        const next = new Map(prev);
        next.set(ruleId, justification);
        return next;
      });

      // Remove from active results
      setValidationResults((prev) => prev.filter((r: any) => r.ruleId !== ruleId));

      toast.success("Warning acknowledged");
    } catch (error) {
      toast.error("Failed to log override");
    }
  };

  const analyzeWithGemini = trpc.photos.analyzeWithGemini.useMutation({
    onSuccess: (result) => {
      // Populate form fields with AI analysis results cleanly
      setCondition(result.condition);
      setObservations(result.description);
      setRecommendations(result.recommendation);
      setAnalyzingWithAI(false);
      toast.success("AI analysis complete! Review and adjust the assessment as needed.");
    },
    onError: (error) => {
      toast.error("AI analysis failed: " + error.message);
      setAnalyzingWithAI(false);
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Capture geolocation when photo is selected
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setPhotoGeolocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude || undefined,
              accuracy: position.coords.accuracy,
            });
            toast.success("Location captured");
          },
          (error) => {
            console.warn("Geolocation error:", error);
            toast.info("Location not available");
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoGeolocation(null);
  };

  const handleAIAnalysis = () => {
    if (!photoFile || !photoPreview) {
      toast.error("Please upload a photo first");
      return;
    }

    setAnalyzingWithAI(true);
    // Extract base64 data from preview (remove data:image/...;base64, prefix)
    const base64Data = photoPreview.split(",")[1];
    
    analyzeWithGemini.mutate({
      fileData: base64Data,
      componentCode,
      componentName,
      userNotes: observations || undefined,
    });
  };



  const handleClose = () => {
    setCondition("not_assessed");
    setComponentNameField("");
    setComponentLocationField("");
    setObservations("");
    setRecommendations("");
    setRemainingUsefulLife("");
    setEstimatedServiceLife("");
    setReviewYear(new Date().getFullYear().toString());
    setLastTimeAction("");
    setEstimatedRepairCost("");
    setReplacementValue("");
    setActionYear("");
    setPhotoFile(null);
    setPhotoPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assess Component</DialogTitle>
          <DialogDescription>
            {componentCode} - {componentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Component Name and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="componentName">Component Name</Label>
              <Input
                id="componentName"
                type="text"
                value={componentNameField}
                onChange={(e) => setComponentNameField(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="componentLocation">Component Location</Label>
              <Input
                id="componentLocation"
                type="text"
                value={componentLocationField}
                onChange={(e) => setComponentLocationField(e.target.value)}
              />
            </div>
          </div>

          {/* Condition Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good (90-75% of ESL)</SelectItem>
                  <SelectItem value="fair">Fair (75-50% of ESL)</SelectItem>
                  <SelectItem value="poor">Poor (50-25% of ESL)</SelectItem>
                  <SelectItem value="not_assessed">Not Assessed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Assessment Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "initial" | "active" | "completed")}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial (Not Started)</SelectItem>
                  <SelectItem value="active">Active (In Progress)</SelectItem>
                  <SelectItem value="completed">Completed (Finished)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label htmlFor="esl">Estimated Service Life (years) *</Label>
              <Input
                id="esl"
                type="number"
                value={estimatedServiceLife}
                onChange={(e) => setEstimatedServiceLife(e.target.value)}
              />
            </div>
          </div>

          {/* Review Year and Last Action */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reviewYear">Review Year</Label>
              <Input
                id="reviewYear"
                type="number"
                value={reviewYear}
                onChange={(e) => setReviewYear(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastAction">Last Time Action</Label>
              <Input
                id="lastAction"
                type="number"
                value={lastTimeAction}
                onChange={(e) => setLastTimeAction(e.target.value)}
              />
            </div>
          </div>

          {/* Cost Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="repairCost">Estimated Repair Cost ($)</Label>
              <Input
                id="repairCost"
                type="number"
                value={estimatedRepairCost}
                onChange={(e) => setEstimatedRepairCost(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="replacementValue">Replacement Value ($)</Label>
              <Input
                id="replacementValue"
                type="number"
                value={replacementValue}
                onChange={(e) => setReplacementValue(e.target.value)}
              />
            </div>
          </div>

          {/* Action Year */}
          <div className="space-y-2">
            <Label htmlFor="actionYear">Action Year (Recommended)</Label>
            <Input
              id="actionYear"
              type="number"
              value={actionYear}
              onChange={(e) => setActionYear(e.target.value)}
            />
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="observations">Observations</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowObservationsVoice(!showObservationsVoice)}
                className="gap-2"
              >
                <Mic className="w-4 h-4" />
                {showObservationsVoice ? "Hide" : "Voice Input"}
              </Button>
            </div>
            {showObservationsVoice && (
              <VoiceRecorder
                onTranscriptionComplete={(text) => {
                  setObservations(observations + (observations ? "\n\n" : "") + text);
                  setShowObservationsVoice(false);
                }}
                onCancel={() => setShowObservationsVoice(false)}
              />
            )}
            <RichTextEditor
              content={observations}
              onChange={setObservations}
            />
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="recommendations">Recommendations</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRecommendationsVoice(!showRecommendationsVoice)}
                className="gap-2"
              >
                <Mic className="w-4 h-4" />
                {showRecommendationsVoice ? "Hide" : "Voice Input"}
              </Button>
            </div>
            {showRecommendationsVoice && (
              <VoiceRecorder
                onTranscriptionComplete={(text) => {
                  setRecommendations(recommendations + (recommendations ? "\n\n" : "") + text);
                  setShowRecommendationsVoice(false);
                }}
                onCancel={() => setShowRecommendationsVoice(false)}
              />
            )}
            <RichTextEditor
              content={recommendations}
              onChange={setRecommendations}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photo">Upload Photo (Optional)</Label>
            {!photoPreview ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label htmlFor="photo" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative border rounded-lg overflow-hidden">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemovePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAIAnalysis}
                  disabled={analyzingWithAI || upsertAssessment.isPending}
                >
                  {analyzingWithAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {showValidation && validationResults.length > 0 && (
          <div className="mt-4">
            <ValidationWarning
              results={validationResults}
              onOverride={handleValidationOverride}
              onCancel={() => setShowValidation(false)}
            />
            {validationResults.every((r: any) => r.severity !== "error") && (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowValidation(false)}>
                  Go Back
                </Button>
                <Button onClick={proceedWithSave}>
                  Save Anyway
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={upsertAssessment.isPending || uploadingPhoto}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={upsertAssessment.isPending || uploadingPhoto}>
            {(upsertAssessment.isPending || uploadingPhoto) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
