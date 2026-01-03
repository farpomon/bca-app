import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AddCustomComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  parentComponents: Array<{ code: string; name: string }>;
  onSuccess: () => void;
}

export function AddCustomComponentDialog({
  open,
  onOpenChange,
  projectId,
  parentComponents,
  onSuccess,
}: AddCustomComponentDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [level, setLevel] = useState<2 | 3>(3);
  const [description, setDescription] = useState("");

  const createMutation = trpc.customComponents.create.useMutation({
    onSuccess: () => {
      toast.success("Custom component created successfully");
      resetForm();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create custom component");
    },
  });

  const resetForm = () => {
    setCode("");
    setName("");
    setParentCode("");
    setLevel(3);
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || !name || !parentCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      projectId,
      code,
      name,
      parentCode,
      level,
      description: description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Custom Component</DialogTitle>
          <DialogDescription>
            Create a custom building component not in the standard UNIFORMAT II classification.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parentCode">Parent Component *</Label>
            <Select value={parentCode} onValueChange={setParentCode} required>
              <SelectTrigger id="parentCode">
                <SelectValue placeholder="Select parent component" />
              </SelectTrigger>
              <SelectContent>
                {parentComponents.map((comp) => (
                  <SelectItem key={comp.code} value={comp.code}>
                    {comp.code} - {comp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Component Code *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., A1010-CUSTOM"
              maxLength={20}
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique code for this component (max 20 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Component Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Custom HVAC System"
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Component Level *</Label>
            <Select value={level.toString()} onValueChange={(v) => setLevel(parseInt(v) as 2 | 3)} required>
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Level 2 (Group)</SelectItem>
                <SelectItem value="3">Level 3 (Individual Element)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this component..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Component"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
