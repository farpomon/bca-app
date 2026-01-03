import * as db from "./db";

export interface ValidationResult {
  isValid: boolean;
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  ruleId?: number;
  canOverride: boolean;
}

export interface ValidationContext {
  projectId: number;
  assessmentData?: any;
  deficiencyData?: any;
  userId: number;
}

/**
 * Validate assessment data against configured rules
 */
export async function validateAssessment(
  context: ValidationContext
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  if (!context.assessmentData) {
    return results;
  }

  const data = context.assessmentData;
  
  // Get active validation rules for this project (and global rules)
  const rules = await db.getValidationRules(context.projectId);
  
  for (const rule of rules) {
    if (!(rule as any).isActive) continue;
    
    const result = await evaluateRule(rule, data, context);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Evaluate a single validation rule
 */
async function evaluateRule(
  rule: any,
  data: any,
  context: ValidationContext
): Promise<ValidationResult | null> {
  const condition = JSON.parse(rule.condition);
  
  switch (rule.ruleType) {
    case "same_year_inspection":
      return evaluateSameYearInspection(rule, data, condition, context);
    
    case "date_range":
      return evaluateDateRange(rule, data, condition);
    
    case "numeric_range":
      return evaluateNumericRange(rule, data, condition);
    
    case "required_field":
      return evaluateRequiredField(rule, data, condition);
    
    case "custom_logic":
      return evaluateCustomLogic(rule, data, condition, context);
    
    default:
      return null;
  }
}

/**
 * Check if inspection is in the same year as component installation
 * This is allowed but should show a warning
 */
async function evaluateSameYearInspection(
  rule: any,
  data: any,
  condition: any,
  context: ValidationContext
): Promise<ValidationResult | null> {
  // Get project installation year
  const project = await db.getProjectById(context.projectId, context.userId);
  if (!project || !project.yearBuilt) {
    return null;
  }
  
  const installationYear = project.yearBuilt;
  const currentYear = new Date().getFullYear();
  
  // Check if assessment is being created in the same year as installation
  if (data.assessedAt) {
    const assessmentYear = new Date(data.assessedAt).getFullYear();
    
    if (assessmentYear === installationYear) {
      return {
        isValid: false,
        severity: rule.severity || "warning",
        field: "assessedAt",
        message: rule.message || `This inspection is in the same year as the component installation (${installationYear}). Please verify this is correct.`,
        ruleId: rule.id,
        canOverride: rule.severity !== "error",
      };
    }
  }
  
  // Check if lastTimeAction is same as or before installation year
  if (data.lastTimeAction && data.lastTimeAction <= installationYear) {
    return {
      isValid: false,
      severity: rule.severity || "warning",
      field: "lastTimeAction",
      message: `Last action year (${data.lastTimeAction}) is at or before installation year (${installationYear}). Please verify this is correct.`,
      ruleId: rule.id,
      canOverride: rule.severity !== "error",
    };
  }
  
  return null;
}

/**
 * Validate date is within acceptable range
 */
function evaluateDateRange(
  rule: any,
  data: any,
  condition: any
): ValidationResult | null {
  const fieldValue = data[rule.field];
  if (!fieldValue) return null;
  
  const date = new Date(fieldValue);
  const minDate = condition.minDate ? new Date(condition.minDate) : null;
  const maxDate = condition.maxDate ? new Date(condition.maxDate) : null;
  
  if (minDate && date < minDate) {
    return {
      isValid: false,
      severity: rule.severity || "warning",
      field: rule.field,
      message: rule.message || `Date must be after ${minDate.toLocaleDateString()}`,
      ruleId: rule.id,
      canOverride: rule.severity !== "error",
    };
  }
  
  if (maxDate && date > maxDate) {
    return {
      isValid: false,
      severity: rule.severity || "warning",
      field: rule.field,
      message: rule.message || `Date must be before ${maxDate.toLocaleDateString()}`,
      ruleId: rule.id,
      canOverride: rule.severity !== "error",
    };
  }
  
  return null;
}

/**
 * Validate numeric value is within acceptable range
 */
function evaluateNumericRange(
  rule: any,
  data: any,
  condition: any
): ValidationResult | null {
  const fieldValue = data[rule.field];
  if (fieldValue === null || fieldValue === undefined) return null;
  
  const value = Number(fieldValue);
  if (isNaN(value)) return null;
  
  const min = condition.min !== undefined ? Number(condition.min) : null;
  const max = condition.max !== undefined ? Number(condition.max) : null;
  
  if (min !== null && value < min) {
    return {
      isValid: false,
      severity: rule.severity || "warning",
      field: rule.field,
      message: rule.message || `Value must be at least ${min}`,
      ruleId: rule.id,
      canOverride: rule.severity !== "error",
    };
  }
  
  if (max !== null && value > max) {
    return {
      isValid: false,
      severity: rule.severity || "warning",
      field: rule.field,
      message: rule.message || `Value must be at most ${max}`,
      ruleId: rule.id,
      canOverride: rule.severity !== "error",
    };
  }
  
  return null;
}

/**
 * Check if required field is present
 */
function evaluateRequiredField(
  rule: any,
  data: any,
  condition: any
): ValidationResult | null {
  const fieldValue = data[rule.field];
  
  if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
    return {
      isValid: false,
      severity: rule.severity || "warning",
      field: rule.field,
      message: rule.message || `${rule.field} is required`,
      ruleId: rule.id,
      canOverride: rule.severity !== "error",
    };
  }
  
  return null;
}

/**
 * Evaluate custom validation logic
 */
async function evaluateCustomLogic(
  rule: any,
  data: any,
  condition: any,
  context: ValidationContext
): Promise<ValidationResult | null> {
  // Custom logic can be extended here
  // For now, return null (no validation)
  return null;
}

/**
 * Log validation override
 */
export async function logValidationOverride(override: {
  ruleId: number;
  assessmentId?: number;
  deficiencyId?: number;
  projectId: number;
  fieldName: string;
  originalValue: string;
  overriddenValue: string;
  justification?: string;
  overriddenBy: number;
}): Promise<number> {
  return await db.createValidationOverride(override);
}
