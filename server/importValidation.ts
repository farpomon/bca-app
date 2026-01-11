import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { importValidationResults, type InsertImportValidationResult } from "../drizzle/schema";
import type { User } from "../drizzle/schema";
import { v4 as uuidv4 } from 'uuid';

/**
 * Import types supported by the validation system
 */
export type ImportType = 'criteria' | 'assets' | 'assessments' | 'deficiencies' | 'projects';

/**
 * Import behavior options
 */
export type ImportBehavior = 'skip_duplicates' | 'update_existing' | 'import_all';

/**
 * Validation error detail
 */
export interface ValidationError {
  row: number;
  field: string;
  value: any;
  error: string;
  severity: 'error' | 'warning';
}

/**
 * Duplicate detection detail
 */
export interface DuplicateDetail {
  row: number;
  matchType: 'exact' | 'similar' | 'within_file';
  existingId?: number;
  existingName?: string;
  similarity?: number;
  fields: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  sessionId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatesInFile: number;
  duplicatesInDatabase: number;
  missingRequiredFields: number;
  invalidDataFormats: number;
  validationErrors: ValidationError[];
  duplicateDetails: DuplicateDetail[];
  canProceed: boolean;
  recommendations: string[];
}

/**
 * Normalize string for comparison (trim, lowercase, remove punctuation)
 */
function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calculate similarity between two strings (simple Levenshtein-based)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 1.0;

  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Validate required fields
 */
