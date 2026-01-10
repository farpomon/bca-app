import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { LetterGradeBadge } from "./LetterGradeBadge";
import { ZoneDot } from "./ZoneIndicator";

type Zone = "green" | "yellow" | "orange" | "red";

interface LetterGradeThreshold {
  min: number;
  max: number;
}

interface ZoneThreshold {
  min: number;
  max: number;
  label: string;
  description?: string;
}

interface ThresholdCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLetterGrades: Record<string, LetterGradeThreshold>;
  defaultZones: Record<string, ZoneThreshold>;
  fciLetterGrades: Record<string, LetterGradeThreshold>;
  fciZones: Record<string, ZoneThreshold>;
  onSave?: (config: {
    letterGrades: Record<string, LetterGradeThreshold>;
    zones: Record<string, ZoneThreshold>;
    fciLetterGrades: Record<string, LetterGradeThreshold>;
    fciZones: Record<string, ZoneThreshold>;
  }) => void;
  isSaving?: boolean;
}

const DEFAULT_LETTER_GRADES: Record<string, LetterGradeThreshold> = {
  "A+": { min: 97, max: 100 },
  "A": { min: 93, max: 96.99 },
  "A-": { min: 90, max: 92.99 },
  "B+": { min: 87, max: 89.99 },
  "B": { min: 83, max: 86.99 },
  "B-": { min: 80, max: 82.99 },
  "C+": { min: 77, max: 79.99 },
  "C": { min: 73, max: 76.99 },
  "C-": { min: 70, max: 72.99 },
  "D+": { min: 67, max: 69.99 },
  "D": { min: 63, max: 66.99 },
  "D-": { min: 60, max: 62.99 },
  "F": { min: 0, max: 59.99 }
};

const DEFAULT_ZONES: Record<string, ZoneThreshold> = {
  green: { min: 80, max: 100, label: "Excellent", description: "Asset in excellent condition" },
  yellow: { min: 60, max: 79.99, label: "Good", description: "Minor attention needed" },
  orange: { min: 40, max: 59.99, label: "Fair", description: "Plan for repairs" },
  red: { min: 0, max: 39.99, label: "Poor", description: "Immediate action required" }
};

const DEFAULT_FCI_LETTER_GRADES: Record<string, LetterGradeThreshold> = {
  "A+": { min: 0, max: 2 },
  "A": { min: 2.01, max: 5 },
  "A-": { min: 5.01, max: 8 },
  "B+": { min: 8.01, max: 12 },
  "B": { min: 12.01, max: 15 },
  "B-": { min: 15.01, max: 20 },
  "C+": { min: 20.01, max: 25 },
  "C": { min: 25.01, max: 30 },
  "C-": { min: 30.01, max: 35 },
  "D+": { min: 35.01, max: 40 },
  "D": { min: 40.01, max: 50 },
  "D-": { min: 50.01, max: 60 },
  "F": { min: 60.01, max: 100 }
};

const DEFAULT_FCI_ZONES: Record<string, ZoneThreshold> = {
  green: { min: 0, max: 5, label: "Excellent", description: "Facility in excellent condition" },
  yellow: { min: 5.01, max: 10, label: "Good", description: "Facility in good condition" },
  orange: { min: 10.01, max: 30, label: "Fair", description: "Facility needs attention" },
  red: { min: 30.01, max: 100, label: "Poor", description: "Critical - major repairs needed" }
};

