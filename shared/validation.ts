/**
 * Shared Validation Schemas
 * 
 * Comprehensive validation schemas for BCA data using Zod
 * Used for both client-side and server-side validation
 */

import { z } from "zod";

// ============================================
// Common Validation Helpers
// ============================================

const currentYear = new Date().getFullYear();

/**
 * Positive number validation
 */
export const positiveNumber = z.number().min(0, "Value must be positive");

/**
 * Year validation (reasonable range)
 */
export const yearSchema = z.number()
  .int("Year must be a whole number")
  .min(1800, "Year must be after 1800")
  .max(currentYear + 50, "Year cannot be more than 50 years in the future");

/**
 * Past year validation (for historical dates)
 */
export const pastYearSchema = z.number()
  .int("Year must be a whole number")
  .min(1800, "Year must be after 1800")
  .max(currentYear, "Year cannot be in the future");

/**
 * Cost validation
 */
export const costSchema = z.number()
  .min(0, "Cost cannot be negative")
  .max(1000000000, "Cost exceeds maximum allowed value");

/**
 * Area validation (square feet/meters)
 */
export const areaSchema = z.number()
  .positive("Area must be greater than 0")
  .max(100000000, "Area exceeds maximum allowed value");

/**
 * Useful life validation (years)
 */
export const usefulLifeSchema = z.number()
  .int("Useful life must be a whole number")
  .min(0, "Useful life cannot be negative")
  .max(200, "Useful life cannot exceed 200 years");

// ============================================
// Assessment Validation Schema
// ============================================

export const assessmentConditions = ["good", "fair", "poor", "not_assessed"] as const;
export const assessmentStatuses = ["initial", "active", "completed"] as const;

export const assessmentValidationSchema = z.object({
  projectId: z.number().int().positive("Project ID is required"),
  assetId: z.number().int().positive("Asset ID is required"),
  componentCode: z.string().min(1, "Component code is required"),
  componentName: z.string().max(255, "Component name too long").nullable().optional(),
  componentLocation: z.string().max(500, "Component location too long").nullable().optional(),
  condition: z.string().refine(
    (val) => assessmentConditions.includes(val as typeof assessmentConditions[number]),
    { message: "Invalid condition value" }
  ).nullable().optional(),
  status: z.string().refine(
    (val) => assessmentStatuses.includes(val as typeof assessmentStatuses[number]),
    { message: "Invalid status value" }
  ).nullable().optional(),
  observations: z.string().max(10000, "Observations too long").nullable().optional(),
  recommendations: z.string().max(10000, "Recommendations too long").nullable().optional(),
  estimatedServiceLife: usefulLifeSchema.nullable().optional(),
  reviewYear: yearSchema.nullable().optional(),
  lastTimeAction: pastYearSchema.nullable().optional(),
  estimatedRepairCost: costSchema.nullable().optional(),
  replacementValue: costSchema.nullable().optional(),
  actionYear: yearSchema.nullable().optional(),
});

export type AssessmentInput = z.infer<typeof assessmentValidationSchema>;

// ============================================
// Deficiency Validation Schema
// ============================================

export const deficiencySeverities = ["critical", "high", "medium", "low"] as const;
export const deficiencyPriorities = ["immediate", "short_term", "medium_term", "long_term"] as const;
export const deficiencyStatuses = ["open", "in_progress", "resolved", "deferred"] as const;