function validateRequiredFields(
  row: any,
  rowIndex: number,
  requiredFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push({
        row: rowIndex,
        field,
        value: row[field],
        error: `Required field "${field}" is missing or empty`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate data formats
 */
function validateDataFormats(row: any, rowIndex: number, importType: ImportType): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate numeric fields
  if (row.weight !== undefined && row.weight !== null) {
    const weight = Number(row.weight);
    if (isNaN(weight)) {
      errors.push({
        row: rowIndex,
        field: 'weight',
        value: row.weight,
        error: 'Weight must be a valid number',
        severity: 'error',
      });
    } else if (weight < 0) {
      errors.push({
        row: rowIndex,
        field: 'weight',
        value: row.weight,
        error: 'Weight cannot be negative',
        severity: 'error',
      });
    } else if (weight > 100) {
      errors.push({
        row: rowIndex,
        field: 'weight',
        value: row.weight,
        error: 'Weight cannot exceed 100',
        severity: 'warning',
      });
    }
  }

  // Validate cost fields
  if (row.cost !== undefined && row.cost !== null) {
    const cost = Number(row.cost);
    if (isNaN(cost)) {
      errors.push({
        row: rowIndex,
        field: 'cost',
        value: row.cost,
        error: 'Cost must be a valid number',
        severity: 'error',
      });
    } else if (cost < 0) {
      errors.push({
        row: rowIndex,
        field: 'cost',
        value: row.cost,
        error: 'Cost cannot be negative',
        severity: 'error',
      });
    }
  }

  // Validate area fields
  if (row.area !== undefined && row.area !== null) {
    const area = Number(row.area);
    if (isNaN(area)) {
      errors.push({
        row: rowIndex,
        field: 'area',
        value: row.area,
        error: 'Area must be a valid number',
        severity: 'error',
      });
    } else if (area <= 0) {
      errors.push({
        row: rowIndex,
        field: 'area',
        value: row.area,
        error: 'Area must be greater than zero',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Check for duplicates within the import file itself
 */
function checkDuplicatesWithinFile(
  rows: any[],
  uniqueFields: string[]
): DuplicateDetail[] {
  const duplicates: DuplicateDetail[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = uniqueFields.map(field => normalizeString(String(row[field] ?? ''))).join('|');

    if (seen.has(key)) {
      duplicates.push({
        row: i + 1,
        matchType: 'within_file',
        fields: uniqueFields,
      });
    } else {
      seen.set(key, i);
    }
  }

  return duplicates;
}

/**
 * Check for duplicates against existing database records
 */
async function checkDuplicatesInDatabase(
  rows: any[],
  importType: ImportType,
  projectId?: number
): Promise<DuplicateDetail[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const duplicates: DuplicateDetail[] = [];

  if (importType === 'assets' && projectId) {
    // Check for duplicate asset names within the same project
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name) continue;

      const result = await db.execute(sql`
        SELECT id, name
        FROM assets
        WHERE projectId = ${projectId}
        AND LOWER(TRIM(name)) = ${normalizeString(row.name)}
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        const existing = result.rows[0] as any;
        duplicates.push({
          row: i + 1,
          matchType: 'exact',
          existingId: existing.id,
          existingName: existing.name,
          similarity: 1.0,
          fields: ['name'],
        });
      }
    }
  } else if (importType === 'projects') {
    // Check for duplicate project names and locations
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name) continue;

      const location = row.location ? normalizeString(row.location) : '';
      
      const result = await db.execute(sql`
        SELECT id, name, location
        FROM projects
        WHERE LOWER(TRIM(name)) = ${normalizeString(row.name)}
        AND LOWER(TRIM(COALESCE(location, ''))) = ${location}
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        const existing = result.rows[0] as any;
        duplicates.push({
          row: i + 1,
          matchType: 'exact',
          existingId: existing.id,
          existingName: existing.name,
          similarity: 1.0,
          fields: ['name', 'location'],
        });
      }
    }
  }

  return duplicates;
}

/**
 * Validate bulk import data
 */
export async function validateBulkImport(
  rows: any[],
  importType: ImportType,
  user: User,
  options: {
    projectId?: number;
    fileName?: string;
    fileSize?: number;
  } = {}
): Promise<ValidationResult> {
  const sessionId = uuidv4();
  const validationErrors: ValidationError[] = [];
  const duplicateDetails: DuplicateDetail[] = [];

  // Define required fields based on import type
  const requiredFieldsMap: Record<ImportType, string[]> = {
    assets: ['name'],
    projects: ['name'],
    assessments: ['componentId', 'condition'],
    deficiencies: ['description', 'priority'],
    criteria: ['name', 'category'],
  };

  const requiredFields = requiredFieldsMap[importType] || [];
  const uniqueFields = importType === 'assets' || importType === 'projects' ? ['name'] : [];

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check required fields
    const fieldErrors = validateRequiredFields(row, i + 1, requiredFields);
    validationErrors.push(...fieldErrors);

    // Check data formats
    const formatErrors = validateDataFormats(row, i + 1, importType);
    validationErrors.push(...formatErrors);
  }

  // Check for duplicates within file
  if (uniqueFields.length > 0) {
    const withinFileDuplicates = checkDuplicatesWithinFile(rows, uniqueFields);
    duplicateDetails.push(...withinFileDuplicates);
  }

  // Check for duplicates in database
  const databaseDuplicates = await checkDuplicatesInDatabase(rows, importType, options.projectId);
  duplicateDetails.push(...databaseDuplicates);

  // Calculate counts
  const errorRows = new Set(validationErrors.filter(e => e.severity === 'error').map(e => e.row));
  const duplicateRows = new Set(duplicateDetails.map(d => d.row));
  
  const invalidRows = errorRows.size;
  const validRows = rows.length - invalidRows;
  const duplicatesInFile = duplicateDetails.filter(d => d.matchType === 'within_file').length;
  const duplicatesInDatabase = duplicateDetails.filter(d => d.matchType === 'exact' || d.matchType === 'similar').length;

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (invalidRows > 0) {
    recommendations.push(`Fix ${invalidRows} rows with validation errors before importing`);
  }
  
  if (duplicatesInFile > 0) {
    recommendations.push(`Remove ${duplicatesInFile} duplicate rows within the import file`);
  }
  
  if (duplicatesInDatabase > 0) {
    recommendations.push(`${duplicatesInDatabase} rows match existing records - choose import behavior`);
  }

  if (validRows === rows.length && duplicateDetails.length === 0) {
    recommendations.push('All rows are valid and ready to import');
  }

  const canProceed = invalidRows === 0;

  // Store validation result
  await storeValidationResult({
    sessionId,
    userId: user.id,
    userName: user.name ?? null,
    companyId: user.companyId ?? null,
    importType,
    fileName: options.fileName ?? null,
    fileSize: options.fileSize ?? null,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicatesInFile,
    duplicatesInDatabase,
    missingRequiredFields: validationErrors.filter(e => e.error.includes('missing')).length,
    invalidDataFormats: validationErrors.filter(e => e.error.includes('format') || e.error.includes('number')).length,
    validationErrors: JSON.stringify(validationErrors),
    duplicateDetails: JSON.stringify(duplicateDetails),
  });

  return {
    sessionId,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicatesInFile,
    duplicatesInDatabase,
    missingRequiredFields: validationErrors.filter(e => e.error.includes('missing')).length,
    invalidDataFormats: validationErrors.filter(e => e.error.includes('format') || e.error.includes('number')).length,
    validationErrors,
    duplicateDetails,
    canProceed,
    recommendations,
  };
}

/**
 * Store validation result in database
 */
async function storeValidationResult(data: Partial<InsertImportValidationResult>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[ImportValidation] Database not available, skipping storage");
    return;
  }

  await db.insert(importValidationResults).values(data as InsertImportValidationResult);
}

/**
 * Execute validated import with specified behavior
 */
export async function executeValidatedImport(
  sessionId: string,
  behavior: ImportBehavior,
  rows: any[],
  importType: ImportType,
  user: User,
  options: {
    projectId?: number;
  } = {}
): Promise<{
  success: boolean;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;
  const errors: string[] = [];

  // This is a placeholder - actual import logic would be implemented per entity type
  // For now, just track the intent
  
  // Update validation result with execution status
  await db.execute(sql`
    UPDATE import_validation_results
    SET 
      importDecision = 'approved',
      importBehavior = ${behavior},
      importExecutedAt = NOW(),
      importStatus = 'completed',
      recordsCreated = ${recordsCreated},
      recordsUpdated = ${recordsUpdated},
      recordsSkipped = ${recordsSkipped},
      recordsFailed = ${recordsFailed}
    WHERE sessionId = ${sessionId}
  `);

  return {
    success: recordsFailed === 0,
    recordsCreated,
    recordsUpdated,
    recordsSkipped,
    recordsFailed,
    errors,
  };
}
