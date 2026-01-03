import * as XLSX from 'xlsx';

/**
 * Convert assessments to CSV format
 */
export function assessmentsToCSV(assessments: any[]): string {
  if (assessments.length === 0) {
    return "No assessments to export";
  }

  // Define headers
  const headers = [
    "ID",
    "Asset ID",
    "Component Code",
    "Component Name",
    "Location",
    "Condition",
    "Status",
    "Condition %",
    "Observations",
    "Recommendations",
    "Remaining Useful Life (years)",
    "Expected Useful Life (years)",
    "Review Year",
    "Last Action Year",
    "Estimated Repair Cost",
    "Replacement Value",
    "Action Year",
    "Condition Score",
    "CI Score",
    "FCI Score",
    "Assessed At",
    "Created At",
  ];

  // Build CSV rows
  const rows = assessments.map(a => [
    a.id,
    a.assetId || "",
    a.componentCode || "",
    a.componentName || "",
    a.componentLocation || "",
    a.condition || "",
    a.status || "",
    a.conditionPercentage || "",
    a.observations ? `"${a.observations.replace(/"/g, '""')}"` : "",
    a.recommendations ? `"${a.recommendations.replace(/"/g, '""')}"` : "",
    a.remainingUsefulLife || "",
    a.expectedUsefulLife || "",
    a.reviewYear || "",
    a.lastTimeAction || "",
    a.estimatedRepairCost || "",
    a.replacementValue || "",
    a.actionYear || "",
    a.conditionScore || "",
    a.ciScore || "",
    a.fciScore || "",
    a.assessedAt ? new Date(a.assessedAt).toISOString() : "",
    a.createdAt ? new Date(a.createdAt).toISOString() : "",
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  return csvContent;
}

/**
 * Convert deficiencies to CSV format
 */
export function deficienciesToCSV(deficiencies: any[]): string {
  if (deficiencies.length === 0) {
    return "No deficiencies to export";
  }

  // Define headers
  const headers = [
    "ID",
    "Assessment ID",
    "Component Code",
    "Description",
    "Severity",
    "Priority",
    "Location",
    "Estimated Cost",
    "Recommended Action",
    "Timeline",
    "Created At",
  ];

  // Build CSV rows
  const rows = deficiencies.map(d => [
    d.id,
    d.assessmentId || "",
    d.componentCode || "",
    d.description ? `"${d.description.replace(/"/g, '""')}"` : "",
    d.severity || "",
    d.priority || "",
    d.location || "",
    d.estimatedCost || "",
    d.recommendedAction ? `"${d.recommendedAction.replace(/"/g, '""')}"` : "",
    d.timeline || "",
    d.createdAt ? new Date(d.createdAt).toISOString() : "",
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  return csvContent;
}

/**
 * Convert assessments and deficiencies to Excel format (XLSX)
 * Returns a buffer that can be sent as a file download
 */
export function dataToExcel(data: {
  projectName: string;
  assessments: any[];
  deficiencies: any[];
}): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create assessments sheet
  const assessmentsData = data.assessments.map(a => ({
    "ID": a.id,
    "Asset ID": a.assetId || "",
    "Component Code": a.componentCode || "",
    "Component Name": a.componentName || "",
    "Location": a.componentLocation || "",
    "Condition": a.condition || "",
    "Status": a.status || "",
    "Condition %": a.conditionPercentage || "",
    "Observations": a.observations || "",
    "Recommendations": a.recommendations || "",
    "Remaining Useful Life (years)": a.remainingUsefulLife || "",
    "Expected Useful Life (years)": a.expectedUsefulLife || "",
    "Review Year": a.reviewYear || "",
    "Last Action Year": a.lastTimeAction || "",
    "Estimated Repair Cost": a.estimatedRepairCost || "",
    "Replacement Value": a.replacementValue || "",
    "Action Year": a.actionYear || "",
    "Condition Score": a.conditionScore || "",
    "CI Score": a.ciScore || "",
    "FCI Score": a.fciScore || "",
    "Assessed At": a.assessedAt ? new Date(a.assessedAt).toISOString() : "",
    "Created At": a.createdAt ? new Date(a.createdAt).toISOString() : "",
  }));

  const assessmentsSheet = XLSX.utils.json_to_sheet(assessmentsData);
  XLSX.utils.book_append_sheet(workbook, assessmentsSheet, "Assessments");

  // Create deficiencies sheet
  const deficienciesData = data.deficiencies.map(d => ({
    "ID": d.id,
    "Assessment ID": d.assessmentId || "",
    "Component Code": d.componentCode || "",
    "Description": d.description || "",
    "Severity": d.severity || "",
    "Priority": d.priority || "",
    "Location": d.location || "",
    "Estimated Cost": d.estimatedCost || "",
    "Recommended Action": d.recommendedAction || "",
    "Timeline": d.timeline || "",
    "Created At": d.createdAt ? new Date(d.createdAt).toISOString() : "",
  }));

  const deficienciesSheet = XLSX.utils.json_to_sheet(deficienciesData);
  XLSX.utils.book_append_sheet(workbook, deficienciesSheet, "Deficiencies");

  // Convert to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Convert multiple projects to a single Excel workbook
 * Each project gets its own sheet with assessments and deficiencies
 */
export function bulkProjectsToExcel(projects: Array<{
  project: any;
  assessments: any[];
  deficiencies: any[];
}>): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create summary sheet
  const summaryData = projects.map((p, index) => ({
    "#": index + 1,
    "Project Name": p.project.name || "",
    "Status": p.project.status || "",
    "Client": p.project.clientName || "",
    "Address": p.project.address || "",
    "Assessments": p.assessments.length,
    "Deficiencies": p.deficiencies.length,
    "Created": p.project.createdAt ? new Date(p.project.createdAt).toISOString().split('T')[0] : "",
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Create sheets for each project
  projects.forEach((p, index) => {
    // Excel sheet names have a 31 character limit
    const sheetName = `${index + 1}. ${p.project.name || 'Unnamed'}`.substring(0, 31);
    
    // Combine assessments and deficiencies for this project
    const projectData = [
      { "Type": "Project Info", "Field": "Name", "Value": p.project.name || "" },
      { "Type": "Project Info", "Field": "Status", "Value": p.project.status || "" },
      { "Type": "Project Info", "Field": "Client", "Value": p.project.clientName || "" },
      { "Type": "Project Info", "Field": "Address", "Value": p.project.address || "" },
      { "Type": "Project Info", "Field": "Property Type", "Value": p.project.propertyType || "" },
      { "Type": "", "Field": "", "Value": "" }, // Empty row
      { "Type": "Summary", "Field": "Total Assessments", "Value": p.assessments.length.toString() },
      { "Type": "Summary", "Field": "Total Deficiencies", "Value": p.deficiencies.length.toString() },
    ];

    const projectSheet = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(workbook, projectSheet, sheetName);

    // Add assessments sheet if there are any
    if (p.assessments.length > 0) {
      const assessmentsData = p.assessments.map(a => ({
        "Component Code": a.componentCode || "",
        "Component Name": a.componentName || "",
        "Location": a.componentLocation || "",
        "Condition": a.condition || "",
        "Status": a.status || "",
        "Condition %": a.conditionPercentage || "",
        "Observations": a.observations || "",
        "Estimated Repair Cost": a.estimatedRepairCost || "",
        "Replacement Value": a.replacementValue || "",
      }));
      const assessmentsSheet = XLSX.utils.json_to_sheet(assessmentsData);
      const assessSheetName = `${index + 1}. Assessments`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, assessmentsSheet, assessSheetName);
    }

    // Add deficiencies sheet if there are any
    if (p.deficiencies.length > 0) {
      const deficienciesData = p.deficiencies.map(d => ({
        "Component Code": d.componentCode || "",
        "Title": d.title || "",
        "Description": d.description || "",
        "Severity": d.severity || "",
        "Priority": d.priority || "",
        "Location": d.location || "",
        "Estimated Cost": d.estimatedCost || "",
        "Recommended Action": d.recommendedAction || "",
      }));
      const deficienciesSheet = XLSX.utils.json_to_sheet(deficienciesData);
      const defSheetName = `${index + 1}. Deficiencies`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, deficienciesSheet, defSheetName);
    }
  });

  // Convert to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