export function ThresholdCustomizationDialog({
  open,
  onOpenChange,
  defaultLetterGrades,
  defaultZones,
  fciLetterGrades,
  fciZones,
  onSave,
  isSaving = false
}: ThresholdCustomizationDialogProps) {
  const [activeTab, setActiveTab] = useState("standard-grades");
  const [letterGrades, setLetterGrades] = useState<Record<string, LetterGradeThreshold>>(defaultLetterGrades);
  const [zones, setZones] = useState<Record<string, ZoneThreshold>>(defaultZones);
  const [fciGrades, setFciGrades] = useState<Record<string, LetterGradeThreshold>>(fciLetterGrades);
  const [fciZonesState, setFciZonesState] = useState<Record<string, ZoneThreshold>>(fciZones);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setLetterGrades(defaultLetterGrades);
      setZones(defaultZones);
      setFciGrades(fciLetterGrades);
      setFciZonesState(fciZones);
      setHasChanges(false);
      setValidationErrors([]);
    }
  }, [open, defaultLetterGrades, defaultZones, fciLetterGrades, fciZones]);

  const validateThresholds = (): boolean => {
    const errors: string[] = [];

    // Validate letter grades - check for gaps and overlaps
    const gradeOrder = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
    for (let i = 0; i < gradeOrder.length - 1; i++) {
      const current = letterGrades[gradeOrder[i]];
      const next = letterGrades[gradeOrder[i + 1]];
      if (current.min <= next.max) {
        errors.push(`Letter grade ${gradeOrder[i]} overlaps with ${gradeOrder[i + 1]}`);
      }
    }

    // Validate zones - check for gaps and overlaps
    const zoneOrder: Zone[] = ["green", "yellow", "orange", "red"];
    for (let i = 0; i < zoneOrder.length - 1; i++) {
      const current = zones[zoneOrder[i]];
      const next = zones[zoneOrder[i + 1]];
      if (Math.abs(current.min - next.max - 0.01) > 0.1) {
        errors.push(`Zone ${zoneOrder[i]} has a gap with ${zoneOrder[i + 1]}`);
      }
    }

    // Validate ranges
    Object.entries(letterGrades).forEach(([grade, range]) => {
      if (range.min > range.max) {
        errors.push(`Letter grade ${grade} has invalid range (min > max)`);
      }
      if (range.min < 0 || range.max > 100) {
        errors.push(`Letter grade ${grade} has values outside 0-100 range`);
      }
    });

    Object.entries(zones).forEach(([zone, range]) => {
      if (range.min > range.max) {
        errors.push(`Zone ${zone} has invalid range (min > max)`);
      }
      if (range.min < 0 || range.max > 100) {
        errors.push(`Zone ${zone} has values outside 0-100 range`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateThresholds()) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    onSave?.({
      letterGrades,
      zones,
      fciLetterGrades: fciGrades,
      fciZones: fciZonesState
    });
  };

  const handleReset = (type: "standard-grades" | "standard-zones" | "fci-grades" | "fci-zones") => {
    switch (type) {
      case "standard-grades":
        setLetterGrades(DEFAULT_LETTER_GRADES);
        break;
      case "standard-zones":
        setZones(DEFAULT_ZONES);
        break;
      case "fci-grades":
        setFciGrades(DEFAULT_FCI_LETTER_GRADES);
        break;
      case "fci-zones":
        setFciZonesState(DEFAULT_FCI_ZONES);
        break;
    }
    setHasChanges(true);
    toast.success("Reset to default values");
  };

  const updateLetterGrade = (grade: string, field: "min" | "max", value: number) => {
    setLetterGrades(prev => ({
      ...prev,
      [grade]: { ...prev[grade], [field]: value }
    }));
    setHasChanges(true);
  };

  const updateZone = (zone: string, field: "min" | "max" | "label", value: number | string) => {
    setZones(prev => ({
      ...prev,
      [zone]: { ...prev[zone], [field]: value }
    }));
    setHasChanges(true);
  };

  const updateFciGrade = (grade: string, field: "min" | "max", value: number) => {
    setFciGrades(prev => ({
      ...prev,
      [grade]: { ...prev[grade], [field]: value }
    }));
    setHasChanges(true);
  };

  const updateFciZone = (zone: string, field: "min" | "max" | "label", value: number | string) => {
    setFciZonesState(prev => ({
      ...prev,
      [zone]: { ...prev[zone], [field]: value }
    }));
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Rating Thresholds</DialogTitle>
          <DialogDescription>
            Adjust the thresholds for letter grades and zone classifications. Changes will apply to all future calculations.
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Validation Errors</span>
            </div>
            <ul className="text-sm text-destructive space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="standard-grades">Letter Grades</TabsTrigger>
            <TabsTrigger value="standard-zones">Zones</TabsTrigger>
            <TabsTrigger value="fci-grades">FCI Grades</TabsTrigger>
            <TabsTrigger value="fci-zones">FCI Zones</TabsTrigger>
          </TabsList>

          <TabsContent value="standard-grades" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Standard letter grade thresholds (higher score = better)
              </p>
              <Button variant="outline" size="sm" onClick={() => handleReset("standard-grades")}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(letterGrades).map(([grade, range]) => (
                <div key={grade} className="flex items-center gap-3 p-3 border rounded-lg">
                  <LetterGradeBadge grade={grade} size="md" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={range.min}
                        onChange={(e) => updateLetterGrade(grade, "min", parseFloat(e.target.value))}
                        className="h-8"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={range.max}
                        onChange={(e) => updateLetterGrade(grade, "max", parseFloat(e.target.value))}
                        className="h-8"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="standard-zones" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Zone thresholds for traffic-light style assessment (higher score = better)
              </p>
              <Button variant="outline" size="sm" onClick={() => handleReset("standard-zones")}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </div>
            <div className="space-y-4">
              {(["green", "yellow", "orange", "red"] as Zone[]).map((zone) => {
                const config = zones[zone];
                return (
                  <div key={zone} className="flex items-center gap-4 p-4 border rounded-lg">
                    <ZoneDot zone={zone} size="lg" />
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={config.label}
                          onChange={(e) => updateZone(zone, "label", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Min Score</Label>
                        <Input
                          type="number"
                          value={config.min}
                          onChange={(e) => updateZone(zone, "min", parseFloat(e.target.value))}
                          className="h-8"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max Score</Label>
                        <Input
                          type="number"
                          value={config.max}
                          onChange={(e) => updateZone(zone, "max", parseFloat(e.target.value))}
                          className="h-8"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="fci-grades" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                FCI letter grade thresholds (lower FCI = better condition)
              </p>
              <Button variant="outline" size="sm" onClick={() => handleReset("fci-grades")}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(fciGrades).map(([grade, range]) => (
                <div key={grade} className="flex items-center gap-3 p-3 border rounded-lg">
                  <LetterGradeBadge grade={grade} size="md" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Min FCI</Label>
                      <Input
                        type="number"
                        value={range.min}
                        onChange={(e) => updateFciGrade(grade, "min", parseFloat(e.target.value))}
                        className="h-8"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max FCI</Label>
                      <Input
                        type="number"
                        value={range.max}
                        onChange={(e) => updateFciGrade(grade, "max", parseFloat(e.target.value))}
                        className="h-8"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fci-zones" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                FCI zone thresholds (lower FCI = better condition)
              </p>
              <Button variant="outline" size="sm" onClick={() => handleReset("fci-zones")}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </div>
            <div className="space-y-4">
              {(["green", "yellow", "orange", "red"] as Zone[]).map((zone) => {
                const config = fciZonesState[zone];
                return (
                  <div key={zone} className="flex items-center gap-4 p-4 border rounded-lg">
                    <ZoneDot zone={zone} size="lg" />
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={config.label}
                          onChange={(e) => updateFciZone(zone, "label", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Min FCI</Label>
                        <Input
                          type="number"
                          value={config.min}
                          onChange={(e) => updateFciZone(zone, "min", parseFloat(e.target.value))}
                          className="h-8"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max FCI</Label>
                        <Input
                          type="number"
                          value={config.max}
                          onChange={(e) => updateFciZone(zone, "max", parseFloat(e.target.value))}
                          className="h-8"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
