import { useRef, useState } from "react";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Pencil, 
  Eraser,
  Undo, 
  Redo, 
  Trash2, 
  Save,
  Loader2
} from "lucide-react";

interface PhotoAnnotatorProps {
  photoId: number;
  photoUrl: string;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function PhotoAnnotator({
  photoId,
  photoUrl,
  projectId,
  open,
  onOpenChange,
  onSaved,
}: PhotoAnnotatorProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [strokeColor, setStrokeColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [eraserWidth, setEraserWidth] = useState(10);
  const [isEraser, setIsEraser] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadPhoto = trpc.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Annotated photo saved");
      onSaved?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    setSaving(true);
    try {
      // Export canvas as data URL
      const dataURL = await canvasRef.current.exportImage("png");

      // Remove data:image/png;base64, prefix
      const base64Data = dataURL.split(",")[1];

      // Upload annotated photo
      await uploadPhoto.mutateAsync({
        projectId,
        fileData: base64Data,
        fileName: `annotated-${Date.now()}.png`,
        mimeType: "image/png",
        caption: "Annotated photo",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save annotated photo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Annotate Photo</DialogTitle>
          <DialogDescription>
            Draw on the photo to highlight specific areas and defects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant={!isEraser ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEraser(false)}
                title="Draw"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isEraser ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEraser(true)}
                title="Eraser"
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="h-6 w-px bg-gray-300" />
            
            {!isEraser && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="color" className="text-sm whitespace-nowrap">Color:</Label>
                  <Input
                    id="color"
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-16 h-8 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="strokeWidth" className="text-sm whitespace-nowrap">Width:</Label>
                  <Input
                    id="strokeWidth"
                    type="range"
                    min="1"
                    max="20"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground w-8">{strokeWidth}px</span>
                </div>
              </>
            )}
            
            {isEraser && (
              <div className="flex items-center gap-2">
                <Label htmlFor="eraserWidth" className="text-sm whitespace-nowrap">Eraser:</Label>
                <Input
                  id="eraserWidth"
                  type="range"
                  min="5"
                  max="50"
                  value={eraserWidth}
                  onChange={(e) => setEraserWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground w-8">{eraserWidth}px</span>
              </div>
            )}
            
            <div className="h-6 w-px bg-gray-300" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              title="Clear all annotations"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Canvas with background image */}
          <div className="border rounded-lg overflow-hidden bg-gray-50 relative">
            <ReactSketchCanvas
              ref={canvasRef}
              width="100%"
              height="600px"
              strokeWidth={isEraser ? 0 : strokeWidth}
              eraserWidth={eraserWidth}
              strokeColor={strokeColor}
              canvasColor="transparent"
              backgroundImage={photoUrl}
              exportWithBackgroundImage={true}
              style={{
                border: "none",
              }}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            💡 Tip: Use the drawing tool to circle defects, draw arrows to point out issues, or add notes directly on the photo.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Annotated Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
