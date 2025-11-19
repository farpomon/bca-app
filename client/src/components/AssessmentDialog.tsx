import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

interface AssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  componentCode: string;
  componentName: string;
  existingAssessment?: {
    condition: string;
    observations?: string | null;
    remainingUsefulLife?: number | null;
    expectedUsefulLife?: number | null;
  };
  onSuccess: () => void;
}

export function AssessmentDialog({
  open,
  onOpenChange,
  projectId,
  componentCode,
  componentName,
  existingAssessment,
  onSuccess,
}: AssessmentDialogProps) {
  const [condition, setCondition] = useState(existingAssessment?.condition || "not_assessed");
  const [observations, setObservations] = useState(existingAssessment?.observations || "");
  const [remainingUsefulLife, setRemainingUsefulLife] = useState(
    existingAssessment?.remainingUsefulLife?.toString() || ""
  );
  const [expectedUsefulLife, setExpectedUsefulLife] = useState(
    existingAssessment?.expectedUsefulLife?.toString() || ""
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const upsertAssessment = trpc.assessments.upsert.useMutation({
    onSuccess: async () => {
      // If there's a photo, upload it
      if (photoFile) {
        await handlePhotoUpload();
      } else {
        toast.success("Assessment saved successfully");
        onSuccess();
        handleClose();
      }
    },
    onError: (error) => {
      toast.error("Failed to save assessment: " + error.message);
    },
  });

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhoto.mutate({
        projectId,
        fileData: base64,
        fileName: photoFile.name,
        mimeType: photoFile.type,
        componentCode,
        caption: `${componentCode} - ${componentName}`,
      });
    };
    reader.readAsDataURL(photoFile);
  };

  const handleSave = () => {
    upsertAssessment.mutate({
      projectId,
      componentCode,
      condition: condition as "good" | "fair" | "poor" | "not_assessed",
      observations: observations || undefined,
      remainingUsefulLife: remainingUsefulLife ? parseInt(remainingUsefulLife) : undefined,
      expectedUsefulLife: expectedUsefulLife ? parseInt(expectedUsefulLife) : undefined,
    });
  };

  const handleClose = () => {
    setCondition("not_assessed");
    setObservations("");
    setRemainingUsefulLife("");
    setExpectedUsefulLife("");
    setPhotoFile(null);
    setPhotoPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assess Component</DialogTitle>
          <DialogDescription>
            {componentCode} - {componentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Condition Rating */}
          <div className="space-y-2">
            <Label htmlFor="condition">Condition Rating *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="not_assessed">Not Assessed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              placeholder="Enter detailed observations about the component condition..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
            />
          </div>

          {/* Remaining Useful Life */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="remainingLife">Remaining Useful Life (years)</Label>
              <Input
                id="remainingLife"
                type="number"
                placeholder="e.g., 15"
                value={remainingUsefulLife}
                onChange={(e) => setRemainingUsefulLife(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedLife">Expected Useful Life (years)</Label>
              <Input
                id="expectedLife"
                type="number"
                placeholder="e.g., 25"
                value={expectedUsefulLife}
                onChange={(e) => setExpectedUsefulLife(e.target.value)}
              />
            </div>
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
            )}
          </div>
        </div>

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
