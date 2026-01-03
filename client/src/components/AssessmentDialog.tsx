import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Upload, X, Sparkles, Mic, Trash2, WifiOff, Wifi } from "lucide-react";
import { ValidationWarning } from "@/components/ValidationWarning";
import { RichTextEditor } from "@/components/RichTextEditor";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { DocumentUploadZone } from "@/components/DocumentUploadZone";
import { DocumentList } from "@/components/DocumentList";
import { Badge } from "@/components/ui/badge";
import { useOfflineAssessment } from "@/hooks/useOfflineAssessment";
import { useOfflinePhoto } from "@/hooks/useOfflinePhoto";
import { initOfflineDB, STORES } from "@/lib/offlineStorage";

// Component to display existing photos for an assessment
function ExistingPhotosDisplay({ assessmentId, projectId }: { assessmentId: number; projectId: number }) {
  const { data: photos, isLoading, refetch } = trpc.photos.byAssessment.useQuery({ assessmentId, projectId });
  const [offlinePhotos, setOfflinePhotos] = useState<Array<{ id: string; url: string; caption: string | null }>>([]);
  
  const deletePhoto = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete photo: " + error.message);
    },
  });

  // Load offline photos from IndexedDB
  useEffect(() => {
    const loadOfflinePhotos = async () => {
      try {
        // Using static import from top of file
        const db = await initOfflineDB();
        const tx = db.transaction(STORES.PHOTOS, 'readonly');
        const store = tx.objectStore(STORES.PHOTOS);
        const allOfflinePhotos = await store.getAll();
        
        // Filter photos for this assessment
        const relevantPhotos = allOfflinePhotos.filter(
          (p: any) => p.assessmentId === assessmentId.toString() && p.syncStatus !== 'synced'
        );
        
        // Convert blobs to URLs for display
        const photosWithUrls = await Promise.all(
          relevantPhotos.map(async (p: any) => ({
            id: p.id,
            url: URL.createObjectURL(p.blob),
            caption: p.caption,
          }))
        );
        
        setOfflinePhotos(photosWithUrls);
      } catch (error) {
        console.error('Failed to load offline photos:', error);
      }
    };
    
    if (assessmentId) {
      loadOfflinePhotos();
    }
    
    // Cleanup object URLs on unmount
    return () => {
      offlinePhotos.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [assessmentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allPhotos = [...(photos || []), ...offlinePhotos.map(p => ({ ...p, id: p.id, isOffline: true }))];

  if (allPhotos.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
        No photos uploaded yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {allPhotos.map((photo) => (
        <div key={photo.id} className="relative group border rounded-lg overflow-hidden">
          <img
            src={photo.url}
            alt={photo.caption || "Assessment photo"}
            className="w-full h-32 object-cover"
          />
          {(photo as any).isOffline && (
            <Badge variant="outline" className="absolute top-1 left-1 text-xs bg-amber-50 text-amber-700 border-amber-200">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </Badge>
          )}
          {!(photo as any).isOffline && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-7 w-7"
              onClick={() => {
                if (confirm("Delete this photo?")) {
                  deletePhoto.mutate({ id: photo.id as number });
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
              {photo.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface AssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  assetId: number;
  componentCode: string;
  componentName: string;
  existingAssessment?: {
    id?: number;
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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
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
  const [showComponentNameVoice, setShowComponentNameVoice] = useState(false);
  const [showComponentLocationVoice, setShowComponentLocationVoice] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState<number | null>(null);

  // Offline-capable hooks
  const { saveAssessment, isSaving: isSavingOffline, isOnline } = useOfflineAssessment({
    projectId,
    onSuccess: (assessmentId) => {
      console.log("Assessment saved with ID:", assessmentId);
    },
    onError: (error) => {
      console.error("Failed to save assessment:", error);
    },
  });

  const { uploadPhoto: uploadPhotoOffline, uploadPhotos: uploadPhotosOffline, isUploading: isUploadingOffline } = useOfflinePhoto({
    onUploadSuccess: (result) => {
      console.log("Photo uploaded:", result);
    },
    onUploadError: (error) => {
      console.error("Failed to upload photo:", error);
    },
  });

  const upsertAssessment = trpc.assessments.upsert.useMutation();
  const checkValidation = trpc.validation.check.useMutation();
  const logOverride = trpc.validation.logOverride.useMutation();

  const utils = trpc.useUtils();

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

  const uploadAssessmentDocument = trpc.documents.uploadAssessmentDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      if (existingAssessment?.id) {
        utils.assessmentDocuments.list.invalidate({ assessmentId: existingAssessment.id });
      }
    },
    onError: (error) => {
      toast.error("Failed to upload document: " + error.message);
    },
  });

  const handleSaveWithPhoto = async () => {
    // First save the assessment to get the assessment ID
    try {
      // Use offline-capable save
      const assessmentData = {
        projectId,
        assetId,
        componentCode,
        componentName: componentNameField || null,
        componentLocation: componentLocationField || null,
        condition: condition as "good" | "fair" | "poor" | "not_assessed" | null,
        status: status as "initial" | "active" | "completed" | null,
        observations: observations || null,
        recommendations: recommendations || null,
        estimatedServiceLife: estimatedServiceLife ? parseInt(estimatedServiceLife) : null,
        reviewYear: reviewYear ? parseInt(reviewYear) : null,
        lastTimeAction: lastTimeAction ? parseInt(lastTimeAction) : null,
        estimatedRepairCost: estimatedRepairCost ? parseFloat(estimatedRepairCost) : null,
        replacementValue: replacementValue ? parseFloat(replacementValue) : null,
        actionYear: actionYear ? parseInt(actionYear) : null,
      };

      const assessmentId = await saveAssessment(assessmentData);

      // Then upload photos with the assessment ID
      if (photoFiles.length > 0) {
        setUploadingPhoto(true);
        const totalPhotos = photoFiles.length;
        
        // Check if we're online and have a numeric assessment ID (not offline ID)
        const isOnlineAndSynced = isOnline && typeof assessmentId === 'number';
        
        if (isOnlineAndSynced) {
          // Direct upload to server when online
          try {
            for (let i = 0; i < photoFiles.length; i++) {
              const file = photoFiles[i];
              const reader = new FileReader();
              
              const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                  const result = reader.result?.toString().split(',')[1];
                  if (result) resolve(result);
                  else reject(new Error('Failed to read file'));
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
              });
              
              await uploadPhoto.mutateAsync({
                projectId,
                assessmentId: assessmentId as number,
                fileData: base64Data,
                fileName: file.name,
                mimeType: file.type || 'image/jpeg',
                caption: `${componentCode} - ${componentName} (${i + 1}/${totalPhotos})`,
                latitude: photoGeolocation?.latitude,
                longitude: photoGeolocation?.longitude,
                altitude: photoGeolocation?.altitude,
                locationAccuracy: photoGeolocation?.accuracy,
              });
            }
            setUploadingPhoto(false);
            toast.success(`Assessment and ${totalPhotos} photo${totalPhotos > 1 ? 's' : ''} saved successfully`);
            onSuccess();
            handleClose();
          } catch (error: any) {
            console.error('Direct upload failed:', error);
            toast.error(`Failed to upload photos: ${error.message}`);
            setUploadingPhoto(false);
          }
        } else {
          // Use offline-capable photo upload when offline or assessment is offline
          const photoUploadPromises = photoFiles.map((file, index) => 
            uploadPhotoOffline({
              assessmentId: assessmentId.toString(),
              projectId,
              file,
              caption: `${componentCode} - ${componentName} (${index + 1}/${totalPhotos})`,
              location: photoGeolocation ? {
                latitude: photoGeolocation.latitude,
                longitude: photoGeolocation.longitude,
                altitude: photoGeolocation.altitude,
                accuracy: photoGeolocation.accuracy,
              } : undefined,
            })
          );

          try {
            await Promise.all(photoUploadPromises);
            setUploadingPhoto(false);
            toast.success(`Assessment and ${totalPhotos} photo${totalPhotos > 1 ? 's' : ''} saved (will sync when online)`);
            onSuccess();
            handleClose();
          } catch (error: any) {
            toast.error(`Failed to upload photos: ${error.message}`);
            setUploadingPhoto(false);
          }
        }
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

  const proceedWithSave = async () => {
    // Show offline notification if not online
    if (!isOnline) {
      toast.info("Saving offline... Data will sync when connection is restored", {
        duration: 5000,
      });
    }

    if (photoFiles.length > 0) {
      // If there are photos, use the async handler to link them to the assessment
      await handleSaveWithPhoto();
    } else {
      // No photo, just save the assessment using offline-capable hook
      try {
        const assessmentData = {
          projectId,
          assetId,
          componentCode,
          componentName: componentNameField || null,
          componentLocation: componentLocationField || null,
          condition: condition as "good" | "fair" | "poor" | "not_assessed" | null,
          status: status as "initial" | "active" | "completed" | null,
          observations: observations || null,
          recommendations: recommendations || null,
          estimatedServiceLife: estimatedServiceLife ? parseInt(estimatedServiceLife) : null,
          reviewYear: reviewYear ? parseInt(reviewYear) : null,
          lastTimeAction: lastTimeAction ? parseInt(lastTimeAction) : null,
          estimatedRepairCost: estimatedRepairCost ? parseFloat(estimatedRepairCost) : null,
          replacementValue: replacementValue ? parseFloat(replacementValue) : null,
          actionYear: actionYear ? parseInt(actionYear) : null,
        };

        await saveAssessment(assessmentData);
        onSuccess();
        handleClose();
      } catch (error: any) {
        toast.error("Failed to save assessment: " + error.message);
      }
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Process files - convert HEIC if needed and generate previews
      const processedFiles: File[] = [];
      
      for (const file of files) {
        try {
          // Check if it's a HEIC file (common on iPhone)
          const isHeic = file.type === 'image/heic' || 
                         file.type === 'image/heif' || 
                         file.name.toLowerCase().endsWith('.heic') ||
                         file.name.toLowerCase().endsWith('.heif');
          
          if (isHeic) {
            // For HEIC files, iOS Safari should auto-convert when using accept="image/*"
            // But we'll handle it gracefully if it doesn't
            console.log('Processing HEIC file:', file.name);
          }
          
          processedFiles.push(file);
          
          // Generate preview using createObjectURL for better performance
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoPreviews(prev => [...prev, reader.result as string]);
          };
          reader.onerror = () => {
            console.error('Failed to read file:', file.name);
            toast.error(`Failed to load preview for ${file.name}`);
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          toast.error(`Failed to process ${file.name}`);
        }
      }
      
      if (processedFiles.length > 0) {
        setPhotoFiles(prev => [...prev, ...processedFiles]);
        toast.success(`${processedFiles.length} photo(s) added`);
      }

      // Capture geolocation when photos are selected
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setPhotoGeolocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude || undefined,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            console.error("Geolocation error:", error);
            // Don't show error toast - location is optional
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    if (photoFiles.length === 1) {
      setPhotoGeolocation(null);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setPhotoFiles(prev => [...prev, ...files]);
      
      // Generate previews for all new files
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Capture geolocation when photos are dropped
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
            console.error("Geolocation error:", error);
            toast.error("Location not available");
          },
          { enableHighAccuracy: true }
        );
      }

      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} added`);
    } else {
      toast.error("Please drop image files only");
    }
  };

  // Photo reordering handlers
  const handlePhotoDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPhotoIndex(index);
  };

  const handlePhotoDragLeavePhoto = () => {
    setDragOverPhotoIndex(null);
  };

  const handlePhotoDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedPhotoIndex === null || draggedPhotoIndex === dropIndex) {
      setDraggedPhotoIndex(null);
      setDragOverPhotoIndex(null);
      return;
    }

    // Reorder photos
    const newPhotoFiles = [...photoFiles];
    const newPhotoPreviews = [...photoPreviews];
    
    const [draggedFile] = newPhotoFiles.splice(draggedPhotoIndex, 1);
    const [draggedPreview] = newPhotoPreviews.splice(draggedPhotoIndex, 1);
    
    newPhotoFiles.splice(dropIndex, 0, draggedFile);
    newPhotoPreviews.splice(dropIndex, 0, draggedPreview);
    
    setPhotoFiles(newPhotoFiles);
    setPhotoPreviews(newPhotoPreviews);
    setDraggedPhotoIndex(null);
    setDragOverPhotoIndex(null);
    
    toast.success("Photo reordered");
  };

  const handlePhotoDragEnd = () => {
    setDraggedPhotoIndex(null);
    setDragOverPhotoIndex(null);
  };

  const handleAIAnalysis = () => {
    if (photoFiles.length === 0 || photoPreviews.length === 0) {
      toast.error("Please upload at least one photo first");
      return;
    }

    setAnalyzingWithAI(true);
    // Use the first photo for AI analysis
    const base64Data = photoPreviews[0].split(",")[1];
    
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
    setPhotoFiles([]);
    setPhotoPreviews([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>Assess Component</DialogTitle>
              <DialogDescription>
                {componentCode} - {componentName}
              </DialogDescription>
            </div>
            {!isOnline && (
              <Badge variant="outline" className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200">
                <WifiOff className="w-3 h-3" />
                Offline Mode
              </Badge>
            )}
            {isOnline && (
              <Badge variant="outline" className="gap-1.5 bg-green-50 text-green-700 border-green-200">
                <Wifi className="w-3 h-3" />
                Online
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Component Name and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="componentName">Component Name</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComponentNameVoice(!showComponentNameVoice)}
                  className="gap-2"
                >
                  <Mic className="w-4 h-4" />
                  {showComponentNameVoice ? "Hide" : "Voice"}
                </Button>
              </div>
              {showComponentNameVoice && (
                <VoiceRecorder
                  onTranscriptionComplete={(text) => {
                    setComponentNameField(text);
                    setShowComponentNameVoice(false);
                  }}
                  onCancel={() => setShowComponentNameVoice(false)}
                  context="Component Name"
                />
              )}
              <Input
                id="componentName"
                type="text"
                value={componentNameField}
                onChange={(e) => setComponentNameField(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="componentLocation">Component Location</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComponentLocationVoice(!showComponentLocationVoice)}
                  className="gap-2"
                >
                  <Mic className="w-4 h-4" />
                  {showComponentLocationVoice ? "Hide" : "Voice"}
                </Button>
              </div>
              {showComponentLocationVoice && (
                <VoiceRecorder
                  onTranscriptionComplete={(text) => {
                    setComponentLocationField(text);
                    setShowComponentLocationVoice(false);
                  }}
                  onCancel={() => setShowComponentLocationVoice(false)}
                  context="Component Location"
                />
              )}
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
                  setObservations(prev => prev + (prev ? "\n\n" : "") + text);
                  setShowObservationsVoice(false);
                }}
                onCancel={() => setShowObservationsVoice(false)}
                fieldType="observations"
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
                  setRecommendations(prev => prev + (prev ? "\n\n" : "") + text);
                  setShowRecommendationsVoice(false);
                }}
                onCancel={() => setShowRecommendationsVoice(false)}
                fieldType="recommendations"
              />
            )}
            <RichTextEditor
              content={recommendations}
              onChange={setRecommendations}
            />
          </div>

          {/* Existing Photos */}
          {existingAssessment?.id && (
            <div className="space-y-2">
              <Label>Existing Photos</Label>
              <ExistingPhotosDisplay assessmentId={existingAssessment.id} projectId={projectId} />
            </div>
          )}

          {/* Existing Documents */}
          {existingAssessment?.id && (
            <div className="space-y-2">
              <Label>Attached Documents</Label>
              <DocumentList assessmentId={existingAssessment.id} />
            </div>
          )}

          {/* Document Upload */}
          {existingAssessment?.id && (
            <div className="space-y-2">
              <Label>Upload Document (Optional)</Label>
              <DocumentUploadZone
                onUpload={async (file) => {
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const base64Data = reader.result?.toString().split(',')[1];
                    if (base64Data && existingAssessment.id) {
                      await uploadAssessmentDocument.mutateAsync({
                        assessmentId: existingAssessment.id,
                        projectId,
                        fileName: file.name,
                        fileData: base64Data,
                        mimeType: file.type,
                        fileSize: file.size,
                      });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                disabled={uploadAssessmentDocument.isPending}
              />
            </div>
          )}

          {/* Photo Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="photo">Upload Photos (Optional)</Label>
              {!isOnline && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Saved Locally
                </Badge>
              )}
            </div>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-primary'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                id="photo"
                type="file"
                accept="image/*,image/heic,image/heif"
                capture="environment"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
              />
              <label htmlFor="photo" className="cursor-pointer">
                <Upload className={`mx-auto h-12 w-12 mb-2 transition-colors ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm transition-colors ${
                  isDragging ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {isDragging ? 'Drop photos here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, GIF up to 10MB each - Select multiple files
                </p>
              </label>
            </div>
            
            {photoPreviews.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Drag photos to reorder them</p>
                <div className="grid grid-cols-2 gap-2">
                  {photoPreviews.map((preview, index) => (
                    <div 
                      key={index} 
                      draggable
                      onDragStart={(e) => handlePhotoDragStart(e, index)}
                      onDragOver={(e) => handlePhotoDragOver(e, index)}
                      onDragLeave={handlePhotoDragLeavePhoto}
                      onDrop={(e) => handlePhotoDrop(e, index)}
                      onDragEnd={handlePhotoDragEnd}
                      className={`relative border rounded-lg overflow-hidden group cursor-move transition-all ${
                        draggedPhotoIndex === index ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverPhotoIndex === index && draggedPhotoIndex !== index 
                          ? 'ring-2 ring-primary scale-105' 
                          : ''
                      }`}
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover pointer-events-none"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                        Photo {index + 1} of {photoPreviews.length}
                      </div>
                    </div>
                  ))}
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
                      Analyze First Photo with AI
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
