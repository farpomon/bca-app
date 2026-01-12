/**
 * Validation Alert Components
 * Displays validation errors and data quality warnings
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { ValidationError, DataQualityIssue } from '@shared/reportTypes';

interface ValidationAlertsProps {
  metadataErrors: ValidationError[];
  dataIssues: DataQualityIssue[];
  qualityIssues: DataQualityIssue[];
  onFixAction?: (action: string) => void;
}

export function ValidationAlerts({
  metadataErrors,
  dataIssues,
  qualityIssues,
  onFixAction,
}: ValidationAlertsProps) {
  const hasErrors = metadataErrors.length > 0 || 
    dataIssues.some(issue => issue.severity === 'error') ||
    qualityIssues.some(issue => issue.severity === 'error');
  
  const hasWarnings = dataIssues.some(issue => issue.severity === 'warning') ||
    qualityIssues.some(issue => issue.severity === 'warning');

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Metadata Errors */}
      {metadataErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Required Information Missing</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {metadataErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Issues - Errors */}
      {dataIssues.filter(issue => issue.severity === 'error').map((issue, index) => (
        <Alert key={`data-error-${index}`} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{issue.section}</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{issue.message}</p>
              {issue.fixAction && onFixAction && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFixAction(issue.fixAction!)}
                  className="gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  {issue.fixAction}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Data Issues - Warnings */}
      {dataIssues.filter(issue => issue.severity === 'warning').length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Availability Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-2 mt-2">
              {dataIssues.filter(issue => issue.severity === 'warning').map((issue, index) => (
                <li key={index}>
                  <span className="font-medium">{issue.section}:</span> {issue.message}
                  {issue.fixAction && onFixAction && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onFixAction(issue.fixAction!)}
                      className="h-auto p-0 ml-2"
                    >
                      {issue.fixAction}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              You can still generate the report, but these sections may be incomplete or empty.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Quality Issues */}
      {qualityIssues.length > 0 && (
        <Alert variant={qualityIssues.some(i => i.severity === 'error') ? 'destructive' : 'default'}>
          {qualityIssues.some(i => i.severity === 'error') ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <AlertTitle>Data Quality Issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-2 mt-2">
              {qualityIssues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-1">
                    <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'} className="mr-2">
                      {issue.severity}
                    </Badge>
                    <span className="font-medium">{issue.section}:</span> {issue.message}
                  </span>
                  {issue.fixAction && onFixAction && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onFixAction(issue.fixAction!)}
                      className="h-auto p-0"
                    >
                      {issue.fixAction}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface PresetAppliedBannerProps {
  presetName: string;
  onDismiss: () => void;
}

export function PresetAppliedBanner({ presetName, onDismiss }: PresetAppliedBannerProps) {
  return (
    <Alert className="bg-primary/5 border-primary/20">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          <strong>{presetName}</strong> preset applied. You can still customize individual sections below.
        </span>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </AlertDescription>
    </Alert>
  );
}
