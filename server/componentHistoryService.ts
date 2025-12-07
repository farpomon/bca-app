import * as db from "./db";
import { sanitizeRichText, stripHtml } from "./htmlSanitizer";

export type ChangeType =
  | "assessment_created"
  | "assessment_updated"
  | "deficiency_created"
  | "deficiency_updated"
  | "note_added"
  | "specification_updated"
  | "recommendation_added"
  | "recommendation_updated"
  | "status_changed"
  | "cost_updated";

interface LogChangeParams {
  projectId: number;
  componentCode: string;
  componentName?: string;
  changeType: ChangeType;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  richTextContent?: string;
  assessmentId?: number;
  deficiencyId?: number;
  userId: number;
  userName?: string;
  summary?: string;
  tags?: string[];
}

/**
 * Log a change to component history
 */
export async function logComponentChange(params: LogChangeParams): Promise<number> {
  // Sanitize rich text content if provided
  const sanitizedContent = params.richTextContent
    ? sanitizeRichText(params.richTextContent)
    : undefined;

  // Generate summary if not provided
  let summary = params.summary;
  if (!summary) {
    summary = generateSummary(params);
  }

  const historyId = await db.createComponentHistory({
    projectId: params.projectId,
    componentCode: params.componentCode,
    componentName: params.componentName,
    changeType: params.changeType,
    fieldName: params.fieldName,
    oldValue: params.oldValue,
    newValue: params.newValue,
    richTextContent: sanitizedContent,
    assessmentId: params.assessmentId,
    deficiencyId: params.deficiencyId,
    userId: params.userId,
    userName: params.userName,
    summary,
    tags: params.tags ? JSON.stringify(params.tags) : undefined,
  });

  return historyId;
}

/**
 * Generate a human-readable summary of the change
 */
function generateSummary(params: LogChangeParams): string {
  const { changeType, fieldName, componentName } = params;

  const component = componentName || params.componentCode;

  switch (changeType) {
    case "assessment_created":
      return `Created new assessment for ${component}`;
    case "assessment_updated":
      if (fieldName) {
        return `Updated ${fieldName} for ${component}`;
      }
      return `Updated assessment for ${component}`;
    case "deficiency_created":
      return `Reported new deficiency for ${component}`;
    case "deficiency_updated":
      if (fieldName) {
        return `Updated ${fieldName} in deficiency for ${component}`;
      }
      return `Updated deficiency for ${component}`;
    case "note_added":
      return `Added note to ${component}`;
    case "specification_updated":
      return `Updated specifications for ${component}`;
    case "recommendation_added":
      return `Added recommendation for ${component}`;
    case "recommendation_updated":
      return `Updated recommendation for ${component}`;
    case "status_changed":
      return `Changed status for ${component}`;
    case "cost_updated":
      return `Updated cost estimate for ${component}`;
    default:
      return `Updated ${component}`;
  }
}

/**
 * Log assessment changes with field-level tracking
 */
export async function logAssessmentChange(params: {
  projectId: number;
  componentCode: string;
  componentName?: string;
  assessmentId: number;
  userId: number;
  userName?: string;
  isNew: boolean;
  changes?: Record<string, { old: any; new: any }>;
  richTextFields?: Record<string, string>; // fieldName -> HTML content
}): Promise<void> {
  const { isNew, changes, richTextFields } = params;

  // Log the main event
  await logComponentChange({
    projectId: params.projectId,
    componentCode: params.componentCode,
    componentName: params.componentName,
    changeType: isNew ? "assessment_created" : "assessment_updated",
    assessmentId: params.assessmentId,
    userId: params.userId,
    userName: params.userName,
  });

  // Log individual field changes
  if (changes && !isNew) {
    for (const [fieldName, { old: oldValue, new: newValue }] of Object.entries(changes)) {
      const richTextContent = richTextFields?.[fieldName];

      await logComponentChange({
        projectId: params.projectId,
        componentCode: params.componentCode,
        componentName: params.componentName,
        changeType: "assessment_updated",
        fieldName,
        oldValue: oldValue?.toString(),
        newValue: newValue?.toString(),
        richTextContent,
        assessmentId: params.assessmentId,
        userId: params.userId,
        userName: params.userName,
      });
    }
  }
}

/**
 * Log deficiency changes with field-level tracking
 */
export async function logDeficiencyChange(params: {
  projectId: number;
  componentCode: string;
  componentName?: string;
  deficiencyId: number;
  userId: number;
  userName?: string;
  isNew: boolean;
  changes?: Record<string, { old: any; new: any }>;
  richTextFields?: Record<string, string>;
}): Promise<void> {
  const { isNew, changes, richTextFields } = params;

  // Log the main event
  await logComponentChange({
    projectId: params.projectId,
    componentCode: params.componentCode,
    componentName: params.componentName,
    changeType: isNew ? "deficiency_created" : "deficiency_updated",
    deficiencyId: params.deficiencyId,
    userId: params.userId,
    userName: params.userName,
  });

  // Log individual field changes
  if (changes && !isNew) {
    for (const [fieldName, { old: oldValue, new: newValue }] of Object.entries(changes)) {
      const richTextContent = richTextFields?.[fieldName];

      await logComponentChange({
        projectId: params.projectId,
        componentCode: params.componentCode,
        componentName: params.componentName,
        changeType: "deficiency_updated",
        fieldName,
        oldValue: oldValue?.toString(),
        newValue: newValue?.toString(),
        richTextContent,
        deficiencyId: params.deficiencyId,
        userId: params.userId,
        userName: params.userName,
      });
    }
  }
}

/**
 * Compare two objects and return changed fields
 */
export function detectChanges(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  // Check all fields in new object
  for (const key of Object.keys(newObj)) {
    if (newObj[key] !== oldObj[key]) {
      // Skip undefined/null comparisons
      if (newObj[key] == null && oldObj[key] == null) continue;

      changes[key] = {
        old: oldObj[key],
        new: newObj[key],
      };
    }
  }

  return changes;
}
