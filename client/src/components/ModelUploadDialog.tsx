import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface ModelUploadDialogProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModelUploadDialog({ projectId, open, onOpenChange }: ModelUploadDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"glb" | "gltf" | "fbx" | "obj" | "skp" | "rvt" | "rfa" | "dwg" | "dxf">("glb");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();
  const uploadMutation = trpc.models.upload.useMutation({
    onSuccess: () => {
      toast.success("3D model uploaded successfully");
      utils.models.list.invalidate({ projectId });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setFormat("glb");
    setFile(null);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        toast.error("File size exceeds 500MB limit");
        return;
      }
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !name) {
      toast.error("Please provide a file and name");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (!base64) {
          toast.error("Failed to read file");
          setUploading(false);
          return;
        }

        await uploadMutation.mutateAsync({
          projectId,
          name,
          description,
          fileData: base64,
          format,
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload 3D Model</DialogTitle>
          <DialogDescription>
            Upload a 3D model of your facility. Supported formats: GLB, GLTF, FBX, OBJ, SketchUp (SKP), Revit (RVT/RFA), DWG/DXF (max 500MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">Model File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".glb,.gltf,.fbx,.obj,.skp,.rvt,.rfa,.dwg,.dxf"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Model Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Building - Ground Floor"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format *</Label>
            <Select value={format} onValueChange={(value: any) => setFormat(value)} disabled={uploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="glb">GLB (recommended)</SelectItem>
                <SelectItem value="gltf">GLTF</SelectItem>
                <SelectItem value="fbx">FBX</SelectItem>
                <SelectItem value="obj">OBJ</SelectItem>
                <SelectItem value="skp">SketchUp (SKP)</SelectItem>
                <SelectItem value="rvt">Revit (RVT)</SelectItem>
                <SelectItem value="rfa">Revit Family (RFA)</SelectItem>
                <SelectItem value="dwg">AutoCAD (DWG)</SelectItem>
                <SelectItem value="dxf">DXF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or notes about this model"
              rows={3}
              disabled={uploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !file || !name}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
