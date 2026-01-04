/**
 * useValidation Hook
 * 
 * Provides client-side validation with real-time feedback
 * Uses shared validation schemas for consistency with server
 */

import { useState, useCallback, useMemo } from "react";
import { z } from "zod";
import {
  assessmentValidationSchema,
  deficiencyValidationSchema,
  assetValidationSchema,
  projectValidationSchema,
  ValidationError,
  validateData,
  getFieldError,
  hasFieldError,
} from "@shared/validation";

export type ValidationSchema = 
  | "assessment"
  | "deficiency"
  | "asset"
  | "project";

const schemas: Record<ValidationSchema, z.ZodSchema<unknown>> = {
  assessment: assessmentValidationSchema,
  deficiency: deficiencyValidationSchema,
  asset: assetValidationSchema,
  project: projectValidationSchema,
};

export interface UseValidationOptions {
  schema: ValidationSchema;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseValidationReturn {
  errors: ValidationError[];
  isValid: boolean;
  validate: (data: unknown) => boolean;
  validateField: (field: string, value: unknown, fullData: unknown) => string | undefined;
  getError: (field: string) => string | undefined;
  hasError: (field: string) => boolean;
  clearErrors: () => void;
  clearFieldError: (field: string) => void;
  setFieldError: (field: string, message: string) => void;
}

/**
 * Hook for form validation with real-time feedback
 */
export function useValidation(options: UseValidationOptions): UseValidationReturn {
  const { schema } = options;
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const zodSchema = useMemo(() => schemas[schema], [schema]);

  /**
   * Validate entire form data
   */
  const validate = useCallback(
    (data: unknown): boolean => {
      const result = validateData(zodSchema, data);
      if (result.success) {
        setErrors([]);
        return true;
      }
      setErrors(result.errors);
      return false;
    },
    [zodSchema]
  );

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (field: string, value: unknown, fullData: unknown): string | undefined => {
      const dataWithField = { ...fullData as object, [field]: value };
      const result = validateData(zodSchema, dataWithField);
      
      if (result.success) {
        setErrors((prev) => prev.filter((e) => e.field !== field));
        return undefined;
      }
      
      const fieldError = result.errors.find((e) => e.field === field);
      if (fieldError) {
        setErrors((prev) => {
          const filtered = prev.filter((e) => e.field !== field);
          return [...filtered, fieldError];
        });
        return fieldError.message;
      }
      
      return undefined;
    },
    [zodSchema]
  );

  /**
   * Get error message for a specific field
   */
  const getError = useCallback(
    (field: string): string | undefined => {
      return getFieldError(errors, field);
    },
    [errors]
  );

  /**
   * Check if a field has an error
   */
  const hasError = useCallback(
    (field: string): boolean => {
      return hasFieldError(errors, field);
    },
    [errors]
  );

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }, []);

  /**
   * Manually set an error for a field
   */
  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => {
      const filtered = prev.filter((e) => e.field !== field);
      return [...filtered, { field, message }];
    });
  }, []);

  const isValid = errors.length === 0;

  return {
    errors,
    isValid,
    validate,
    validateField,
    getError,
    hasError,
    clearErrors,
    clearFieldError,
    setFieldError,
  };
}

/**
 * Validation helper for cost fields
 */
export function validateCost(value: string | number | undefined): {
  isValid: boolean;
  value: number | undefined;
  error?: string;
} {
  if (value === undefined || value === "" || value === null) {
    return { isValid: true, value: undefined };
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { isValid: false, value: undefined, error: "Must be a valid number" };
  }

  if (numValue < 0) {
    return { isValid: false, value: numValue, error: "Cost cannot be negative" };
  }

  if (numValue > 1000000000) {
    return { isValid: false, value: numValue, error: "Cost exceeds maximum allowed value" };
  }

  return { isValid: true, value: numValue };
}

/**
 * Validation helper for year fields
 */
export function validateYear(
  value: string | number | undefined,
  options: { allowFuture?: boolean; maxFutureYears?: number } = {}
): {
  isValid: boolean;
  value: number | undefined;
  error?: string;
} {
  const { allowFuture = false, maxFutureYears = 50 } = options;

  if (value === undefined || value === "" || value === null) {
    return { isValid: true, value: undefined };
  }

  const numValue = typeof value === "string" ? parseInt(value, 10) : value;

  if (isNaN(numValue) || !Number.isInteger(numValue)) {
    return { isValid: false, value: undefined, error: "Year must be a whole number" };
  }

  if (numValue < 1800) {
    return { isValid: false, value: numValue, error: "Year must be after 1800" };
  }

  const currentYear = new Date().getFullYear();
  const maxYear = allowFuture ? currentYear + maxFutureYears : currentYear;

  if (numValue > maxYear) {
    return {
      isValid: false,
      value: numValue,
      error: allowFuture
        ? `Year cannot be more than ${maxFutureYears} years in the future`
        : "Year cannot be in the future",
    };
  }

  return { isValid: true, value: numValue };
}

/**
 * Validation helper for area fields
 */
export function validateArea(value: string | number | undefined): {
  isValid: boolean;
  value: number | undefined;
  error?: string;
} {
  if (value === undefined || value === "" || value === null) {
    return { isValid: true, value: undefined };
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { isValid: false, value: undefined, error: "Must be a valid number" };
  }

  if (numValue <= 0) {
    return { isValid: false, value: numValue, error: "Area must be greater than 0" };
  }

  if (numValue > 100000000) {
    return { isValid: false, value: numValue, error: "Area exceeds maximum allowed value" };
  }

  return { isValid: true, value: numValue };
}

/**
 * Validation helper for useful life fields
 */
export function validateUsefulLife(value: string | number | undefined): {
  isValid: boolean;
  value: number | undefined;
  error?: string;
} {
  if (value === undefined || value === "" || value === null) {
    return { isValid: true, value: undefined };
  }

  const numValue = typeof value === "string" ? parseInt(value, 10) : value;

  if (isNaN(numValue) || !Number.isInteger(numValue)) {
    return { isValid: false, value: undefined, error: "Must be a whole number" };
  }

  if (numValue < 0) {
    return { isValid: false, value: numValue, error: "Useful life cannot be negative" };
  }

  if (numValue > 200) {
    return { isValid: false, value: numValue, error: "Useful life cannot exceed 200 years" };
  }

  return { isValid: true, value: numValue };
}

export default useValidation;
