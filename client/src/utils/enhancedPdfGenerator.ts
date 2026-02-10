/**
 * Enhanced BCA Report PDF Generator
 * 
 * Generates professional PDF documents matching ASTM E2018 standards with:
 * - Table of Contents with page numbers
 * - Introduction with work scope and objectives
 * - ASTM E2018 Standard explanation
 * - Observations and Recommendations
 * - Component Action Types, Priorities, Conditions reference tables
 * - FCI explanation with formula and rating scale
 * - Limitations and Disclosure statement
 * - Dashboard with visual charts
 * - Component photos (deduplicated)
 * - B3NMA branding
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// TYPES
// ============================================

export interface ComponentPhotoData {
  id: number;
  url: string;
  caption: string | null;
  takenAt: string | null;
  componentCode: string;
  assetName: string;
}

export interface EnhancedComponentData {
  id: number;
  assetId: number;
  assetName: string;
  assetAddress: string;
  uniformatCode: string;
  uniformatLevel1: string;
  uniformatLevel2: string | null;
  uniformatLevel3: string | null;
  uniformatGroup: string;
  componentName: string;
  componentLocation: string | null;
  condition: string;
  conditionPercentage: number | null;
  estimatedServiceLife: number | null;
  remainingUsefulLife: number | null;
  reviewYear: number | null;
  lastTimeAction: number | null;
  repairCost: number | null;
  replacementCost: number | null;
  totalCost: number | null;
  actionType: string;
  actionYear: number | null;
  actionDescription: string | null;
  priority: string;
  assessmentDate: string;
  assessorName: string | null;
  observations: string | null;
  recommendations: string | null;
  photos: ComponentPhotoData[];
}

export interface ActionListItem {
  id: number;
  itemId: string;
  actionName: string;
  actionType: string;
  actionYear: number | null;
  actionCost: number | null;
  assetName: string;
  assetId: number;
  uniformatCode: string;
  uniformatGroup: string;
  priority: string;
  description: string | null;
}

export interface UniformatGroupSummary {
  groupCode: string;
  groupName: string;
  componentCount: number;
  totalRepairCost: number;
  totalReplacementCost: number;
  avgConditionPercentage: number;
  conditionDistribution: {
    good: number;
    fair: number;
    poor: number;
    failed: number;
  };
}

export interface EnhancedReportConfig {
  reportTitle: string;
  preparedBy: string;
  preparedFor: string;
  reportDate: string;
  projectName: string;
  clientName: string;
  clientAddress: string;
  
  includeExecutiveSummary: boolean;
  includeAssetOverview: boolean;
  includeComponentAssessments: boolean;
  includeActionList: boolean;
  includeCapitalForecast: boolean;
  includePriorityMatrix: boolean;
  includeUniformatBreakdown: boolean;
  includePhotoAppendix: boolean;
  
  componentGrouping: 'building_uniformat' | 'uniformat_building' | 'building_only' | 'uniformat_only';
  displayLevel: 'L2' | 'L3' | 'both';
  includePhotos: boolean;
  maxPhotosPerComponent: number;
  showCostFields: boolean;
  showActionDetails: boolean;
  includeRollups: boolean;
  
  actionYearHorizon: number;
}

export interface EnhancedReportData {
  config: EnhancedReportConfig;
  summary: {
    totalAssets: number;
    totalCurrentReplacementValue: number;
    totalDeferredMaintenanceCost: number;
    portfolioFCI: number;
    portfolioFCIRating: string;
    averageConditionScore: number;
    averageConditionRating: string;
    totalDeficiencies: number;
    totalAssessments: number;
    fundingGap: number;
    averageAssetAge: number;
  };
  assetMetrics: Array<{
    assetId: number;
    assetName: string;
    address?: string;
    yearBuilt?: number;
    grossFloorArea?: number;
    currentReplacementValue: number;
    deferredMaintenanceCost: number;
    fci: number;
    fciRating: string;
    conditionScore: number;
    conditionRating: string;
    assessmentCount: number;
    deficiencyCount: number;
    immediateNeeds: number;
    shortTermNeeds: number;
    mediumTermNeeds: number;
    longTermNeeds: number;
    averageRemainingLife: number;
    priorityScore: number;
  }>;
  components: EnhancedComponentData[];
  actionList: ActionListItem[];
  uniformatSummary: UniformatGroupSummary[];
  capitalForecast: Array<{
    year: number;
    immediateNeeds: number;
    shortTermNeeds: number;
    mediumTermNeeds: number;
    longTermNeeds: number;
    totalProjectedCost: number;
    cumulativeCost: number;
  }>;
  priorityMatrix: Array<{
    priority: string;
    count: number;
    totalCost: number;
    percentageOfTotal: number;
  }>;
}

// ============================================
// CONSTANTS & HELPERS
// ============================================

const colors = {
  primary: [26, 86, 219] as [number, number, number],
  primaryDark: [15, 55, 150] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  mediumGray: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  lightBlue: [219, 234, 254] as [number, number, number],
  lightGreen: [220, 252, 231] as [number, number, number],
  lightOrange: [255, 237, 213] as [number, number, number],
  lightRed: [254, 226, 226] as [number, number, number],
};

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount);
};

const formatPercentage = (value: number | null, decimals: number = 1): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)}%`;
};

const getConditionColor = (condition: string): [number, number, number] => {
  switch (condition?.toLowerCase()) {
    case 'good': return colors.success;
    case 'fair': return colors.warning;
    case 'poor': return colors.orange;
    case 'failed': case 'critical': return colors.danger;
    default: return colors.secondary;
  }
};

const getFCIColor = (fci: number): [number, number, number] => {
  if (fci <= 5) return colors.success;
  if (fci <= 10) return colors.warning;
  if (fci <= 30) return colors.orange;
  return colors.danger;
};

const stripHtmlTags = (text: string | null): string | null => {
  if (!text) return text;
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
};

const capitalize = (s: string): string => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/** Map any priority value to BCA standard terminology */
const getPriorityLabel = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'critical': case 'immediate': return 'Critical';
    case 'necessary': case 'high': case 'short_term': return 'Necessary';
    case 'recommended': case 'medium': case 'medium_term': return 'Recommended';
    case 'no_action': case 'low': case 'routine': case 'long_term': return 'Routine';
    default: return capitalize(priority) || 'N/A';
  }
};

/** Format action type: replace underscores with spaces and title-case */
const formatActionType = (actionType: string): string => {
  if (!actionType) return 'N/A';
  return actionType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const UNIFORMAT_GROUPS: Record<string, string> = {
  'A': 'SUBSTRUCTURE',
  'B': 'SHELL',
  'C': 'INTERIORS',
  'D': 'SERVICES',
  'E': 'EQUIPMENT & FURNISHINGS',
  'F': 'SPECIAL CONSTRUCTION',
  'G': 'BUILDING SITEWORK',
};

// ============================================
// PHOTO LOADING WITH DEDUPLICATION
// ============================================

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load image:', url, error);
    return null;
  }
}

