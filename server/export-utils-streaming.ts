import ExcelJS from 'exceljs';
import { Writable, PassThrough } from 'stream';

/**
 * Streaming Excel Export Utilities
 * 
 * Uses ExcelJS streaming workbook writer for memory-efficient exports.
 * Instead of building the entire workbook in memory, data is written
 * row-by-row and streamed directly to the output buffer.
 * 
 * Memory savings: Proportional to export size - only one row in memory at a time
 * vs entire dataset with the standard xlsx library.
 */

interface AssessmentData {
  id: number;
  assetId?: number | null;
  componentCode?: string | null;
  componentName?: string | null;
  componentLocation?: string | null;
  condition?: string | null;
  status?: string | null;
  conditionPercentage?: number | null;
  observations?: string | null;
  recommendations?: string | null;
  remainingUsefulLife?: number | null;
  expectedUsefulLife?: number | null;
  reviewYear?: number | null;
  lastTimeAction?: number | null;
  estimatedRepairCost?: number | null;
  replacementValue?: number | null;
  actionYear?: number | null;
  conditionScore?: number | null;
  ciScore?: number | null;
  fciScore?: number | null;
  assessedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

interface DeficiencyData {
  id: number;
  assessmentId?: number | null;
  componentCode?: string | null;
  title?: string | null;
  description?: string | null;
  severity?: string | null;
  priority?: string | null;
  location?: string | null;
  estimatedCost?: number | null;
  recommendedAction?: string | null;
  timeline?: string | null;
  createdAt?: Date | string | null;
}

interface ProjectData {
  id?: number;
  name?: string | null;
  status?: string | null;
  clientName?: string | null;
  address?: string | null;
  propertyType?: string | null;
  createdAt?: Date | string | null;
}

/**
 * Convert assessments and deficiencies to Excel format using streaming
 * Returns a buffer that can be sent as a file download
 */
export async function dataToExcelStreaming(data: {
  projectName: string;
  assessments: AssessmentData[];
  deficiencies: DeficiencyData[];
}): Promise<Buffer> {
  // Create a PassThrough stream to collect the output
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  
  stream.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  
  // Create streaming workbook
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
    useSharedStrings: false, // Disable for better streaming performance
  });
  
  // Create assessments sheet
  const assessmentsSheet = workbook.addWorksheet('Assessments');
  
  // Add headers
  assessmentsSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Asset ID', key: 'assetId', width: 12 },
    { header: 'Component Code', key: 'componentCode', width: 15 },
    { header: 'Component Name', key: 'componentName', width: 25 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Condition', key: 'condition', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Condition %', key: 'conditionPercentage', width: 12 },
    { header: 'Observations', key: 'observations', width: 40 },
    { header: 'Recommendations', key: 'recommendations', width: 40 },
    { header: 'RUL (years)', key: 'remainingUsefulLife', width: 12 },
    { header: 'EUL (years)', key: 'expectedUsefulLife', width: 12 },
    { header: 'Review Year', key: 'reviewYear', width: 12 },
    { header: 'Last Action Year', key: 'lastTimeAction', width: 15 },
    { header: 'Repair Cost', key: 'estimatedRepairCost', width: 15 },
    { header: 'Replacement Value', key: 'replacementValue', width: 18 },
    { header: 'Action Year', key: 'actionYear', width: 12 },
    { header: 'Condition Score', key: 'conditionScore', width: 15 },
    { header: 'CI Score', key: 'ciScore', width: 12 },
    { header: 'FCI Score', key: 'fciScore', width: 12 },
    { header: 'Assessed At', key: 'assessedAt', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 20 },
  ];
  
  // Stream assessments row by row
  for (const a of data.assessments) {
    assessmentsSheet.addRow({
      id: a.id,
      assetId: a.assetId || '',
      componentCode: a.componentCode || '',
      componentName: a.componentName || '',
      location: a.componentLocation || '',
      condition: a.condition || '',
      status: a.status || '',
      conditionPercentage: a.conditionPercentage || '',
      observations: a.observations || '',
      recommendations: a.recommendations || '',
      remainingUsefulLife: a.remainingUsefulLife || '',
      expectedUsefulLife: a.expectedUsefulLife || '',
      reviewYear: a.reviewYear || '',
      lastTimeAction: a.lastTimeAction || '',
      estimatedRepairCost: a.estimatedRepairCost || '',
      replacementValue: a.replacementValue || '',
      actionYear: a.actionYear || '',
      conditionScore: a.conditionScore || '',
      ciScore: a.ciScore || '',
      fciScore: a.fciScore || '',
      assessedAt: a.assessedAt ? new Date(a.assessedAt).toISOString() : '',
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
    }).commit();
  }
  
  // Commit the assessments sheet
  await assessmentsSheet.commit();
  
  // Create deficiencies sheet
  const deficienciesSheet = workbook.addWorksheet('Deficiencies');
  
  deficienciesSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Assessment ID', key: 'assessmentId', width: 15 },
    { header: 'Component Code', key: 'componentCode', width: 15 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Estimated Cost', key: 'estimatedCost', width: 15 },
    { header: 'Recommended Action', key: 'recommendedAction', width: 40 },
    { header: 'Timeline', key: 'timeline', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 20 },
  ];
  
  // Stream deficiencies row by row
  for (const d of data.deficiencies) {
    deficienciesSheet.addRow({
      id: d.id,
      assessmentId: d.assessmentId || '',
      componentCode: d.componentCode || '',
      description: d.description || '',
      severity: d.severity || '',
      priority: d.priority || '',
      location: d.location || '',
      estimatedCost: d.estimatedCost || '',
      recommendedAction: d.recommendedAction || '',
      timeline: d.timeline || '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
    }).commit();
  }
  
  await deficienciesSheet.commit();
  
  // Finalize workbook - this will automatically end the stream
  await workbook.commit();
  
  return Buffer.concat(chunks);
}