export const deficiencyValidationSchema = z.object({
  projectId: z.number().int().positive("Project ID is required"),
  assetId: z.number().int().positive().nullable().optional(),
  assessmentId: z.number().int().positive().nullable().optional(),
  title: z.string()
    .min(1, "Title is required")
    .max(255, "Title too long"),
  description: z.string().max(10000, "Description too long").nullable().optional(),
  severity: z.string().refine(
    (val) => deficiencySeverities.includes(val as typeof deficiencySeverities[number]),
    { message: "Invalid severity value" }
  ),
  priority: z.string().refine(
    (val) => deficiencyPriorities.includes(val as typeof deficiencyPriorities[number]),
    { message: "Invalid priority value" }
  ),
  status: z.string().refine(
    (val) => deficiencyStatuses.includes(val as typeof deficiencyStatuses[number]),
    { message: "Invalid status value" }
  ).optional().default("open"),
  estimatedCost: costSchema.nullable().optional(),
  actualCost: costSchema.nullable().optional(),
  targetResolutionDate: z.string().nullable().optional(),
  componentCode: z.string().max(50, "Component code too long").nullable().optional(),
  location: z.string().max(500, "Location too long").nullable().optional(),
});

export type DeficiencyInput = z.infer<typeof deficiencyValidationSchema>;

// ============================================
// Asset Validation Schema
// ============================================

export const assetValidationSchema = z.object({
  projectId: z.number().int().positive("Project ID is required"),
  name: z.string()
    .min(1, "Asset name is required")
    .max(255, "Asset name too long"),
  description: z.string().max(5000, "Description too long").nullable().optional(),
  assetType: z.string().max(100, "Asset type too long").nullable().optional(),
  yearBuilt: pastYearSchema.nullable().optional(),
  grossArea: areaSchema.nullable().optional(),
  netArea: areaSchema.nullable().optional(),
  currentReplacementValue: costSchema.nullable().optional(),
  estimatedUsefulLife: usefulLifeSchema.nullable().optional(),
  remainingUsefulLife: usefulLifeSchema.nullable().optional(),
  location: z.string().max(500, "Location too long").nullable().optional(),
  floor: z.string().max(50, "Floor identifier too long").nullable().optional(),
  room: z.string().max(100, "Room identifier too long").nullable().optional(),
});

export type AssetInput = z.infer<typeof assetValidationSchema>;

// ============================================
// Project Validation Schema
// ============================================

export const projectValidationSchema = z.object({
  name: z.string()
    .min(1, "Project name is required")
    .max(255, "Project name too long"),
  description: z.string().max(5000, "Description too long").nullable().optional(),
  address: z.string().max(500, "Address too long").nullable().optional(),
  city: z.string().max(100, "City name too long").nullable().optional(),
  state: z.string().max(100, "State name too long").nullable().optional(),
  zipCode: z.string().max(20, "Zip code too long").nullable().optional(),
  country: z.string().max(100, "Country name too long").nullable().optional(),
  yearBuilt: pastYearSchema.nullable().optional(),
  grossArea: areaSchema.nullable().optional(),
  netArea: areaSchema.nullable().optional(),
  currentReplacementValue: costSchema.nullable().optional(),
  buildingType: z.string().max(100, "Building type too long").nullable().optional(),
});

export type ProjectInput = z.infer<typeof projectValidationSchema>;

// ============================================
// Photo Validation Schema
// ============================================

export const allowedPhotoMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const photoValidationSchema = z.object({
  projectId: z.number().int().positive("Project ID is required"),
  assessmentId: z.number().int().positive("Assessment ID is required"),
  fileName: z.string()
    .min(1, "File name is required")
    .max(255, "File name too long"),
  mimeType: z.string().refine(
    (val) => allowedPhotoMimeTypes.includes(val as typeof allowedPhotoMimeTypes[number]),
    { message: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC" }
  ),
  fileSize: z.number()
    .positive("File size must be positive")
    .max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
  caption: z.string().max(500, "Caption too long").nullable().optional(),
});

export type PhotoInput = z.infer<typeof photoValidationSchema>;

// ============================================
// Validation Error Types
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  data?: unknown;
}

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Validate data against a schema and return structured errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      errors: [],
      data: result.data,
    };
  }
  
  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  
  return {
    success: false,
    errors,
  };
}

/**
 * Get error message for a specific field
 */
export function getFieldError(
  errors: ValidationError[],
  field: string
): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

/**
 * Check if a field has an error
 */
export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some((e) => e.field === field);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.field}: ${e.message}`).join("\n");
}
