import * as XLSX from "xlsx";

/**
 * Generate Excel template for assessment data upload
 */
export function generateAssessmentTemplate(): Buffer {
  const workbook = XLSX.utils.book_new();

  // Instructions sheet
  const instructions = [
    ["Building Condition Assessment - Data Upload Template"],
    [""],
    ["Instructions:"],
    ["1. Fill in the Assessment Data sheet with your inspection findings"],
    ["2. Do not modify column headers or the Instructions sheet"],
    ["3. Required fields are marked with * in the header"],
    ["4. Use the dropdown menus for Condition and Status fields"],
    ["5. Save the file and upload it through the consultant portal"],
    [""],
    ["Field Descriptions:"],
    ["Component Code*: Unique identifier for the component (e.g., B10, C20.10)"],
    ["Component Name: Descriptive name of the component"],
    ["Condition*: Current condition rating (good, fair, poor, not_assessed)"],
    ["Status: Assessment status (initial, active, completed)"],
    ["Condition %: Percentage rating of condition (0-100)"],
    ["Observations: Detailed notes about component condition (supports rich text)"],
    ["Recommendations: Maintenance or repair recommendations"],
    ["Remaining Useful Life: Years of useful life remaining"],
    ["Expected Useful Life: Total expected lifespan in years"],
    ["Review Year: Year when next review is recommended"],
    ["Last Action Year: Year of last maintenance/repair"],
    ["Estimated Repair Cost: Cost estimate for repairs (USD)"],
    ["Replacement Value: Full replacement cost (USD)"],
    ["Action Year: Year when action is recommended"],
    [""],
    ["Notes:"],
    ["- Costs should be entered as numbers without currency symbols or commas"],
    ["- Years should be 4-digit format (e.g., 2024)"],
    ["- Leave optional fields blank if not applicable"],
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  // Assessment data sheet with headers
  const headers = [
    "Component Code*",
    "Component Name",
    "Condition*",
    "Status",
    "Condition %",
    "Observations",
    "Recommendations",
    "Remaining Useful Life",
    "Expected Useful Life",
    "Review Year",
    "Last Action Year",
    "Estimated Repair Cost",
    "Replacement Value",
    "Action Year",
  ];

  // Sample data row
  const sampleData = [
    "B10.01",
    "Roof Membrane - East Wing",
    "fair",
    "active",
    "65",
    "Minor cracking observed in northeast corner. No active leaks.",
    "Monitor condition annually. Plan for replacement in 3-5 years.",
    "4",
    "20",
    "2025",
    "2018",
    "25000",
    "150000",
    "2028",
  ];

  const dataSheet = XLSX.utils.aoa_to_sheet([headers, sampleData]);

  // Set column widths
  dataSheet["!cols"] = [
    { wch: 15 }, // Component Code
    { wch: 30 }, // Component Name
    { wch: 12 }, // Condition
    { wch: 12 }, // Status
    { wch: 12 }, // Condition %
    { wch: 50 }, // Observations
    { wch: 50 }, // Recommendations
    { wch: 18 }, // Remaining Useful Life
    { wch: 18 }, // Expected Useful Life
    { wch: 12 }, // Review Year
    { wch: 15 }, // Last Action Year
    { wch: 20 }, // Estimated Repair Cost
    { wch: 18 }, // Replacement Value
    { wch: 12 }, // Action Year
  ];

  // Add data validation for dropdown fields
  // Note: Data validation in XLSX is complex and may not work in all spreadsheet applications
  // For now, we'll rely on backend validation

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Assessment Data");

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

/**
 * Generate Excel template for deficiency data upload
 */
export function generateDeficiencyTemplate(): Buffer {
  const workbook = XLSX.utils.book_new();

  // Instructions sheet
  const instructions = [
    ["Deficiency Report - Data Upload Template"],
    [""],
    ["Instructions:"],
    ["1. Fill in the Deficiency Data sheet with identified deficiencies"],
    ["2. Do not modify column headers or the Instructions sheet"],
    ["3. Required fields are marked with * in the header"],
    ["4. Use the dropdown menus for Priority and Status fields"],
    ["5. Save the file and upload it through the consultant portal"],
    [""],
    ["Field Descriptions:"],
    ["Component Code*: Component where deficiency was found (e.g., B10, C20.10)"],
    ["Title*: Brief title of the deficiency"],
    ["Description*: Detailed description of the issue"],
    ["Priority*: Urgency level (critical, high, medium, low)"],
    ["Status: Current status (open, in_progress, resolved, deferred)"],
    ["Location: Specific location within the component"],
    ["Estimated Cost: Cost estimate to address deficiency (USD)"],
    ["Recommended Action: Proposed solution or repair method"],
    ["Target Resolution Date: Date by which issue should be resolved (YYYY-MM-DD)"],
    [""],
    ["Priority Levels:"],
    ["- critical: Immediate safety hazard or system failure"],
    ["- high: Significant issue requiring prompt attention"],
    ["- medium: Issue that should be addressed in near term"],
    ["- low: Minor issue for future maintenance"],
    [""],
    ["Notes:"],
    ["- Costs should be entered as numbers without currency symbols or commas"],
    ["- Dates should be in YYYY-MM-DD format (e.g., 2024-12-31)"],
    ["- Leave optional fields blank if not applicable"],
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  // Deficiency data sheet with headers
  const headers = [
    "Component Code*",
    "Title*",
    "Description*",
    "Priority*",
    "Status",
    "Location",
    "Estimated Cost",
    "Recommended Action",
    "Target Resolution Date",
  ];

  // Sample data row
  const sampleData = [
    "B10.01",
    "Roof Membrane Cracking",
    "Multiple cracks observed in roof membrane along east wing. Cracks range from 6-12 inches in length. No active leaks detected but potential for water infiltration during heavy rain.",
    "high",
    "open",
    "East Wing - Northeast Corner",
    "8500",
    "Apply membrane patch and sealant. Monitor for additional cracking. Consider full membrane replacement if cracking spreads.",
    "2025-06-30",
  ];

  const dataSheet = XLSX.utils.aoa_to_sheet([headers, sampleData]);

  // Set column widths
  dataSheet["!cols"] = [
    { wch: 15 }, // Component Code
    { wch: 30 }, // Title
    { wch: 60 }, // Description
    { wch: 12 }, // Priority
    { wch: 12 }, // Status
    { wch: 30 }, // Location
    { wch: 15 }, // Estimated Cost
    { wch: 50 }, // Recommended Action
    { wch: 20 }, // Target Resolution Date
  ];

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Deficiency Data");

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

/**
 * Parse uploaded assessment spreadsheet
 */
export interface ParsedAssessment {
  componentCode: string;
  componentName?: string;
  condition: "good" | "fair" | "poor" | "not_assessed";
  status?: "initial" | "active" | "completed";
  conditionPercentage?: string;
  observations?: string;
  recommendations?: string;
  remainingUsefulLife?: number;
  expectedUsefulLife?: number;
  reviewYear?: number;
  lastTimeAction?: number;
  estimatedRepairCost?: number;
  replacementValue?: number;
  actionYear?: number;
}

export interface ParseResult<T> {
  data: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export function parseAssessmentSpreadsheet(buffer: Buffer): ParseResult<ParsedAssessment> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames.find((name) => name.includes("Assessment Data")) || workbook.SheetNames[0];
  
  if (!sheetName) {
    return {
      data: [],
      errors: [{ row: 0, message: "No data sheet found in workbook" }],
      warnings: [],
    };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  const result: ParseResult<ParsedAssessment> = {
    data: [],
    errors: [],
    warnings: [],
  };

  rawData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because Excel is 1-indexed and has header row

    // Required fields validation
    if (!row["Component Code*"] && !row["Component Code"]) {
      result.errors.push({
        row: rowNumber,
        field: "Component Code",
        message: "Component Code is required",
      });
      return;
    }

    if (!row["Condition*"] && !row["Condition"]) {
      result.errors.push({
        row: rowNumber,
        field: "Condition",
        message: "Condition is required",
      });
      return;
    }

    const componentCode = (row["Component Code*"] || row["Component Code"])?.toString().trim();
    const conditionRaw = (row["Condition*"] || row["Condition"])?.toString().toLowerCase().trim();

    // Validate condition enum
    const validConditions = ["good", "fair", "poor", "not_assessed"];
    if (!validConditions.includes(conditionRaw)) {
      result.errors.push({
        row: rowNumber,
        field: "Condition",
        message: `Invalid condition "${conditionRaw}". Must be one of: ${validConditions.join(", ")}`,
      });
      return;
    }

    // Parse optional status
    let status: "initial" | "active" | "completed" | undefined;
    if (row["Status"]) {
      const statusRaw = row["Status"].toString().toLowerCase().trim();
      const validStatuses = ["initial", "active", "completed"];
      if (validStatuses.includes(statusRaw)) {
        status = statusRaw as any;
      } else {
        result.warnings.push({
          row: rowNumber,
          field: "Status",
          message: `Invalid status "${statusRaw}". Using default. Valid values: ${validStatuses.join(", ")}`,
        });
      }
    }

    // Parse numeric fields
    const parseNumber = (value: any, fieldName: string): number | undefined => {
      if (value === null || value === undefined || value === "") return undefined;
      const num = Number(value);
      if (isNaN(num)) {
        result.warnings.push({
          row: rowNumber,
          field: fieldName,
          message: `Invalid number "${value}" - field will be empty`,
        });
        return undefined;
      }
      return num;
    };

    const assessment: ParsedAssessment = {
      componentCode,
      componentName: row["Component Name"]?.toString().trim() || undefined,
      condition: conditionRaw as any,
      status,
      conditionPercentage: row["Condition %"]?.toString().trim() || undefined,
      observations: row["Observations"]?.toString().trim() || undefined,
      recommendations: row["Recommendations"]?.toString().trim() || undefined,
      remainingUsefulLife: parseNumber(row["Remaining Useful Life"], "Remaining Useful Life"),
      expectedUsefulLife: parseNumber(row["Expected Useful Life"], "Expected Useful Life"),
      reviewYear: parseNumber(row["Review Year"], "Review Year"),
      lastTimeAction: parseNumber(row["Last Action Year"], "Last Action Year"),
      estimatedRepairCost: parseNumber(row["Estimated Repair Cost"], "Estimated Repair Cost"),
      replacementValue: parseNumber(row["Replacement Value"], "Replacement Value"),
      actionYear: parseNumber(row["Action Year"], "Action Year"),
    };

    result.data.push(assessment);
  });

  return result;
}

/**
 * Parse uploaded deficiency spreadsheet
 */
export interface ParsedDeficiency {
  componentCode: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  status?: "open" | "in_progress" | "resolved" | "deferred";
  location?: string;
  estimatedCost?: number;
  recommendedAction?: string;
  targetResolutionDate?: string;
}

export function parseDeficiencySpreadsheet(buffer: Buffer): ParseResult<ParsedDeficiency> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames.find((name) => name.includes("Deficiency Data")) || workbook.SheetNames[0];
  
  if (!sheetName) {
    return {
      data: [],
      errors: [{ row: 0, message: "No data sheet found in workbook" }],
      warnings: [],
    };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  const result: ParseResult<ParsedDeficiency> = {
    data: [],
    errors: [],
    warnings: [],
  };

  rawData.forEach((row, index) => {
    const rowNumber = index + 2;

    // Required fields validation
    const requiredFields = [
      { key: "Component Code*", alt: "Component Code", name: "Component Code" },
      { key: "Title*", alt: "Title", name: "Title" },
      { key: "Description*", alt: "Description", name: "Description" },
      { key: "Priority*", alt: "Priority", name: "Priority" },
    ];

    for (const field of requiredFields) {
      if (!row[field.key] && !row[field.alt]) {
        result.errors.push({
          row: rowNumber,
          field: field.name,
          message: `${field.name} is required`,
        });
        return;
      }
    }

    const componentCode = (row["Component Code*"] || row["Component Code"])?.toString().trim();
    const title = (row["Title*"] || row["Title"])?.toString().trim();
    const description = (row["Description*"] || row["Description"])?.toString().trim();
    const priorityRaw = (row["Priority*"] || row["Priority"])?.toString().toLowerCase().trim();

    // Validate priority enum
    const validPriorities = ["critical", "high", "medium", "low"];
    if (!validPriorities.includes(priorityRaw)) {
      result.errors.push({
        row: rowNumber,
        field: "Priority",
        message: `Invalid priority "${priorityRaw}". Must be one of: ${validPriorities.join(", ")}`,
      });
      return;
    }

    // Parse optional status
    let status: "open" | "in_progress" | "resolved" | "deferred" | undefined;
    if (row["Status"]) {
      const statusRaw = row["Status"].toString().toLowerCase().trim();
      const validStatuses = ["open", "in_progress", "resolved", "deferred"];
      if (validStatuses.includes(statusRaw)) {
        status = statusRaw as any;
      } else {
        result.warnings.push({
          row: rowNumber,
          field: "Status",
          message: `Invalid status "${statusRaw}". Using default. Valid values: ${validStatuses.join(", ")}`,
        });
      }
    }

    const deficiency: ParsedDeficiency = {
      componentCode,
      title,
      description,
      priority: priorityRaw as any,
      status,
      location: row["Location"]?.toString().trim() || undefined,
      estimatedCost: row["Estimated Cost"] ? Number(row["Estimated Cost"]) : undefined,
      recommendedAction: row["Recommended Action"]?.toString().trim() || undefined,
      targetResolutionDate: row["Target Resolution Date"]?.toString().trim() || undefined,
    };

    result.data.push(deficiency);
  });

  return result;
}
