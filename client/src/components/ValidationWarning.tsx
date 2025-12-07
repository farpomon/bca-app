import { AlertTriangle, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export interface ValidationResult {
  isValid: boolean;
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  ruleId?: number;
  canOverride: boolean;
}

interface ValidationWarningProps {
  results: ValidationResult[];
  onOverride?: (ruleId: number, justification: string) => void;
  onCancel?: () => void;
}

export function ValidationWarning({
  results,
  onOverride,
  onCancel,
}: ValidationWarningProps) {
  const [justifications, setJustifications] = useState<Record<number, string>>({});
  const [overriddenRules, setOverriddenRules] = useState<Set<number>>(new Set());

  if (results.length === 0) return null;

  const errors = results.filter((r) => r.severity === "error");
  const warnings = results.filter((r) => r.severity === "warning");
  const infos = results.filter((r) => r.severity === "info");

  const hasBlockingErrors = errors.length > 0;
  const allOverridable = warnings.every((w) => w.canOverride);

  const handleOverride = (ruleId: number) => {
    if (!ruleId) return;
    const justification = justifications[ruleId] || "";
    setOverriddenRules((prev) => new Set(prev).add(ruleId));
    onOverride?.(ruleId, justification);
  };

  const allWarningsOverridden = warnings.every(
    (w) => !w.ruleId || overriddenRules.has(w.ruleId)
  );

  return (
    <div className="space-y-3">
      {errors.map((error, idx) => (
        <Alert key={`error-${idx}`} variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ))}

      {warnings.map((warning, idx) => {
        const isOverridden = warning.ruleId && overriddenRules.has(warning.ruleId);
        
        return (
          <Alert key={`warning-${idx}`} className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">
              Warning
            </AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              <p className="mb-2">{warning.message}</p>
              
              {warning.canOverride && !isOverridden && warning.ruleId && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`justification-${warning.ruleId}`} className="text-sm">
                    Justification (optional):
                  </Label>
                  <Textarea
                    id={`justification-${warning.ruleId}`}
                    placeholder="Explain why you're proceeding despite this warning..."
                    value={justifications[warning.ruleId] || ""}
                    onChange={(e) =>
                      setJustifications((prev) => ({
                        ...prev,
                        [warning.ruleId!]: e.target.value,
                      }))
                    }
                    className="min-h-[60px] text-sm bg-white dark:bg-gray-900"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOverride(warning.ruleId!)}
                    className="mt-2"
                  >
                    Proceed Anyway
                  </Button>
                </div>
              )}
              
              {isOverridden && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ Override acknowledged
                </p>
              )}
            </AlertDescription>
          </Alert>
        );
      })}

      {infos.map((info, idx) => (
        <Alert key={`info-${idx}`} className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            Information
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            {info.message}
          </AlertDescription>
        </Alert>
      ))}

      {hasBlockingErrors && (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Go Back
          </Button>
        </div>
      )}

      {!hasBlockingErrors && warnings.length > 0 && !allWarningsOverridden && (
        <p className="text-sm text-muted-foreground">
          You can proceed with warnings by providing justification above, or go back to make changes.
        </p>
      )}
    </div>
  );
}