/**
 * Convert multiple projects to a single Excel workbook using streaming
 * Each project gets its own sheet with assessments and deficiencies
 */
export async function bulkProjectsToExcelStreaming(projects: Array<{
  project: ProjectData;
  assessments: AssessmentData[];
  deficiencies: DeficiencyData[];
}>): Promise<Buffer> {
  // Create a PassThrough stream to collect the output
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  
  stream.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  
  // Create streaming workbook
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
    useSharedStrings: false,
  });
  
  // Create summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Project Name', key: 'name', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Client', key: 'client', width: 25 },
    { header: 'Address', key: 'address', width: 35 },
    { header: 'Assessments', key: 'assessments', width: 12 },
    { header: 'Deficiencies', key: 'deficiencies', width: 12 },
    { header: 'Created', key: 'created', width: 15 },
  ];
  
  // Add summary rows
  projects.forEach((p, index) => {
    summarySheet.addRow({
      num: index + 1,
      name: p.project.name || '',
      status: p.project.status || '',
      client: p.project.clientName || '',
      address: p.project.address || '',
      assessments: p.assessments.length,
      deficiencies: p.deficiencies.length,
      created: p.project.createdAt ? new Date(p.project.createdAt).toISOString().split('T')[0] : '',
    }).commit();
  });
  
  await summarySheet.commit();
  
  // Create sheets for each project
  for (let index = 0; index < projects.length; index++) {
    const p = projects[index];
    // Excel sheet names have a 31 character limit
    const baseSheetName = `${index + 1}. ${p.project.name || 'Unnamed'}`.substring(0, 31);
    
    // Project info sheet
    const projectSheet = workbook.addWorksheet(baseSheetName);
    projectSheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 40 },
    ];
    
    const projectInfo = [
      { type: 'Project Info', field: 'Name', value: p.project.name || '' },
      { type: 'Project Info', field: 'Status', value: p.project.status || '' },
      { type: 'Project Info', field: 'Client', value: p.project.clientName || '' },
      { type: 'Project Info', field: 'Address', value: p.project.address || '' },
      { type: 'Project Info', field: 'Property Type', value: p.project.propertyType || '' },
      { type: '', field: '', value: '' },
      { type: 'Summary', field: 'Total Assessments', value: p.assessments.length.toString() },
      { type: 'Summary', field: 'Total Deficiencies', value: p.deficiencies.length.toString() },
    ];
    
    for (const row of projectInfo) {
      projectSheet.addRow(row).commit();
    }
    await projectSheet.commit();
    
    // Assessments sheet if there are any
    if (p.assessments.length > 0) {
      const assessSheetName = `${index + 1}. Assessments`.substring(0, 31);
      const assessmentsSheet = workbook.addWorksheet(assessSheetName);
      
      assessmentsSheet.columns = [
        { header: 'Component Code', key: 'componentCode', width: 15 },
        { header: 'Component Name', key: 'componentName', width: 25 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Condition', key: 'condition', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Condition %', key: 'conditionPercentage', width: 12 },
        { header: 'Observations', key: 'observations', width: 40 },
        { header: 'Repair Cost', key: 'estimatedRepairCost', width: 15 },
        { header: 'Replacement Value', key: 'replacementValue', width: 18 },
      ];
      
      for (const a of p.assessments) {
        assessmentsSheet.addRow({
          componentCode: a.componentCode || '',
          componentName: a.componentName || '',
          location: a.componentLocation || '',
          condition: a.condition || '',
          status: a.status || '',
          conditionPercentage: a.conditionPercentage || '',
          observations: a.observations || '',
          estimatedRepairCost: a.estimatedRepairCost || '',
          replacementValue: a.replacementValue || '',
        }).commit();
      }
      await assessmentsSheet.commit();
    }
    
    // Deficiencies sheet if there are any
    if (p.deficiencies.length > 0) {
      const defSheetName = `${index + 1}. Deficiencies`.substring(0, 31);
      const deficienciesSheet = workbook.addWorksheet(defSheetName);
      
      deficienciesSheet.columns = [
        { header: 'Component Code', key: 'componentCode', width: 15 },
        { header: 'Title', key: 'title', width: 25 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Severity', key: 'severity', width: 12 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Estimated Cost', key: 'estimatedCost', width: 15 },
        { header: 'Recommended Action', key: 'recommendedAction', width: 40 },
      ];
      
      for (const d of p.deficiencies) {
        deficienciesSheet.addRow({
          componentCode: d.componentCode || '',
          title: d.title || '',
          description: d.description || '',
          severity: d.severity || '',
          priority: d.priority || '',
          location: d.location || '',
          estimatedCost: d.estimatedCost || '',
          recommendedAction: d.recommendedAction || '',
        }).commit();
      }
      await deficienciesSheet.commit();
    }
  }
  
  // Finalize workbook - this will automatically end the stream
  await workbook.commit();
  
  return Buffer.concat(chunks);
}