async function preloadPhotos(
  components: EnhancedComponentData[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<number, string[]>> {
  const photoMap = new Map<number, string[]>();
  const seenUrls = new Set<string>();
  const allPhotos: Array<{ componentId: number; url: string }> = [];
  
  for (const component of components) {
    for (const photo of component.photos) {
      if (seenUrls.has(photo.url)) continue;
      seenUrls.add(photo.url);
      allPhotos.push({ componentId: component.id, url: photo.url });
    }
  }
  
  let loaded = 0;
  const total = allPhotos.length;
  
  const loadPromises = allPhotos.map(async ({ componentId, url }) => {
    const base64 = await loadImageAsBase64(url);
    loaded++;
    onProgress?.(loaded, total);
    if (base64) {
      const existing = photoMap.get(componentId) || [];
      existing.push(base64);
      photoMap.set(componentId, existing);
    }
  });
  
  await Promise.all(loadPromises);
  return photoMap;
}

// ============================================
// MAIN PDF GENERATOR
// ============================================

export async function generateEnhancedPDF(
  data: EnhancedReportData,
  onProgress?: (stage: string, progress: number) => void
): Promise<void> {
  const { config } = data;
  
  onProgress?.('Initializing PDF...', 0);
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;
  let currentPage = 1;
  
  // TOC tracking
  const tocEntries: Array<{ title: string; pageNumber: number; level: number }> = [];
  const addTocEntry = (title: string, level: number = 1) => {
    tocEntries.push({ title, pageNumber: currentPage, level });
  };

  // Pre-load photos
  let photoMap = new Map<number, string[]>();
  if (config.includePhotos && config.includeComponentAssessments) {
    onProgress?.('Loading photos...', 10);
    photoMap = await preloadPhotos(data.components, (loaded, total) => {
      onProgress?.(`Loading photos (${loaded}/${total})...`, 10 + (loaded / total) * 20);
    });
  }
  
  onProgress?.('Generating PDF pages...', 30);

  const isSingleAsset = data.summary.totalAssets === 1;
  const assetLabel = isSingleAsset ? (data.assetMetrics[0]?.assetName || 'the asset') : `the portfolio of ${data.summary.totalAssets} assets`;

  // ---- Helpers ----
  const checkPageBreak = (requiredSpace: number): void => {
    if (yPos + requiredSpace > pageHeight - margin - 10) {
      doc.addPage();
      currentPage++;
      yPos = margin;
      addHeader();
    }
  };

  const addHeader = (): void => {
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BUILDING CONDITION ASSESSMENT REPORT', margin, 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(config.projectName, pageWidth - margin, 8, { align: 'right' });
    yPos = 18;
  };

  const addFooter = (): void => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...colors.secondary);
      doc.text('B3NMA - Building Condition Assessment System', margin, pageHeight - 6);
      doc.text('Confidential', pageWidth / 2, pageHeight - 6, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }
  };

  const addSectionTitle = (title: string, level: number = 1): void => {
    checkPageBreak(15);
    if (level === 1) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(title, margin, yPos);
      yPos += 8;
      // Underline
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos - 3, margin + contentWidth, yPos - 3);
      yPos += 2;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primaryDark);
      doc.text(title, margin, yPos);
      yPos += 6;
    }
  };

  const addParagraph = (text: string): void => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, margin, yPos);
      yPos += 4;
    }
    yPos += 2;
  };

  const addBoldLabel = (label: string, value: string): void => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + doc.getTextWidth(label), yPos);
    yPos += 5;
  };

  // ============================================
  // 1. COVER PAGE
  // ============================================
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 85, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Building Condition', pageWidth / 2, 35, { align: 'center' });
  doc.text('Assessment Report', pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(config.reportTitle || config.projectName, pageWidth / 2, 68, { align: 'center' });

  // Report details box
  yPos = 100;
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(margin, yPos, contentWidth, 70, 3, 3, 'F');
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 70, 3, 3, 'S');
  
  doc.setTextColor(...colors.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Information', margin + 5, yPos + 10);
  
  doc.setFontSize(9);
  doc.setTextColor(...colors.text);
  const reportDate = config.reportDate
    ? new Date(config.reportDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const coverDetails = [
    ['Prepared For:', config.preparedFor || config.clientName || 'N/A'],
    ['Prepared By:', config.preparedBy || 'B3NMA'],
    ['Property Address:', config.clientAddress || 'N/A'],
    ['Report Date:', reportDate],
    [isSingleAsset ? 'Building:' : 'Total Assets:', isSingleAsset ? (data.assetMetrics[0]?.assetName || '1') : data.summary.totalAssets.toString()],
    ['Standard:', 'ASTM E2018 - Property Condition Assessment'],
  ];
  
  let detailY = yPos + 20;
  for (const [label, value] of coverDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 8, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(value.substring(0, 55), margin + 48, detailY);
    detailY += 8;
  }

  // Key metrics boxes on cover
  yPos = 185;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Key Findings', margin, yPos);
  yPos += 8;

  const metricBoxWidth = (contentWidth - 10) / 3;
  const metricBoxHeight = 28;
  const fciValue = data.summary.portfolioFCI;
  const coverMetrics = [
    { label: 'Facility Condition Index', value: formatPercentage(fciValue, 2), color: getFCIColor(fciValue) },
    { label: 'Condition Rating', value: data.summary.portfolioFCIRating, color: undefined },
    { label: 'Current Replacement Value', value: formatCurrency(data.summary.totalCurrentReplacementValue), color: undefined },
    { label: 'Deferred Maintenance', value: formatCurrency(data.summary.totalDeferredMaintenanceCost), color: colors.danger },
    { label: 'Components Assessed', value: data.summary.totalAssessments.toString(), color: undefined },
    { label: 'Funding Gap', value: formatCurrency(data.summary.fundingGap), color: colors.orange },
  ];

  coverMetrics.forEach((metric, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = margin + (col * (metricBoxWidth + 5));
    const y = yPos + (row * (metricBoxHeight + 5));
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(x, y, metricBoxWidth, metricBoxHeight, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...colors.secondary);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x + 3, y + 8);
    doc.setFontSize(14);
    doc.setTextColor(...(metric.color || colors.text));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x + 3, y + 21);
  });

  // ============================================
  // 2. TABLE OF CONTENTS (placeholder - filled after all pages)
  // ============================================
  doc.addPage();
  currentPage++;
  const tocPageNumber = currentPage;
  addHeader();

  // ============================================
  // 3. INTRODUCTION
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Introduction', 1);
  addTocEntry('Introduction');

  addBoldLabel('Work Scope: ', 'Building Condition Assessment (BCA)');
  yPos += 2;

  addParagraph(`B3NMA was retained to conduct a Building Condition Assessment (BCA) of ${assetLabel}, located at ${config.clientAddress || 'the subject property'}. The assessment was performed in accordance with ASTM E2018 - Standard Guide for Property Condition Assessments: Baseline Property Condition Assessment Process.`);

  addBoldLabel('Objective: ', '');
  addParagraph('The objective of this assessment is to provide a comprehensive evaluation of the physical condition of the building systems and components, identify deficiencies and deferred maintenance items, estimate remediation costs, and develop a prioritized capital renewal plan to support informed decision-making for facility management and capital planning.');

  addSectionTitle('Scope of Work', 2);
  const scopeItems = [
    'Visual, non-invasive walk-through survey of all accessible building areas and systems',
    'Assessment of building components organized per UNIFORMAT II classification (ASTM E1557)',
    'Documentation of observed conditions, deficiencies, and maintenance concerns',
    'Assignment of condition ratings based on industry-standard criteria',
    'Estimation of remaining useful life for each assessed component',
    'Development of order-of-magnitude cost estimates for identified deficiencies',
    'Prioritization of recommended actions based on urgency and risk',
    'Preparation of a multi-year capital renewal forecast',
  ];
  for (const item of scopeItems) {
    checkPageBreak(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text('\u2022', margin + 2, yPos);
    const lines = doc.splitTextToSize(item, contentWidth - 10);
    doc.text(lines, margin + 8, yPos);
    yPos += lines.length * 4 + 1;
  }
  yPos += 4;

  // Building Description table
  if (data.assetMetrics.length > 0) {
    addSectionTitle('Building Description', 2);
    const asset = data.assetMetrics[0];
    const buildingInfo = [
      ['Building Name', asset.assetName],
      ['Address', asset.address || config.clientAddress || 'N/A'],
      ['Year Built', asset.yearBuilt?.toString() || 'N/A'],
      ['Gross Floor Area', asset.grossFloorArea ? `${asset.grossFloorArea.toLocaleString()} sq ft` : 'N/A'],
      ['Current Replacement Value', formatCurrency(asset.currentReplacementValue)],
      ['Components Assessed', asset.assessmentCount.toString()],
    ];
    autoTable(doc, {
      startY: yPos,
      body: buildingInfo,
      theme: 'plain',
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', textColor: colors.secondary },
        1: { cellWidth: contentWidth - 55 }
      },
      margin: { left: margin, right: margin },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 40;
  }

  // ============================================
  // 4. ASTM E2018 STANDARD
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('ASTM E2018 Standard Guide', 1);
  addTocEntry('ASTM E2018 Standard Guide');

  addSectionTitle('Purpose of ASTM E2018', 2);
  addParagraph('ASTM E2018 - Standard Guide for Property Condition Assessments: Baseline Property Condition Assessment Process provides a standardized framework for evaluating the physical condition of commercial real estate and institutional properties. The standard establishes consistent methodology for documenting building conditions, identifying deficiencies, and estimating costs for remediation.');

  addSectionTitle('Assessment Levels', 2);
  const assessmentLevels = [
    ['Level 0', 'Desktop Review', 'Review of available documentation, maintenance records, and historical data without a physical site visit.'],
    ['Level 1', 'Walk-Through Survey', 'Visual observation of accessible building systems and components during a physical site visit. Non-invasive assessment.'],
    ['Level 2', 'Detailed Assessment', 'In-depth evaluation including measurements, testing, and detailed documentation of specific systems or components.'],
    ['Level 3', 'Comprehensive Investigation', 'Invasive investigation including destructive testing, laboratory analysis, and specialized engineering assessments.'],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Level', 'Type', 'Description']],
    body: assessmentLevels,
    theme: 'striped',
    headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: contentWidth - 53 }
    },
    margin: { left: margin, right: margin },
  });
  yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 60;

  addSectionTitle('UNIFORMAT II Classification System', 2);
  addParagraph('Building components are organized using the UNIFORMAT II classification system (ASTM E1557), which provides a hierarchical structure for categorizing building elements:');
  const uniformatCategories = [
    ['A', 'SUBSTRUCTURE', 'Foundations, basement construction, slab on grade'],
    ['B', 'SHELL', 'Superstructure, exterior enclosure, roofing'],
    ['C', 'INTERIORS', 'Interior construction, stairs, interior finishes'],
    ['D', 'SERVICES', 'Conveying systems, plumbing, HVAC, fire protection, electrical'],
    ['E', 'EQUIPMENT & FURNISHINGS', 'Equipment, furnishings, special construction'],
    ['F', 'SPECIAL CONSTRUCTION', 'Special structures, building demolition'],
    ['G', 'BUILDING SITEWORK', 'Site preparation, improvements, utilities'],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Code', 'Category', 'Includes']],
    body: uniformatCategories,
    theme: 'striped',
    headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 45, fontStyle: 'bold' },
      2: { cellWidth: contentWidth - 60 }
    },
    margin: { left: margin, right: margin },
  });
  yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 60;

  // ============================================
  // 5. COMPONENT ACTION TYPES
  // ============================================
  checkPageBreak(80);
  if (yPos > pageHeight - 100) {
    doc.addPage();
    currentPage++;
    addHeader();
  }
  addSectionTitle('Component Action Types', 1);
  addTocEntry('Component Action Types');

  addParagraph('Each assessed component is assigned a recommended action type based on its current condition, remaining useful life, and criticality:');

  const actionTypes = [
    ['Replace', 'The component has reached or exceeded its useful life and requires full replacement.'],
    ['Repair', 'The component exhibits deficiencies that can be corrected through targeted repair work.'],
    ['Maintain', 'The component is in serviceable condition but requires ongoing preventive maintenance.'],
    ['Monitor', 'The component is currently performing adequately but shows early signs of deterioration.'],
    ['No Action', 'The component is in good condition with no deficiencies observed.'],
    ['Capital Renewal', 'The component requires planned capital investment for major renewal or upgrade.'],
    ['Preventive Maintenance', 'Scheduled preventive maintenance activities are recommended to extend useful life.'],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Action Type', 'Description']],
    body: actionTypes,
    theme: 'striped',
    headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: contentWidth - 35 }
    },
    margin: { left: margin, right: margin },
  });
  yPos = (doc as any).lastAutoTable?.finalY + 8 || yPos + 60;

  // ============================================
  // 6. COMPONENT PRIORITIES
  // ============================================
  checkPageBreak(80);
  if (yPos > pageHeight - 80) {
    doc.addPage();
    currentPage++;
    addHeader();
  }
  addSectionTitle('Component Priority Levels', 1);
  addTocEntry('Component Priority Levels');

  addParagraph('Components requiring action are assigned a priority level to support capital planning and budget allocation:');

  const priorityLevels = [
    ['Critical', '0-1 Year', 'Immediate action required. Includes life safety hazards, code violations, active water infiltration, structural concerns, or conditions that pose imminent risk of failure.', colors.danger],
    ['Necessary', '1-5 Years', 'Action required in the near term. Components are deteriorating and will reach failure if not addressed. Deferral may result in increased repair costs.', colors.orange],
    ['Recommended', '6-10 Years', 'Action recommended to maintain building condition. Components are functional but approaching the end of their expected service life.', colors.warning],
    ['Routine', 'N/A', 'Component is in satisfactory condition. No corrective action is required. Routine maintenance should continue as scheduled.', colors.success],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Priority', 'Timeframe', 'Description']],
    body: priorityLevels.map(([p, t, d]) => [p as string, t as string, d as string]),
    theme: 'striped',
    headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: contentWidth - 47 }
    },
    margin: { left: margin, right: margin },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const rowIdx = hookData.row.index;
        if (rowIdx < priorityLevels.length) {
          hookData.cell.styles.textColor = priorityLevels[rowIdx][3] as any;
        }
      }
    },
  });
  yPos = (doc as any).lastAutoTable?.finalY + 8 || yPos + 60;

  // ============================================
  // 7. COMPONENT CONDITIONS
  // ============================================
  checkPageBreak(80);
  if (yPos > pageHeight - 80) {
    doc.addPage();
    currentPage++;
    addHeader();
  }
  addSectionTitle('Component Condition Ratings', 1);
  addTocEntry('Component Condition Ratings');

  addParagraph('Each building component is assigned a condition rating based on visual observation during the site assessment:');

  const conditionRatings = [
    ['Good', '70 - 100%', 'The component is performing as intended with only minor wear. Routine maintenance is sufficient.', colors.success],
    ['Fair', '40 - 69%', 'The component shows moderate deterioration. Repair or renewal should be planned within the medium term.', colors.warning],
    ['Poor', '10 - 39%', 'The component exhibits significant deterioration. Near-term intervention is required.', colors.orange],
    ['Failed / Critical', '0 - 9%', 'The component has reached or exceeded its useful life. Immediate replacement or major repair is required.', colors.danger],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Condition', 'Score Range', 'Description']],
    body: conditionRatings.map(([c, r, d]) => [c as string, r as string, d as string]),
    theme: 'striped',
    headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: contentWidth - 50 }
    },
    margin: { left: margin, right: margin },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const rowIdx = hookData.row.index;
        if (rowIdx < conditionRatings.length) {
          hookData.cell.styles.textColor = conditionRatings[rowIdx][3] as any;
        }
      }
    },
  });
  yPos = (doc as any).lastAutoTable?.finalY + 8 || yPos + 60;

  // ============================================
  // 8. FACILITY CONDITION INDEX (FCI)
  // ============================================
  checkPageBreak(80);
  if (yPos > pageHeight - 80) {
    doc.addPage();
    currentPage++;
    addHeader();
  }
  addSectionTitle('Facility Condition Index (FCI)', 1);
  addTocEntry('Facility Condition Index (FCI)');

  addParagraph('The Facility Condition Index (FCI) is a widely recognized industry metric used to quantify the overall condition of a building or portfolio. It provides a standardized, objective measure that enables comparison across assets and supports data-driven capital planning decisions.');

  addSectionTitle('FCI Formula', 2);
  // Formula box
  checkPageBreak(20);
  doc.setFillColor(...colors.lightBlue);
  doc.roundedRect(margin + 20, yPos, contentWidth - 40, 14, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('FCI = Deferred Maintenance Cost (DMC) / Current Replacement Value (CRV)', pageWidth / 2, yPos + 9, { align: 'center' });
  yPos += 20;

  addParagraph('Deferred Maintenance Cost (DMC) represents the total estimated cost of all identified deficiencies and required remediation work. Current Replacement Value (CRV) represents the estimated cost to replace the entire building with a new facility of equivalent size and function at current market prices.');

  addSectionTitle('FCI Rating Scale', 2);
  const fciScale = [
    ['Good', '0% - 5%', 'The facility is in good overall condition with minimal deferred maintenance.', colors.success],
    ['Fair', '5% - 10%', 'The facility shows moderate deferred maintenance requiring planned investment.', colors.warning],
    ['Poor', '10% - 30%', 'The facility has significant deferred maintenance requiring substantial capital investment.', colors.orange],
    ['Critical', '> 30%', 'The facility has critical deferred maintenance. Major renovation or replacement should be considered.', colors.danger],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Rating', 'FCI Range', 'Description']],
    body: fciScale.map(([r, range, d]) => [r as string, range as string, d as string]),
    theme: 'striped',
    headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: contentWidth - 42 }
    },
    margin: { left: margin, right: margin },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const rowIdx = hookData.row.index;
        if (rowIdx < fciScale.length) {
          hookData.cell.styles.textColor = fciScale[rowIdx][3] as any;
        }
      }
    },
  });
  yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 40;

  // Show this asset's FCI
  checkPageBreak(15);
  addParagraph(`For this ${isSingleAsset ? 'building' : 'portfolio'}, the calculated FCI is ${formatPercentage(fciValue, 2)}, corresponding to a "${data.summary.portfolioFCIRating}" rating. The total CRV is ${formatCurrency(data.summary.totalCurrentReplacementValue)} and the total DMC is ${formatCurrency(data.summary.totalDeferredMaintenanceCost)}.`);

  // ============================================
  // 9. LIMITATIONS AND DISCLOSURE
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Limitations and Disclosure Statement', 1);
  addTocEntry('Limitations and Disclosure');

  addSectionTitle('Limitations', 2);
  const limitations = [
    'This assessment is based on a visual, non-invasive walk-through survey of accessible areas and conditions observable at the time of the site visit. Concealed conditions, latent defects, and areas not accessible during the inspection are excluded.',
    'The assessment does not include environmental assessments, hazardous materials surveys (asbestos, lead paint, mold), seismic evaluations, or structural engineering analysis unless specifically noted.',
    'Cost estimates are order-of-magnitude estimates intended for capital planning purposes only. They are not construction-ready estimates and do not include professional design fees, permits, escalation factors, contingencies, or applicable taxes unless otherwise stated.',
    'Condition ratings and remaining useful life estimates are based on the assessor\'s professional judgment at the time of inspection and may be affected by factors not visible during the assessment.',
    'This report does not constitute a warranty or guarantee regarding the condition of the property or the accuracy of cost estimates.',
    'The assessment was limited to building systems and components. Site infrastructure, environmental conditions, and regulatory compliance are outside the scope.',
  ];
  for (const limitation of limitations) {
    checkPageBreak(15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text('\u2022', margin + 2, yPos);
    const lines = doc.splitTextToSize(limitation, contentWidth - 10);
    doc.text(lines, margin + 8, yPos);
    yPos += lines.length * 4 + 2;
  }
  yPos += 4;

  addSectionTitle('Disclosure', 2);
  addParagraph('This report has been prepared by B3NMA for the exclusive use of the client identified on the cover page. The findings, opinions, and recommendations are based on the information available at the time of the assessment and the professional judgment of the assessor.');
  addParagraph('This report is intended to provide a general overview of the physical condition of the subject property and should not be relied upon as a comprehensive evaluation of all building conditions.');
  addParagraph('Reproduction, distribution, or use of this report by any party other than the intended recipient is not authorized without the prior written consent of B3NMA.');

  addSectionTitle('Assumptions', 2);
  const assumptions = [
    'All building systems were operational at the time of the assessment unless otherwise noted.',
    'Building maintenance has been performed in accordance with standard industry practices.',
    'Cost estimates are based on current market conditions and do not account for future escalation.',
    'Remaining useful life estimates are based on industry-standard life expectancy tables and observed conditions.',
    `The capital forecast covers a ${config.actionYearHorizon || 20}-year planning horizon from the date of assessment.`,
  ];
  for (const assumption of assumptions) {
    checkPageBreak(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text('\u2022', margin + 2, yPos);
    const lines = doc.splitTextToSize(assumption, contentWidth - 10);
    doc.text(lines, margin + 8, yPos);
    yPos += lines.length * 4 + 1;
  }

  // ============================================
  // 10. DASHBOARD
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Assessment Dashboard', 1);
  addTocEntry('Assessment Dashboard');

  onProgress?.('Generating dashboard charts...', 35);

  // Dashboard metrics row
  const dashMetrics = [
    { label: 'FCI', value: formatPercentage(fciValue, 1), sub: data.summary.portfolioFCIRating, color: getFCIColor(fciValue) },
    { label: 'Avg Condition', value: `${data.summary.averageConditionScore}%`, sub: data.summary.averageConditionRating, color: getConditionColor(data.summary.averageConditionRating.toLowerCase()) },
    { label: 'Deferred Maint.', value: formatCurrency(data.summary.totalDeferredMaintenanceCost), sub: '', color: colors.danger },
    { label: 'CRV', value: formatCurrency(data.summary.totalCurrentReplacementValue), sub: '', color: colors.primary },
  ];

  const dashBoxW = (contentWidth - 9) / 4;
  dashMetrics.forEach((m, i) => {
    const x = margin + i * (dashBoxW + 3);
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(x, yPos, dashBoxW, 22, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...colors.secondary);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label, x + 3, yPos + 7);
    doc.setFontSize(12);
    doc.setTextColor(...m.color);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + 3, yPos + 16);
    if (m.sub) {
      doc.setFontSize(7);
      doc.setTextColor(...colors.secondary);
      doc.setFont('helvetica', 'normal');
      doc.text(m.sub, x + dashBoxW - 3, yPos + 16, { align: 'right' });
    }
  });
  yPos += 28;

  // Condition Distribution
  checkPageBreak(60);
  addSectionTitle('Condition Distribution', 2);
  
  const condCounts = { good: 0, fair: 0, poor: 0, failed: 0 };
  for (const c of data.components) {
    const cond = c.condition?.toLowerCase();
    if (cond === 'good') condCounts.good++;
    else if (cond === 'fair') condCounts.fair++;
    else if (cond === 'poor') condCounts.poor++;
    else condCounts.failed++;
  }
  const totalComps = data.components.length || 1;

  const barY = yPos;
  const barHeight = 14;
  const segments = [
    { label: 'Good', count: condCounts.good, color: colors.success },
    { label: 'Fair', count: condCounts.fair, color: colors.warning },
    { label: 'Poor', count: condCounts.poor, color: colors.orange },
    { label: 'Failed', count: condCounts.failed, color: colors.danger },
  ];

  let barX = margin;
  for (const seg of segments) {
    const segWidth = (seg.count / totalComps) * contentWidth;
    if (segWidth > 0) {
      doc.setFillColor(...seg.color);
      doc.rect(barX, barY, segWidth, barHeight, 'F');
      if (segWidth > 15) {
        doc.setTextColor(...colors.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`${seg.count}`, barX + segWidth / 2, barY + barHeight / 2 + 1, { align: 'center' });
      }
      barX += segWidth;
    }
  }
  yPos = barY + barHeight + 4;

  // Legend
  let legendX = margin;
  for (const seg of segments) {
    doc.setFillColor(...seg.color);
    doc.rect(legendX, yPos, 4, 4, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'normal');
    const pct = ((seg.count / totalComps) * 100).toFixed(1);
    const legendText = `${seg.label}: ${seg.count} (${pct}%)`;
    doc.text(legendText, legendX + 6, yPos + 3.5);
    legendX += doc.getTextWidth(legendText) + 12;
  }
  yPos += 10;

  // Cost by UNIFORMAT Category
  checkPageBreak(70);
  addSectionTitle('Cost by Building System', 2);

  const sortedUniformatSummary = [...data.uniformatSummary]
    .filter(g => 'ABCDEFG'.includes(g.groupCode.charAt(0).toUpperCase()))
    .sort((a, b) => 'ABCDEFG'.indexOf(a.groupCode.charAt(0).toUpperCase()) - 'ABCDEFG'.indexOf(b.groupCode.charAt(0).toUpperCase()));

  if (sortedUniformatSummary.length > 0) {
    const maxCost = Math.max(...sortedUniformatSummary.map(g => g.totalRepairCost + g.totalReplacementCost));
    const chartBarHeight = 10;
    const labelWidth = 55;
    const chartWidth = contentWidth - labelWidth - 25;

    for (const group of sortedUniformatSummary) {
      checkPageBreak(chartBarHeight + 4);
      const totalCost = group.totalRepairCost + group.totalReplacementCost;
      const barWidth2 = maxCost > 0 ? (totalCost / maxCost) * chartWidth : 0;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(`${group.groupCode} - ${group.groupName.substring(0, 20)}`, margin, yPos + chartBarHeight / 2 + 1);
      doc.setFillColor(...colors.primary);
      doc.rect(margin + labelWidth, yPos, barWidth2, chartBarHeight, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(totalCost), margin + labelWidth + barWidth2 + 2, yPos + chartBarHeight / 2 + 1);
      yPos += chartBarHeight + 3;
    }
  }
  yPos += 5;

  // Priority Distribution (merged into BCA categories)
  checkPageBreak(60);
  addSectionTitle('Priority Distribution', 2);

  if (data.priorityMatrix.length > 0) {
    const chartPriorityOrder = ['Critical', 'Necessary', 'Recommended', 'Routine'];
    const chartMerged = new Map<string, { count: number; totalCost: number }>();
    for (const label of chartPriorityOrder) chartMerged.set(label, { count: 0, totalCost: 0 });
    for (const p of data.priorityMatrix) {
      const label = getPriorityLabel(p.priority);
      const existing = chartMerged.get(label) || { count: 0, totalCost: 0 };
      existing.count += p.count;
      existing.totalCost += p.totalCost;
      chartMerged.set(label, existing);
    }
    const mergedChartEntries = chartPriorityOrder
      .filter(label => (chartMerged.get(label)?.count || 0) > 0)
      .map(label => ({ label, ...chartMerged.get(label)! }));

    const maxPriorityCount = Math.max(...mergedChartEntries.map(p => p.count));
    const chartBarHeight2 = 10;
    const labelWidth2 = 40;
    const chartWidth2 = contentWidth - labelWidth2 - 30;

    const priorityLabelColors: Record<string, [number, number, number]> = {
      'Critical': colors.danger,
      'Necessary': colors.orange,
      'Recommended': colors.warning,
      'Routine': colors.secondary,
    };

    for (const p of mergedChartEntries) {
      checkPageBreak(chartBarHeight2 + 4);
      const bw = maxPriorityCount > 0 ? (p.count / maxPriorityCount) * chartWidth2 : 0;
      const barColor = priorityLabelColors[p.label] || colors.primary;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(p.label, margin, yPos + chartBarHeight2 / 2 + 1);
      doc.setFillColor(...barColor);
      doc.rect(margin + labelWidth2, yPos, bw, chartBarHeight2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.count} items (${formatCurrency(p.totalCost)})`, margin + labelWidth2 + bw + 2, yPos + chartBarHeight2 / 2 + 1);
      yPos += chartBarHeight2 + 3;
    }
  }

  // ============================================
  // 11. EXECUTIVE SUMMARY
  // ============================================
  onProgress?.('Generating executive summary...', 40);

  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Executive Summary', 1);
  addTocEntry('Executive Summary');

  addParagraph(`This Building Condition Assessment (BCA) report presents the findings of a visual, non-invasive assessment of ${assetLabel}. The assessment evaluated ${data.summary.totalAssessments} building components organized according to the UNIFORMAT II classification system (ASTM E1557). The Facility Condition Index (FCI) for ${isSingleAsset ? 'this building' : 'the portfolio'} is ${formatPercentage(fciValue, 2)}, indicating a "${data.summary.portfolioFCIRating}" overall condition.`);

  addParagraph(`The total Current Replacement Value (CRV) is ${formatCurrency(data.summary.totalCurrentReplacementValue)}, with a total Deferred Maintenance backlog of ${formatCurrency(data.summary.totalDeferredMaintenanceCost)}, representing a funding gap of ${formatCurrency(data.summary.fundingGap)}.`);

  // Top cost drivers
  const sortedByRepairCost = [...data.components].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));
  const topDrivers = sortedByRepairCost.slice(0, 5).filter(c => (c.totalCost || 0) > 0);
  if (topDrivers.length > 0) {
    checkPageBreak(30);
    addSectionTitle('Top Cost Drivers', 2);
    const driverRows = topDrivers.map((c, i) => [
      String(i + 1), c.uniformatCode, c.componentName.substring(0, 35), capitalize(c.condition), formatCurrency(c.totalCost),
    ]);
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Code', 'Component', 'Condition', 'Estimated Cost']],
      body: driverRows,
      theme: 'striped',
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 18 }, 2: { cellWidth: 65 },
        3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 40;
  }

  // Highest-risk items
  const highPriorityComponents = data.components.filter(c => ['critical', 'high', 'immediate', 'necessary'].includes(c.priority?.toLowerCase()));
  if (highPriorityComponents.length > 0) {
    checkPageBreak(30);
    addSectionTitle('Highest-Risk Items', 2);
    const highRiskCost = highPriorityComponents.reduce((s, c) => s + (c.totalCost || 0), 0);
    addParagraph(`${highPriorityComponents.length} component(s) have been identified as Critical or Necessary priority, representing ${formatCurrency(highRiskCost)} in remediation costs. These items should be addressed within the near term.`);
  }

  checkPageBreak(30);
  addSectionTitle('Key Planning Assumptions', 2);
  addParagraph(`Cost estimates are based on current market conditions and do not include escalation factors, design fees, or contingencies unless otherwise noted. The capital renewal forecast distributes costs based on assigned priority levels: critical items are scheduled immediately, necessary items in years 1-5, and recommended items in years 6-10. All costs are expressed in current Canadian dollars.`);

  // ============================================
  // 12. OBSERVATIONS AND RECOMMENDATIONS
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Observations and Recommendations', 1);
  addTocEntry('Observations and Recommendations');

  addParagraph('The following section provides a summary of key observations and recommendations identified during the building condition assessment.');

  const observationGroups = new Map<string, EnhancedComponentData[]>();
  for (const c of data.components) {
    const obs = stripHtmlTags(c.observations);
    const rec = stripHtmlTags(c.recommendations);
    if (obs || rec) {
      const groupKey = c.uniformatCode.charAt(0);
      if (!observationGroups.has(groupKey)) observationGroups.set(groupKey, []);
      observationGroups.get(groupKey)!.push(c);
    }
  }

  const sortedObsGroups = Array.from(observationGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [groupKey, components] of sortedObsGroups) {
    const groupName = UNIFORMAT_GROUPS[groupKey] || groupKey;
    checkPageBreak(25);
    addSectionTitle(`${groupKey} - ${groupName}`, 2);

    for (const c of components.slice(0, 8)) {
      checkPageBreak(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.text);
      doc.text(`${c.uniformatCode} - ${c.componentName}`, margin + 2, yPos);
      
      const condColor = getConditionColor(c.condition);
      const condText = capitalize(c.condition);
      const condX = margin + contentWidth - 25;
      doc.setFillColor(...condColor);
      doc.roundedRect(condX, yPos - 3.5, 25, 5, 1, 1, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(condText, condX + 12.5, yPos, { align: 'center' });
      yPos += 5;

      const obs = stripHtmlTags(c.observations);
      if (obs) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...colors.secondary);
        doc.text('Observation:', margin + 4, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const obsLines = doc.splitTextToSize(obs, contentWidth - 8);
        for (let i = 0; i < Math.min(obsLines.length, 3); i++) {
          doc.text(obsLines[i], margin + 4, yPos);
          yPos += 3.5;
        }
        if (obsLines.length > 3) {
          doc.setTextColor(...colors.secondary);
          doc.text('(continued in component assessment)', margin + 4, yPos);
          yPos += 3.5;
        }
      }

      const rec = stripHtmlTags(c.recommendations);
      if (rec) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(34, 139, 34);
        doc.text('Recommendation:', margin + 4, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const recLines = doc.splitTextToSize(rec, contentWidth - 8);
        for (let i = 0; i < Math.min(recLines.length, 3); i++) {
          doc.text(recLines[i], margin + 4, yPos);
          yPos += 3.5;
        }
        if (recLines.length > 3) {
          doc.setTextColor(...colors.secondary);
          doc.text('(continued in component assessment)', margin + 4, yPos);
          yPos += 3.5;
        }
      }
      yPos += 3;
    }
  }

  // ============================================
  // 13. ASSET OVERVIEW
  // ============================================
  onProgress?.('Generating asset overview...', 45);

  if (config.includeAssetOverview && data.assetMetrics.length > 0) {
    doc.addPage();
    currentPage++;
    addHeader();
    addSectionTitle(isSingleAsset ? 'Asset Overview' : 'Asset Portfolio Overview', 1);
    addTocEntry(isSingleAsset ? 'Asset Overview' : 'Asset Portfolio Overview');

    if (isSingleAsset && data.assetMetrics.length === 1) {
      const asset = data.assetMetrics[0];
      const detailPairs = [
        ['Building Name', asset.assetName],
        ['Address', asset.address || 'N/A'],
        ['Year Built', asset.yearBuilt?.toString() || 'N/A'],
        ['Gross Floor Area', asset.grossFloorArea ? `${asset.grossFloorArea.toLocaleString()} sq ft` : 'N/A'],
        ['Current Replacement Value', formatCurrency(asset.currentReplacementValue)],
        ['Deferred Maintenance Cost', formatCurrency(asset.deferredMaintenanceCost)],
        ['Facility Condition Index', `${formatPercentage(asset.fci, 1)} (${asset.fciRating})`],
        ['Overall Condition', `${asset.conditionRating} (${asset.conditionScore}%)`],
        ['Components Assessed', asset.assessmentCount.toString()],
        ['Deficiencies Identified', asset.deficiencyCount > 0 ? asset.deficiencyCount.toString() : 'None identified'],
        ['Average Remaining Life', asset.averageRemainingLife > 0 ? `${asset.averageRemainingLife} years` : 'N/A'],
        ['Immediate Needs', formatCurrency(asset.immediateNeeds)],
        ['Short-Term Needs (1-3 yr)', formatCurrency(asset.shortTermNeeds)],
        ['Medium-Term Needs (3-7 yr)', formatCurrency(asset.mediumTermNeeds)],
        ['Long-Term Needs (7+ yr)', formatCurrency(asset.longTermNeeds)],
      ];
      autoTable(doc, {
        startY: yPos,
        body: detailPairs.map(([label, value]) => [label, value]),
        theme: 'plain',
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold', textColor: colors.secondary },
          1: { cellWidth: contentWidth - 55 }
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
    } else {
      const assetTableData = data.assetMetrics.map(asset => [
        asset.assetName.substring(0, 25) + (asset.assetName.length > 25 ? '...' : ''),
        formatCurrency(asset.currentReplacementValue),
        formatCurrency(asset.deferredMaintenanceCost),
        formatPercentage(asset.fci, 1),
        asset.fciRating,
        asset.priorityScore.toString()
      ]);
      autoTable(doc, {
        startY: yPos,
        head: [['Asset Name', 'CRV', 'Deferred Maint.', 'FCI', 'Rating', 'Priority']],
        body: assetTableData,
        theme: 'striped',
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 50 }, 1: { halign: 'right' }, 2: { halign: 'right' },
          3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });
    }
    yPos = (doc as any).lastAutoTable?.finalY + 5 || yPos + 50;
  }

  // ============================================
  // 14. COMPONENT ASSESSMENTS WITH PHOTOS
  // ============================================
  onProgress?.('Generating component assessments...', 50);

  if (config.includeComponentAssessments && data.components.length > 0) {
    doc.addPage();
    currentPage++;
    addHeader();
    addSectionTitle('Component Assessments', 1);
    addTocEntry('Component Assessments');

    const groupedComponents = new Map<string, EnhancedComponentData[]>();
    for (const component of data.components) {
      const groupKey = component.uniformatLevel1 || 'OTHER';
      const existing = groupedComponents.get(groupKey) || [];
      existing.push(component);
      groupedComponents.set(groupKey, existing);
    }

    // Sort A-G, push unknown to end
    const sortedGroups = Array.from(groupedComponents.entries()).sort((a, b) => {
      const letterA = a[0].charAt(0).toUpperCase();
      const letterB = b[0].charAt(0).toUpperCase();
      const orderA = 'ABCDEFG'.indexOf(letterA);
      const orderB = 'ABCDEFG'.indexOf(letterB);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    });

    const usedPhotoUrls = new Set<string>();
    let componentIndex = 0;
    const totalComponentsCount = data.components.length;

    for (const [groupKey, components] of sortedGroups) {
      const groupLetter = groupKey.charAt(0).toUpperCase();
      const groupName = UNIFORMAT_GROUPS[groupLetter] || groupKey;
      
      checkPageBreak(30);
      doc.setFillColor(...colors.primary);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${groupLetter} - ${groupName}`, margin + 3, yPos + 6);
      yPos += 12;

      for (const component of components) {
        componentIndex++;
        const progress = 50 + (componentIndex / totalComponentsCount) * 30;
        onProgress?.(`Processing component ${componentIndex}/${totalComponentsCount}...`, progress);

        checkPageBreak(60);

        // Component header with condition badge
        doc.setFillColor(...colors.lightGray);
        doc.rect(margin, yPos, contentWidth, 7, 'F');
        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${component.uniformatCode} - ${component.componentName}`, margin + 2, yPos + 5);
        
        const condColor = getConditionColor(component.condition);
        const condBadgeX = margin + contentWidth - 28;
        doc.setFillColor(...condColor);
        doc.roundedRect(condBadgeX, yPos + 1, 26, 5, 1, 1, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(capitalize(component.condition), condBadgeX + 13, yPos + 4.5, { align: 'center' });
        yPos += 10;

        // Two-column details
        const leftColX = margin;
        const rightColX = margin + contentWidth / 2;
        doc.setFontSize(8);
        doc.setTextColor(...colors.text);

        let leftY = yPos;
        doc.setFont('helvetica', 'bold');
        doc.text('Location:', leftColX, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text((component.componentLocation || 'N/A').substring(0, 35), leftColX + 22, leftY);
        leftY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Condition:', leftColX, leftY);
        doc.setTextColor(...condColor);
        doc.setFont('helvetica', 'bold');
        const condPct = component.conditionPercentage ? ` (${component.conditionPercentage}%)` : '';
        doc.text(`${capitalize(component.condition)}${condPct}`, leftColX + 22, leftY);
        doc.setTextColor(...colors.text);
        doc.setFont('helvetica', 'normal');
        leftY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Remaining Life:', leftColX, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text(component.remainingUsefulLife !== null ? `${component.remainingUsefulLife} years` : 'N/A', leftColX + 30, leftY);
        leftY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Service Life:', leftColX, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text(component.estimatedServiceLife !== null ? `${component.estimatedServiceLife} years` : 'N/A', leftColX + 30, leftY);
        leftY += 5;

        let rightY = yPos;
        if (config.showCostFields) {
          doc.setFont('helvetica', 'bold');
          doc.text('Repair Cost:', rightColX, rightY);
          doc.setFont('helvetica', 'normal');
          doc.text(formatCurrency(component.repairCost), rightColX + 30, rightY);
          rightY += 5;

          doc.setFont('helvetica', 'bold');
          doc.text('Replacement Cost:', rightColX, rightY);
          doc.setFont('helvetica', 'normal');
          doc.text(formatCurrency(component.replacementCost), rightColX + 38, rightY);
          rightY += 5;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Action Type:', rightColX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatActionType(component.actionType), rightColX + 28, rightY);
        rightY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Action Year:', rightColX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(component.actionYear?.toString() || 'N/A', rightColX + 28, rightY);
        rightY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Priority:', rightColX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(getPriorityLabel(component.priority), rightColX + 20, rightY);

        yPos = Math.max(leftY, rightY) + 3;

        // Observations
        const cleanObservations = stripHtmlTags(component.observations);
        if (cleanObservations) {
          checkPageBreak(20);
          doc.setFillColor(245, 247, 250);
          doc.rect(margin, yPos - 1, contentWidth, 4, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...colors.primary);
          doc.text('OBSERVATIONS:', margin + 2, yPos + 2);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.text);
          const obsLines = doc.splitTextToSize(cleanObservations, contentWidth - 4);
          for (let i = 0; i < Math.min(obsLines.length, 6); i++) {
            doc.text(obsLines[i], margin + 2, yPos);
            yPos += 4;
          }
          yPos += 2;
        }

        // Recommendations
        const cleanRecommendations = stripHtmlTags(component.recommendations);
        if (cleanRecommendations) {
          checkPageBreak(20);
          doc.setFillColor(240, 253, 244);
          doc.rect(margin, yPos - 1, contentWidth, 4, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(34, 139, 34);
          doc.text('RECOMMENDATIONS:', margin + 2, yPos + 2);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.text);
          const recLines = doc.splitTextToSize(cleanRecommendations, contentWidth - 4);
          for (let i = 0; i < Math.min(recLines.length, 6); i++) {
            doc.text(recLines[i], margin + 2, yPos);
            yPos += 4;
          }
          yPos += 2;
        }

        // Photos (deduplicated)
        if (config.includePhotos && component.photos.length > 0) {
          const photos = photoMap.get(component.id) || [];
          const dedupedPhotos: string[] = [];
          for (let i = 0; i < Math.min(photos.length, config.maxPhotosPerComponent); i++) {
            const photoUrl = component.photos[i]?.url;
            if (photoUrl && !usedPhotoUrls.has(photoUrl)) {
              usedPhotoUrls.add(photoUrl);
              dedupedPhotos.push(photos[i]);
            }
          }

          if (dedupedPhotos.length > 0) {
            checkPageBreak(45);
            const photoWidth = 40;
            const photoHeight = 30;
            const photosPerRow = Math.min(dedupedPhotos.length, 4);
            const photoSpacing = (contentWidth - (photosPerRow * photoWidth)) / (photosPerRow + 1);
            
            for (let i = 0; i < dedupedPhotos.length; i++) {
              const row = Math.floor(i / 4);
              const col = i % 4;
              const photoX = margin + photoSpacing + (col * (photoWidth + photoSpacing));
              const photoY2 = yPos + (row * (photoHeight + 8));
              try {
                doc.addImage(dedupedPhotos[i], 'JPEG', photoX, photoY2, photoWidth, photoHeight);
                const photoData = component.photos[i];
                if (photoData?.caption) {
                  doc.setFontSize(6);
                  doc.setTextColor(...colors.secondary);
                  doc.text(photoData.caption.substring(0, 30), photoX + photoWidth / 2, photoY2 + photoHeight + 3, { align: 'center' });
                }
              } catch (e) {
                console.error('Failed to add image to PDF:', e);
              }
            }
            const photoRows = Math.ceil(dedupedPhotos.length / 4);
            yPos += photoRows * (photoHeight + 10);
          }
        }

        yPos += 5;
        doc.setDrawColor(...colors.mediumGray);
        doc.line(margin, yPos, margin + contentWidth, yPos);
        yPos += 5;
      }
    }
  }

  // ============================================
  // 15. ACTION LIST TABLE
  // ============================================
  onProgress?.('Generating action list...', 85);

  if (config.includeActionList && data.actionList.length > 0) {
    doc.addPage();
    currentPage++;
    addHeader();
    addSectionTitle('Action List Summary', 1);
    addTocEntry('Action List Summary');

    const getActionScope = (action: ActionListItem): string => {
      const cleanDesc = stripHtmlTags(action.description);
      if (cleanDesc && cleanDesc.length > 5) {
        return cleanDesc.substring(0, 50) + (cleanDesc.length > 50 ? '...' : '');
      }
      return action.actionName.substring(0, 40);
    };

    const actionTableData = data.actionList.slice(0, 50).map(action => [
      action.itemId,
      getActionScope(action),
      action.uniformatCode,
      formatActionType(action.actionType),
      action.actionYear?.toString() || '-',
      formatCurrency(action.actionCost),
      getPriorityLabel(action.priority)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Action / Scope', 'Code', 'Type', 'Year', 'Cost', 'Priority']],
      body: actionTableData,
      theme: 'striped',
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 15 }, 1: { cellWidth: 55 }, 2: { cellWidth: 15 },
        3: { cellWidth: 18 }, 4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }, 6: { cellWidth: 18 }
      },
      margin: { left: margin, right: margin }
    });

    if (data.actionList.length > 50) {
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 100;
      doc.setFontSize(8);
      doc.setTextColor(...colors.secondary);
      doc.text(`Showing 50 of ${data.actionList.length} actions.`, margin, finalY + 5);
    }
  }

  // ============================================
  // 16. CAPITAL FORECAST
  // ============================================
  onProgress?.('Generating capital forecast...', 90);

  if (config.includeCapitalForecast && data.capitalForecast.length > 0) {
    doc.addPage();
    currentPage++;
    addHeader();
    addSectionTitle(`${data.capitalForecast.length}-Year Capital Renewal Forecast`, 1);
    addTocEntry('Capital Renewal Forecast');

    const forecastTableData = data.capitalForecast.map(year => [
      year.year.toString(),
      year.immediateNeeds > 0 ? formatCurrency(year.immediateNeeds) : '-',
      year.shortTermNeeds > 0 ? formatCurrency(year.shortTermNeeds) : '-',
      year.mediumTermNeeds > 0 ? formatCurrency(year.mediumTermNeeds) : '-',
      year.longTermNeeds > 0 ? formatCurrency(year.longTermNeeds) : '-',
      formatCurrency(year.totalProjectedCost),
      formatCurrency(year.cumulativeCost)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Year', 'Immediate', 'Short Term', 'Medium Term', 'Long Term', 'Total', 'Cumulative']],
      body: forecastTableData,
      theme: 'striped',
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' },
        4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });
  }

  // ============================================
  // 17. UNIFORMAT BREAKDOWN
  // ============================================
  onProgress?.('Finalizing PDF...', 95);

  if (config.includeUniformatBreakdown && data.uniformatSummary.length > 0) {
    doc.addPage();
    currentPage++;
    addHeader();
    addSectionTitle('UNIFORMAT II Category Breakdown', 1);
    addTocEntry('UNIFORMAT II Category Breakdown');

    const sortedUniformatForTable = [...data.uniformatSummary]
      .filter(g => 'ABCDEFG'.includes(g.groupCode.charAt(0).toUpperCase()))
      .sort((a, b) => 'ABCDEFG'.indexOf(a.groupCode.charAt(0).toUpperCase()) - 'ABCDEFG'.indexOf(b.groupCode.charAt(0).toUpperCase()));

    const uniformatTableData = sortedUniformatForTable.map(group => [
      group.groupCode,
      group.groupName.substring(0, 30),
      group.componentCount.toString(),
      formatCurrency(group.totalRepairCost),
      formatCurrency(group.totalReplacementCost),
      formatPercentage(group.avgConditionPercentage)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Code', 'Category', 'Components', 'Repair Cost', 'Replacement', 'Avg Condition']],
      body: uniformatTableData,
      theme: 'striped',
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15 }, 1: { cellWidth: 50 }, 2: { halign: 'center' },
        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });
  }

  // ============================================
  // 18. PRIORITY MATRIX
  // ============================================
  if (config.includePriorityMatrix && data.priorityMatrix.length > 0) {
    doc.addPage();
    currentPage++;
    addHeader();
    addSectionTitle('Priority Matrix', 1);
    addTocEntry('Priority Matrix');

    // Merge priority matrix entries into BCA categories
    const mergedPriorities = new Map<string, { count: number; totalCost: number }>();
    const priorityOrder = ['Critical', 'Necessary', 'Recommended', 'Routine'];
    for (const label of priorityOrder) mergedPriorities.set(label, { count: 0, totalCost: 0 });
    
    for (const p of data.priorityMatrix) {
      const label = getPriorityLabel(p.priority);
      const existing = mergedPriorities.get(label) || { count: 0, totalCost: 0 };
      existing.count += p.count;
      existing.totalCost += p.totalCost;
      mergedPriorities.set(label, existing);
    }

    const totalCount = data.priorityMatrix.reduce((sum, p) => sum + p.count, 0);
    const totalCostSum = data.priorityMatrix.reduce((sum, p) => sum + p.totalCost, 0);

    const priorityTableData = priorityOrder
      .filter(label => (mergedPriorities.get(label)?.count || 0) > 0)
      .map(label => {
        const entry = mergedPriorities.get(label)!;
        const pct = totalCostSum > 0 ? (entry.totalCost / totalCostSum) * 100 : 0;
        return [label, entry.count.toString(), formatCurrency(entry.totalCost), formatPercentage(pct)];
      });
    priorityTableData.push(['TOTAL', totalCount.toString(), formatCurrency(totalCostSum), '100%']);

    autoTable(doc, {
      startY: yPos,
      head: [['Priority Level', 'Component Count', 'Estimated Cost', '% of Total']],
      body: priorityTableData,
      theme: 'striped',
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 60 }, 1: { halign: 'center' },
        2: { halign: 'right' }, 3: { halign: 'right' }
      },
      didParseCell: (hookData: any) => {
        if (hookData.row.index === priorityTableData.length - 1) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [220, 230, 241];
        }
      },
      margin: { left: margin, right: margin }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 80;
    yPos = finalY + 10;
    
    if (yPos < pageHeight - 40) {
      addParagraph(`This priority matrix summarizes ${totalCount} assessed components with a total estimated remediation cost of ${formatCurrency(totalCostSum)}. Items are categorized by urgency to support capital planning and budget allocation.`);
    }
  }

  // ============================================
  // FILL TABLE OF CONTENTS (go back to TOC page)
  // ============================================
  doc.setPage(tocPageNumber);
  let tocY = 18;
  
  // TOC Header
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BUILDING CONDITION ASSESSMENT REPORT', margin, 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(config.projectName, pageWidth - margin, 8, { align: 'right' });

  tocY = 25;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('TABLE OF CONTENTS', margin, tocY);
  tocY += 12;

  for (const entry of tocEntries) {
    if (tocY > pageHeight - 20) break;
    
    doc.setFontSize(entry.level === 1 ? 10 : 9);
    doc.setFont('helvetica', entry.level === 1 ? 'bold' : 'normal');
    doc.setTextColor(...(entry.level === 1 ? colors.text : colors.secondary));
    
    const indent = entry.level === 1 ? 0 : 8;
    const title = entry.title.substring(0, 65);
    doc.text(title, margin + indent, tocY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(entry.pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
    
    // Dotted line
    const titleWidth = doc.getTextWidth(title);
    const pageNumWidth = doc.getTextWidth(entry.pageNumber.toString());
    const dotsStart = margin + indent + titleWidth + 2;
    const dotsEnd = pageWidth - margin - pageNumWidth - 2;
    if (dotsEnd > dotsStart + 5) {
      doc.setFontSize(8);
      doc.setTextColor(...colors.mediumGray);
      let dotX = dotsStart;
      while (dotX < dotsEnd) {
        doc.text('.', dotX, tocY);
        dotX += 2;
      }
    }
    
    tocY += entry.level === 1 ? 7 : 5;
  }

  // Add footers to all pages
  addFooter();

  onProgress?.('Saving PDF...', 98);

  // Save the PDF
  const fileName = `BCA_Report_${config.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  onProgress?.('Complete!', 100);
}

/**
 * Estimate the number of pages for a report configuration
 */
export function estimatePageCount(config: EnhancedReportConfig, data: Partial<EnhancedReportData>): number {
  let pages = 1; // Cover page
  pages += 1; // TOC
  pages += 2; // Introduction
  pages += 2; // ASTM E2018
  pages += 1; // Action Types + Priority Levels
  pages += 1; // Condition Ratings + FCI
  pages += 2; // Limitations & Disclosure
  pages += 1; // Dashboard
  pages += 2; // Executive Summary
  pages += 1; // Observations & Recommendations
  
  if (config.includeAssetOverview && data.assetMetrics) {
    pages += Math.ceil(data.assetMetrics.length / 15);
  }
  
  if (config.includeComponentAssessments && data.components) {
    const componentsPerPage = config.includePhotos ? 3 : 6;
    pages += Math.ceil(data.components.length / componentsPerPage);
  }
  
  if (config.includeActionList && data.actionList) {
    pages += Math.ceil(Math.min(data.actionList.length, 50) / 25);
  }
  
  if (config.includeCapitalForecast) pages += 1;
  if (config.includeUniformatBreakdown) pages += 1;
  if (config.includePriorityMatrix) pages += 1;
  
  return pages;
}
