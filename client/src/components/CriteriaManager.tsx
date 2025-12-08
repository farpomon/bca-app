import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Criteria {
  id: number;
  name: string;
  description: string | null;
  category: string;
  weight: string;
  scoringGuideline: string | null;
  isActive: number;
  displayOrder: number;
}

interface CriteriaManagerProps {
  criteria: Criteria[];
}

export default function CriteriaManager({ criteria }: CriteriaManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<Criteria | null>(null);

  const utils = trpc.useUtils();

  const createMutation = trpc.prioritization.createCriteria.useMutation({
    onSuccess: () => {
      utils.prioritization.getCriteria.invalidate();
      setIsCreateDialogOpen(false);
      toast.success("Criteria created successfully");
    },
  });

  const updateMutation = trpc.prioritization.updateCriteria.useMutation({
    onSuccess: () => {
      utils.prioritization.getCriteria.invalidate();
      setEditingCriteria(null);
      toast.success("Criteria updated successfully");
    },
  });

  const deleteMutation = trpc.prioritization.deleteCriteria.useMutation({
    onSuccess: () => {
      utils.prioritization.getCriteria.invalidate();
      toast.success("Criteria deleted successfully");
    },
  });

  const normalizeWeightsMutation = trpc.prioritization.normalizeWeights.useMutation({
    onSuccess: () => {
      utils.prioritization.getCriteria.invalidate();
      toast.success("Weights normalized to 100%");
    },
  });

  const totalWeight = criteria.reduce((sum, c) => sum + parseFloat(c.weight), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "risk":
        return "bg-red-100 text-red-800";
      case "strategic":
        return "bg-blue-100 text-blue-800";
      case "compliance":
        return "bg-purple-100 text-purple-800";
      case "financial":
        return "bg-green-100 text-green-800";
      case "operational":
        return "bg-yellow-100 text-yellow-800";
      case "environmental":
        return "bg-teal-100 text-teal-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total Weight: <span className={isWeightValid ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{totalWeight.toFixed(2)}%</span>
            {!isWeightValid && (
              <Button
                variant="link"
                size="sm"
                className="ml-2"
                onClick={() => normalizeWeightsMutation.mutate()}
                disabled={normalizeWeightsMutation.isPending}
              >
                Normalize to 100%
              </Button>
            )}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Criteria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CriteriaForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Criteria Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-center">Weight</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criteria.map((criterion) => (
            <TableRow key={criterion.id}>
              <TableCell className="font-medium">{criterion.name}</TableCell>
              <TableCell>
                <Badge className={getCategoryBadgeColor(criterion.category)}>
                  {criterion.category}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-mono">{parseFloat(criterion.weight).toFixed(1)}%</span>
              </TableCell>
              <TableCell className="max-w-md">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {criterion.description || "—"}
                </p>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Dialog open={editingCriteria?.id === criterion.id} onOpenChange={(open) => !open && setEditingCriteria(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCriteria(criterion)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <CriteriaForm
                        initialData={criterion}
                        onSubmit={(data) => updateMutation.mutate({ criteriaId: criterion.id, ...data })}
                        isLoading={updateMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${criterion.name}"?`)) {
                        deleteMutation.mutate({ criteriaId: criterion.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface CriteriaFormProps {
  initialData?: Criteria;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CriteriaForm({ initialData, onSubmit, isLoading }: CriteriaFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "strategic");
  const [weight, setWeight] = useState(initialData ? parseFloat(initialData.weight) : 10);
  const [scoringGuideline, setScoringGuideline] = useState(initialData?.scoringGuideline || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      category,
      weight,
      scoringGuideline,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Edit Criteria" : "Create New Criteria"}</DialogTitle>
        <DialogDescription>
          Define a scoring factor for project prioritization
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Criteria Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Urgency, Safety, Energy Savings"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">Risk</SelectItem>
              <SelectItem value="strategic">Strategic</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="environmental">Environmental</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight: {weight.toFixed(1)}%</Label>
          <Slider
            value={[weight]}
            onValueChange={(values) => setWeight(values[0] || 10)}
            min={0}
            max={100}
            step={0.5}
          />
          <p className="text-xs text-muted-foreground">
            How much this criteria influences the composite score
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this criteria measure?"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scoringGuideline">Scoring Guideline</Label>
          <Textarea
            id="scoringGuideline"
            value={scoringGuideline}
            onChange={(e) => setScoringGuideline(e.target.value)}
            placeholder="e.g., 10=Critical/Immediate, 7-9=High, 4-6=Medium, 1-3=Low"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Describe what each score level (1-10) means
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
