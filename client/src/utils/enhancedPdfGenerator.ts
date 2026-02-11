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
 * - Dashboard with visual charts (single page)
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
  primary: [31, 78, 161] as [number, number, number],       // Deep professional blue
  primaryDark: [20, 55, 120] as [number, number, number],
  primaryLight: [66, 120, 200] as [number, number, number],
  secondary: [90, 100, 115] as [number, number, number],     // Muted slate
  success: [22, 163, 74] as [number, number, number],        // Confident green
  warning: [217, 158, 0] as [number, number, number],        // Warm amber
  danger: [200, 50, 50] as [number, number, number],         // Restrained red
  orange: [210, 95, 20] as [number, number, number],         // Warm orange
  text: [28, 35, 50] as [number, number, number],            // Near-black for body
  textLight: [75, 85, 100] as [number, number, number],      // Secondary text
  lightGray: [244, 246, 250] as [number, number, number],    // Subtle background
  mediumGray: [215, 220, 228] as [number, number, number],   // Borders/dividers
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  lightBlue: [225, 237, 255] as [number, number, number],
  lightGreen: [228, 248, 235] as [number, number, number],
  lightOrange: [255, 240, 220] as [number, number, number],
  lightRed: [255, 232, 232] as [number, number, number],
  tableStripe: [249, 250, 253] as [number, number, number],  // Very subtle stripe
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

/** Check if a component belongs to valid UNIFORMAT categories (A-G) */
const isValidUniformatComponent = (component: EnhancedComponentData): boolean => {
  const firstChar = (component.uniformatCode || component.uniformatLevel1 || '').charAt(0).toUpperCase();
  return 'ABCDEFG'.includes(firstChar);
};

const UNIFORMAT_GROUPS: Record<string, string> = {
  'A': 'Substructure',
  'B': 'Shell',
  'C': 'Interiors',
  'D': 'Services',
  'E': 'Equipment & Furnishings',
  'F': 'Special Construction',
  'G': 'Building Sitework',
};

const UNIFORMAT_GROUPS_UPPER: Record<string, string> = {
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
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;
  let currentPage = 1;
  
  // Filter out test/invalid components globally
  const validComponents = data.components.filter(isValidUniformatComponent);
  
  // TOC tracking
  const tocEntries: Array<{ title: string; pageNumber: number; level: number }> = [];
  const addTocEntry = (title: string, level: number = 1) => {
    tocEntries.push({ title, pageNumber: currentPage, level });
  };

  // Pre-load photos
  let photoMap = new Map<number, string[]>();
  if (config.includePhotos && config.includeComponentAssessments) {
    onProgress?.('Loading photos...', 10);
    photoMap = await preloadPhotos(validComponents, (loaded, total) => {
      onProgress?.(`Loading photos (${loaded}/${total})...`, 10 + (loaded / total) * 20);
    });
  }
  
  onProgress?.('Generating PDF pages...', 30);

  const isSingleAsset = data.summary.totalAssets === 1;
  const assetLabel = isSingleAsset ? (data.assetMetrics[0]?.assetName || 'the asset') : `the portfolio of ${data.summary.totalAssets} assets`;

  // ---- Shared table styles ----
  const tableHeadStyle = {
    fillColor: colors.primary as [number, number, number],
    textColor: colors.white as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 8.5,
    cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
  };

  const tableBodyStyle = {
    fontSize: 8,
    cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
    textColor: colors.text as [number, number, number],
  };

  const tableAlternateStyle = {
    fillColor: colors.tableStripe as [number, number, number],
  };

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
    // Thin accent line at very top
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 10, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BUILDING CONDITION ASSESSMENT REPORT', margin, 7);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(config.projectName, pageWidth - margin, 7, { align: 'right' });
    yPos = 16;
  };

  const addFooter = (): void => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      // Thin line above footer
      doc.setDrawColor(...colors.mediumGray);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.secondary);
      doc.setFont('helvetica', 'normal');
      doc.text('B3NMA - Building Condition Assessment', margin, pageHeight - 7);
      doc.text('Confidential', pageWidth / 2, pageHeight - 7, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
  };

  const addSectionTitle = (title: string, level: number = 1): void => {
    if (level === 1) {
      checkPageBreak(14);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(title, margin, yPos);
      yPos += 2;
      // Clean underline
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.6);
      doc.line(margin, yPos, margin + contentWidth, yPos);
      yPos += 6;
    } else {
      checkPageBreak(10);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primaryDark);
      doc.text(title, margin, yPos);
      yPos += 6;
    }
  };

  const addParagraph = (text: string, indent: number = 0): void => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    for (const line of lines) {
      checkPageBreak(4.5);
      doc.text(line, margin + indent, yPos);
      yPos += 4;
    }
    yPos += 2;
  };

  const addBoldLabel = (label: string, value: string): void => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + doc.getTextWidth(label) + 1, yPos);
    yPos += 5;
  };

  // ============================================
  // 1. COVER PAGE
  // ============================================
  // Full-width blue header band
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.text('Building Condition', pageWidth / 2, 32, { align: 'center' });
  doc.text('Assessment Report', pageWidth / 2, 46, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const titleText = config.reportTitle || config.projectName;
  doc.text(titleText.substring(0, 70), pageWidth / 2, 62, { align: 'center' });

  // Report Information box
  yPos = 95;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, margin, yPos + 60);  // Left accent line
  doc.setFillColor(...colors.lightGray);
  doc.rect(margin + 2, yPos, contentWidth - 2, 60, 'F');
  
  doc.setTextColor(...colors.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Information', margin + 8, yPos + 9);
  
  doc.setFontSize(8.5);
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
  
  let detailY = yPos + 18;
  for (const [label, value] of coverDetails) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textLight);
    doc.text(label, margin + 8, detailY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text(value.substring(0, 55), margin + 48, detailY);
    detailY += 7;
  }

  // Key Findings section
  yPos = 170;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Key Findings', margin, yPos);
  yPos += 8;

  const metricBoxWidth = (contentWidth - 8) / 3;
  const metricBoxHeight = 26;
  const fciValue = data.summary.portfolioFCI;
  const coverMetrics = [
    { label: 'Facility Condition Index', value: formatPercentage(fciValue, 2), color: getFCIColor(fciValue) },
    { label: 'Condition Rating', value: data.summary.portfolioFCIRating, color: getConditionColor(data.summary.portfolioFCIRating.toLowerCase()) },
    { label: 'Current Replacement Value', value: formatCurrency(data.summary.totalCurrentReplacementValue), color: colors.primary },
    { label: 'Deferred Maintenance', value: formatCurrency(data.summary.totalDeferredMaintenanceCost), color: colors.danger },
    { label: 'Components Assessed', value: validComponents.length.toString(), color: colors.primaryDark },
    { label: 'Funding Gap', value: formatCurrency(data.summary.fundingGap), color: colors.orange },
  ];

  coverMetrics.forEach((metric, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = margin + (col * (metricBoxWidth + 4));
    const y = yPos + (row * (metricBoxHeight + 4));
    // Card with left accent
    doc.setFillColor(...colors.lightGray);
    doc.rect(x, y, metricBoxWidth, metricBoxHeight, 'F');
    doc.setFillColor(...(metric.color || colors.primary));
    doc.rect(x, y, 2, metricBoxHeight, 'F');  // Left color accent
    doc.setFontSize(7);
    doc.setTextColor(...colors.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x + 6, y + 8);
    doc.setFontSize(14);
    doc.setTextColor(...(metric.color || colors.text));
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x + 6, y + 20);
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
  yPos += 1;

  addParagraph(`B3NMA was retained to conduct a Building Condition Assessment (BCA) of ${assetLabel}, located at ${config.clientAddress || 'the subject property'}. The assessment was performed in accordance with ASTM E2018 \u2013 Standard Guide for Property Condition Assessments: Baseline Property Condition Assessment Process.`);

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
    checkPageBreak(7);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text('\u2022', margin + 3, yPos);
    const lines = doc.splitTextToSize(item, contentWidth - 12);
    doc.text(lines, margin + 9, yPos);
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
      bodyStyles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', textColor: colors.textLight },
        1: { cellWidth: contentWidth - 50, textColor: colors.text }
      },
      margin: { left: margin, right: margin },
      alternateRowStyles: tableAlternateStyle,
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
  addParagraph('ASTM E2018 \u2013 Standard Guide for Property Condition Assessments: Baseline Property Condition Assessment Process provides a standardized framework for evaluating the physical condition of commercial real estate and institutional properties. The standard establishes consistent methodology for documenting building conditions, identifying deficiencies, and estimating costs for remediation.');

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
    headStyles: tableHeadStyle,
    bodyStyles: tableBodyStyle,
    alternateRowStyles: tableAlternateStyle,
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: contentWidth - 53 }
    },
    margin: { left: margin, right: margin },
  });
  yPos = (doc as any).lastAutoTable?.finalY + 8 || yPos + 60;

  addSectionTitle('UNIFORMAT II Classification System', 2);
  addParagraph('Building components are organized using the UNIFORMAT II classification system (ASTM E1557), which provides a hierarchical structure for categorizing building elements:');
  const uniformatCategories = [
    ['A', 'Substructure', 'Foundations, basement construction, slab on grade'],
    ['B', 'Shell', 'Superstructure, exterior enclosure, roofing'],
    ['C', 'Interiors', 'Interior construction, stairs, interior finishes'],
    ['D', 'Services', 'Conveying systems, plumbing, HVAC, fire protection, electrical'],
    ['E', 'Equipment & Furnishings', 'Equipment, furnishings, special construction'],
    ['F', 'Special Construction', 'Special structures, building demolition'],
    ['G', 'Building Sitework', 'Site preparation, improvements, utilities'],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Code', 'Category', 'Includes']],
    body: uniformatCategories,
    theme: 'striped',
    headStyles: tableHeadStyle,
    bodyStyles: tableBodyStyle,
    alternateRowStyles: tableAlternateStyle,
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
    headStyles: tableHeadStyle,
    bodyStyles: tableBodyStyle,
    alternateRowStyles: tableAlternateStyle,
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: contentWidth - 38 }
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
    ['Critical', '0\u20131 Year', 'Immediate action required. Includes life safety hazards, code violations, active water infiltration, structural concerns, or conditions that pose imminent risk of failure.', colors.danger],
    ['Necessary', '1\u20135 Years', 'Action required in the near term. Components are deteriorating and will reach failure if not addressed. Deferral may result in increased repair costs.', colors.orange],
    ['Recommended', '6\u201310 Years', 'Action recommended to maintain building condition. Components are functional but approaching the end of their expected service life.', colors.warning],
    ['Routine', 'N/A', 'Component is in satisfactory condition. No corrective action is required. Routine maintenance should continue as scheduled.', colors.success],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Priority', 'Timeframe', 'Description']],
    body: priorityLevels.map(([p, t, d]) => [p as string, t as string, d as string]),
    theme: 'striped',
    headStyles: tableHeadStyle,
    bodyStyles: tableBodyStyle,
    alternateRowStyles: tableAlternateStyle,
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: contentWidth - 50 }
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
    ['Good', '70\u2013100%', 'The component is performing as intended with only minor wear. Routine maintenance is sufficient.', colors.success],
    ['Fair', '40\u201369%', 'The component shows moderate deterioration. Repair or renewal should be planned within the medium term.', colors.warning],
    ['Poor', '10\u201339%', 'The component exhibits significant deterioration. Near-term intervention is required.', colors.orange],
    ['Failed / Critical', '0\u20139%', 'The component has reached or exceeded its useful life. Immediate replacement or major repair is required.', colors.danger],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Condition', 'Score Range', 'Description']],
    body: conditionRatings.map(([c, r, d]) => [c as string, r as string, d as string]),
    theme: 'striped',
    headStyles: tableHeadStyle,
    bodyStyles: tableBodyStyle,
    alternateRowStyles: tableAlternateStyle,
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: contentWidth - 52 }
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
  checkPageBreak(18);
  doc.setFillColor(...colors.lightBlue);
  doc.roundedRect(margin + 15, yPos, contentWidth - 30, 14, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('FCI = Deferred Maintenance Cost (DMC) \u00F7 Current Replacement Value (CRV)', pageWidth / 2, yPos + 9, { align: 'center' });
  yPos += 20;

  addParagraph('Deferred Maintenance Cost (DMC) represents the total estimated cost of all identified deficiencies and required remediation work. Current Replacement Value (CRV) represents the estimated cost to replace the entire building with a new facility of equivalent size and function at current market prices.');

  addSectionTitle('FCI Rating Scale', 2);
  const fciScale = [
    ['Good', '0%\u20135%', 'The facility is in good overall condition with minimal deferred maintenance.', colors.success],
    ['Fair', '5%\u201310%', 'The facility shows moderate deferred maintenance requiring planned investment.', colors.warning],
    ['Poor', '10%\u201330%', 'The facility has significant deferred maintenance requiring substantial capital investment.', colors.orange],
    ['Critical', '> 30%', 'The facility has critical deferred maintenance. Major renovation or replacement should be considered.', colors.danger],
  ];
  autoTable(doc, {
    startY: yPos,
    head: [['Rating', 'FCI Range', 'Description']],
    body: fciScale.map(([r, range, d]) => [r as string, range as string, d as string]),
    theme: 'striped',
    headStyles: tableHeadStyle,
    bodyStyles: tableBodyStyle,
    alternateRowStyles: tableAlternateStyle,
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: contentWidth - 44 }
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
  yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 60;

  // Building-specific FCI
  if (isSingleAsset && data.assetMetrics.length === 1) {
    const asset = data.assetMetrics[0];
    checkPageBreak(20);
    addSectionTitle('Building FCI Calculation', 2);
    addParagraph(`For ${asset.assetName}, the FCI is calculated as ${formatCurrency(data.summary.totalDeferredMaintenanceCost)} (DMC) \u00F7 ${formatCurrency(data.summary.totalCurrentReplacementValue)} (CRV) = ${formatPercentage(fciValue, 2)}, which corresponds to a "${data.summary.portfolioFCIRating}" rating.`);
  }

  // ============================================
  // 9. LIMITATIONS AND DISCLOSURE
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Limitations and Disclosure Statement', 1);
  addTocEntry('Limitations and Disclosure Statement');

  addSectionTitle('Limitations', 2);
  const limitations = [
    'This assessment is based on visual, non-invasive observation only. No destructive testing, laboratory analysis, or invasive investigation was performed.',
    'The assessment is limited to readily accessible areas. Concealed conditions behind walls, above ceilings, below floors, or underground are not included.',
    'Environmental assessments (asbestos, lead paint, mold, radon, soil contamination) are excluded from this scope of work.',
    'Code compliance review is limited to visually observable conditions. A comprehensive code audit was not performed.',
    'Cost estimates are order-of-magnitude projections based on current market conditions and industry databases. Actual costs may vary based on project-specific conditions, procurement methods, and market fluctuations.',
    'This report represents conditions observed at the time of the site visit. Building conditions may change over time due to ongoing use, maintenance, or environmental factors.',
  ];
  for (const item of limitations) {
    checkPageBreak(10);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text('\u2022', margin + 3, yPos);
    const lines = doc.splitTextToSize(item, contentWidth - 12);
    doc.text(lines, margin + 9, yPos);
    yPos += lines.length * 4 + 1.5;
  }
  yPos += 4;

  addSectionTitle('Disclosure', 2);
  addParagraph('This report has been prepared for the exclusive use of the client identified on the cover page. The findings, opinions, and recommendations contained herein are based on the assessor\'s professional judgment and the conditions observed at the time of the assessment.');
  addParagraph('B3NMA makes no warranty, express or implied, regarding the completeness or accuracy of the information contained in this report beyond the scope of work described herein. This report is not intended to be used as a warranty or guarantee of building performance.');

  addSectionTitle('Assumptions', 2);
  const assumptions = [
    'All building systems were installed in accordance with applicable codes and standards at the time of construction.',
    'Building maintenance has been performed in accordance with standard industry practices.',
    'Cost estimates are based on current market conditions and do not account for future escalation.',
    'Remaining useful life estimates are based on industry-standard life expectancy tables and observed conditions.',
    `The capital forecast covers a ${config.actionYearHorizon || 20}-year planning horizon from the date of assessment.`,
  ];
  for (const assumption of assumptions) {
    checkPageBreak(8);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text('\u2022', margin + 3, yPos);
    const lines = doc.splitTextToSize(assumption, contentWidth - 12);
    doc.text(lines, margin + 9, yPos);
    yPos += lines.length * 4 + 1;
  }

  // ============================================
  // 10. DASHBOARD (single page, consolidated)
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Assessment Dashboard', 1);
  addTocEntry('Assessment Dashboard');

  onProgress?.('Generating dashboard charts...', 35);

  // KPI Cards Row - more prominent
  const dashMetrics = [
    { label: 'FCI', value: formatPercentage(fciValue, 1), sub: data.summary.portfolioFCIRating, color: getFCIColor(fciValue) },
    { label: 'Avg Condition', value: `${data.summary.averageConditionScore.toFixed(1)}%`, sub: data.summary.averageConditionRating, color: getConditionColor(data.summary.averageConditionRating.toLowerCase()) },
    { label: 'Deferred Maint.', value: formatCurrency(data.summary.totalDeferredMaintenanceCost), sub: '', color: colors.danger },
    { label: 'CRV', value: formatCurrency(data.summary.totalCurrentReplacementValue), sub: '', color: colors.primary },
  ];

  const dashBoxW = (contentWidth - 9) / 4;
  const dashBoxH = 20;
  dashMetrics.forEach((m, i) => {
    const x = margin + i * (dashBoxW + 3);
    // Card background
    doc.setFillColor(...colors.lightGray);
    doc.rect(x, yPos, dashBoxW, dashBoxH, 'F');
    // Left accent
    doc.setFillColor(...m.color);
    doc.rect(x, yPos, 1.5, dashBoxH, 'F');
    // Label
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label, x + 5, yPos + 6);
    // Value
    doc.setFontSize(11);
    doc.setTextColor(...m.color);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + 5, yPos + 14);
    // Sub label
    if (m.sub) {
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.textLight);
      doc.setFont('helvetica', 'normal');
      doc.text(m.sub, x + dashBoxW - 3, yPos + 14, { align: 'right' });
    }
  });
  yPos += dashBoxH + 6;

  // ---- Condition Distribution (stacked bar) ----
  addSectionTitle('Condition Distribution', 2);
  
  const condCounts = { good: 0, fair: 0, poor: 0, failed: 0 };
  for (const c of validComponents) {
    const cond = c.condition?.toLowerCase();
    if (cond === 'good') condCounts.good++;
    else if (cond === 'fair') condCounts.fair++;
    else if (cond === 'poor') condCounts.poor++;
    else condCounts.failed++;
  }
  const totalComps = validComponents.length || 1;

  const barY = yPos;
  const barHeight = 12;
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
      if (segWidth > 12) {
        doc.setTextColor(...colors.white);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`${seg.count}`, barX + segWidth / 2, barY + barHeight / 2 + 1, { align: 'center' });
      }
      barX += segWidth;
    }
  }
  yPos = barY + barHeight + 3;

  // Legend row
  let legendX = margin;
  for (const seg of segments) {
    doc.setFillColor(...seg.color);
    doc.rect(legendX, yPos, 3, 3, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'normal');
    const pct = ((seg.count / totalComps) * 100).toFixed(0);
    const legendText = `${seg.label}: ${seg.count} (${pct}%)`;
    doc.text(legendText, legendX + 5, yPos + 2.5);
    legendX += doc.getTextWidth(legendText) + 10;
  }
  yPos += 8;

  // ---- Cost by UNIFORMAT Category (horizontal bars) ----
  addSectionTitle('Cost by Building System', 2);

  const sortedUniformatSummary = [...data.uniformatSummary]
    .filter(g => 'ABCDEFG'.includes(g.groupCode.charAt(0).toUpperCase()))
    .sort((a, b) => 'ABCDEFG'.indexOf(a.groupCode.charAt(0).toUpperCase()) - 'ABCDEFG'.indexOf(b.groupCode.charAt(0).toUpperCase()));

  if (sortedUniformatSummary.length > 0) {
    const maxCost = Math.max(...sortedUniformatSummary.map(g => g.totalRepairCost + g.totalReplacementCost));
    const chartBarH = 8;
    const labelW = 48;
    const chartW = contentWidth - labelW - 30;
    const chartColors: [number, number, number][] = [
      [31, 78, 161], [42, 100, 180], [55, 120, 195], [70, 140, 210],
      [90, 155, 220], [110, 170, 225], [135, 185, 230],
    ];

    for (let idx = 0; idx < sortedUniformatSummary.length; idx++) {
      const group = sortedUniformatSummary[idx];
      const totalCost = group.totalRepairCost + group.totalReplacementCost;
      const barW = maxCost > 0 ? (totalCost / maxCost) * chartW : 0;
      const barColor = chartColors[idx % chartColors.length];
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      // Full category name
      const fullLabel = `${group.groupCode} - ${UNIFORMAT_GROUPS[group.groupCode.charAt(0).toUpperCase()] || group.groupName}`;
      doc.text(fullLabel.substring(0, 30), margin, yPos + chartBarH / 2 + 1);
      
      doc.setFillColor(...barColor);
      doc.rect(margin + labelW, yPos, Math.max(barW, 1), chartBarH, 'F');
      
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(totalCost), margin + labelW + barW + 2, yPos + chartBarH / 2 + 1);
      yPos += chartBarH + 2;
    }
  }
  yPos += 4;

  // ---- Priority Distribution (horizontal bars) ----
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
    const chartBarH2 = 8;
    const labelW2 = 30;
    const chartW2 = contentWidth - labelW2 - 45;

    const priorityBarColors: Record<string, [number, number, number]> = {
      'Critical': colors.danger,
      'Necessary': colors.orange,
      'Recommended': colors.warning,
      'Routine': colors.success,
    };

    for (const p of mergedChartEntries) {
      const bw = maxPriorityCount > 0 ? (p.count / maxPriorityCount) * chartW2 : 0;
      const barColor = priorityBarColors[p.label] || colors.primary;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(p.label, margin, yPos + chartBarH2 / 2 + 1);
      doc.setFillColor(...barColor);
      doc.rect(margin + labelW2, yPos, Math.max(bw, 1), chartBarH2, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.count} items (${formatCurrency(p.totalCost)})`, margin + labelW2 + bw + 2, yPos + chartBarH2 / 2 + 1);
      yPos += chartBarH2 + 2;
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

  addParagraph(`This Building Condition Assessment (BCA) report presents the findings of a visual, non-invasive assessment of ${assetLabel}. The assessment evaluated ${validComponents.length} building components organized according to the UNIFORMAT II classification system (ASTM E1557). The Facility Condition Index (FCI) for ${isSingleAsset ? 'this building' : 'the portfolio'} is ${formatPercentage(fciValue, 2)}, indicating a \u201C${data.summary.portfolioFCIRating}\u201D overall condition.`);

  addParagraph(`The total Current Replacement Value (CRV) is ${formatCurrency(data.summary.totalCurrentReplacementValue)}, with a total Deferred Maintenance backlog of ${formatCurrency(data.summary.totalDeferredMaintenanceCost)}, representing a funding gap of ${formatCurrency(data.summary.fundingGap)}.`);

  // Top cost drivers
  const sortedByRepairCost = [...validComponents].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));
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
      headStyles: tableHeadStyle,
      bodyStyles: tableBodyStyle,
      alternateRowStyles: tableAlternateStyle,
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 18 }, 2: { cellWidth: 60 },
        3: { cellWidth: 22, halign: 'center' }, 4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable?.finalY + 6 || yPos + 40;
  }

  // Highest-risk items
  const highPriorityComponents = validComponents.filter(c => ['critical', 'high', 'immediate', 'necessary'].includes(c.priority?.toLowerCase()));
  if (highPriorityComponents.length > 0) {
    checkPageBreak(30);
    addSectionTitle('Highest-Risk Items', 2);
    const highRiskCost = highPriorityComponents.reduce((s, c) => s + (c.totalCost || 0), 0);
    addParagraph(`${highPriorityComponents.length} component(s) have been identified as Critical or Necessary priority, representing ${formatCurrency(highRiskCost)} in remediation costs. These items should be addressed within the near term.`);
  }

  checkPageBreak(30);
  addSectionTitle('Key Planning Assumptions', 2);
  addParagraph(`Cost estimates are based on current market conditions and do not include escalation factors, design fees, or contingencies unless otherwise noted. The capital renewal forecast distributes costs based on assigned priority levels: critical items are scheduled immediately, necessary items in years 1\u20135, and recommended items in years 6\u201310. All costs are expressed in current Canadian dollars.`);

  // ============================================
  // 12. OBSERVATIONS AND RECOMMENDATIONS
  // ============================================
  doc.addPage();
  currentPage++;
  addHeader();
  addSectionTitle('Observations and Recommendations', 1);
  addTocEntry('Observations and Recommendations');

  addParagraph('The following section provides a summary of key observations and recommendations identified during the building condition assessment.');

  // Group ALL valid components by UNIFORMAT category for observations
  const observationGroups = new Map<string, EnhancedComponentData[]>();
  for (const c of validComponents) {
    const obs = stripHtmlTags(c.observations);
    const rec = stripHtmlTags(c.recommendations);
    if (obs || rec) {
      const groupKey = c.uniformatCode.charAt(0).toUpperCase();
      if (!observationGroups.has(groupKey)) observationGroups.set(groupKey, []);
      observationGroups.get(groupKey)!.push(c);
    }
  }

  const sortedObsGroups = Array.from(observationGroups.entries())
    .sort((a, b) => 'ABCDEFG'.indexOf(a[0]) - 'ABCDEFG'.indexOf(b[0]));

  for (const [groupKey, components] of sortedObsGroups) {
    const groupName = UNIFORMAT_GROUPS_UPPER[groupKey] || groupKey;
    checkPageBreak(25);
    addSectionTitle(`${groupKey} - ${groupName}`, 2);

    for (const c of components.slice(0, 10)) {
      checkPageBreak(20);
      // Component name with condition badge
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.text);
      doc.text(`${c.uniformatCode} - ${c.componentName}`, margin + 2, yPos);
      
      const condColor = getConditionColor(c.condition);
      const condText = capitalize(c.condition);
      const condX = margin + contentWidth - 22;
      doc.setFillColor(...condColor);
      doc.roundedRect(condX, yPos - 3.5, 22, 5, 1, 1, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(condText, condX + 11, yPos, { align: 'center' });
      yPos += 5;

      const obs = stripHtmlTags(c.observations);
      if (obs) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...colors.secondary);
        doc.text('Observation:', margin + 4, yPos);
        yPos += 3.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const obsLines = doc.splitTextToSize(obs, contentWidth - 8);
        for (let i = 0; i < Math.min(obsLines.length, 4); i++) {
          checkPageBreak(4);
          doc.text(obsLines[i], margin + 4, yPos);
          yPos += 3.5;
        }
        if (obsLines.length > 4) {
          doc.setTextColor(...colors.secondary);
          doc.setFontSize(7);
          doc.text('(continued in component assessment)', margin + 4, yPos);
          yPos += 3.5;
        }
      }

      const rec = stripHtmlTags(c.recommendations);
      if (rec) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(22, 120, 50);
        doc.text('Recommendation:', margin + 4, yPos);
        yPos += 3.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const recLines = doc.splitTextToSize(rec, contentWidth - 8);
        for (let i = 0; i < Math.min(recLines.length, 4); i++) {
          checkPageBreak(4);
          doc.text(recLines[i], margin + 4, yPos);
          yPos += 3.5;
        }
        if (recLines.length > 4) {
          doc.setTextColor(...colors.secondary);
          doc.setFontSize(7);
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
        ['Short-Term Needs (1\u20133 yr)', formatCurrency(asset.shortTermNeeds)],
        ['Medium-Term Needs (3\u20137 yr)', formatCurrency(asset.mediumTermNeeds)],
        ['Long-Term Needs (7+ yr)', formatCurrency(asset.longTermNeeds)],
      ];
      autoTable(doc, {
        startY: yPos,
        body: detailPairs.map(([label, value]) => [label, value]),
        theme: 'plain',
        bodyStyles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
        columnStyles: {
          0: { cellWidth: 52, fontStyle: 'bold', textColor: colors.textLight },
          1: { cellWidth: contentWidth - 52, textColor: colors.text }
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: tableAlternateStyle,
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
        headStyles: tableHeadStyle,
        bodyStyles: tableBodyStyle,
        alternateRowStyles: tableAlternateStyle,
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

  if (config.includeComponentAssessments && validComponents.length > 0) {
    doc.addPage();
    currentPage++;
    addHeader();
    addSectionTitle('Component Assessments', 1);
    addTocEntry('Component Assessments');

    const groupedComponents = new Map<string, EnhancedComponentData[]>();
    for (const component of validComponents) {
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
    const totalComponentsCount = validComponents.length;

    for (const [groupKey, components] of sortedGroups) {
      const groupLetter = groupKey.charAt(0).toUpperCase();
      if (!'ABCDEFG'.includes(groupLetter)) continue; // Skip non-standard groups
      const groupName = UNIFORMAT_GROUPS_UPPER[groupLetter] || groupKey;
      
      checkPageBreak(30);
      // Group header bar
      doc.setFillColor(...colors.primary);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${groupLetter} - ${groupName}`, margin + 4, yPos + 5);
      yPos += 11;

      for (const component of components) {
        componentIndex++;
        const progress = 50 + (componentIndex / totalComponentsCount) * 30;
        onProgress?.(`Processing component ${componentIndex}/${totalComponentsCount}...`, progress);

        checkPageBreak(55);

        // Component header with condition badge
        doc.setFillColor(...colors.lightGray);
        doc.rect(margin, yPos, contentWidth, 7, 'F');
        doc.setTextColor(...colors.text);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${component.uniformatCode} - ${component.componentName}`, margin + 3, yPos + 5);
        
        const condColor = getConditionColor(component.condition);
        const condBadgeX = margin + contentWidth - 25;
        doc.setFillColor(...condColor);
        doc.roundedRect(condBadgeX, yPos + 1, 23, 5, 1, 1, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(capitalize(component.condition), condBadgeX + 11.5, yPos + 4.5, { align: 'center' });
        yPos += 10;

        // Two-column metadata layout
        const leftColX = margin;
        const rightColX = margin + contentWidth / 2;
        doc.setFontSize(8);
        doc.setTextColor(...colors.text);

        let leftY = yPos;
        const addMetaField = (x: number, y: number, label: string, value: string, valueColor?: [number, number, number]): number => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.textLight);
          doc.text(label, x, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...(valueColor || colors.text));
          doc.text(value.substring(0, 35), x + 30, y);
          return y + 5;
        };

        leftY = addMetaField(leftColX, leftY, 'Location:', component.componentLocation || 'N/A');
        leftY = addMetaField(leftColX, leftY, 'Condition:', 
          `${capitalize(component.condition)}${component.conditionPercentage ? ` (${component.conditionPercentage}%)` : ''}`,
          condColor);
        leftY = addMetaField(leftColX, leftY, 'Remaining Life:', component.remainingUsefulLife !== null ? `${component.remainingUsefulLife} years` : 'N/A');
        leftY = addMetaField(leftColX, leftY, 'Service Life:', component.estimatedServiceLife !== null ? `${component.estimatedServiceLife} years` : 'N/A');

        let rightY = yPos;
        if (config.showCostFields) {
          rightY = addMetaField(rightColX, rightY, 'Repair Cost:', formatCurrency(component.repairCost));
          rightY = addMetaField(rightColX, rightY, 'Replacement:', formatCurrency(component.replacementCost));
        }
        rightY = addMetaField(rightColX, rightY, 'Action Type:', formatActionType(component.actionType));
        rightY = addMetaField(rightColX, rightY, 'Action Year:', component.actionYear?.toString() || 'N/A');
        rightY = addMetaField(rightColX, rightY, 'Priority:', getPriorityLabel(component.priority));

        yPos = Math.max(leftY, rightY) + 2;

        // Observations
        const cleanObservations = stripHtmlTags(component.observations);
        if (cleanObservations) {
          checkPageBreak(18);
          doc.setFillColor(245, 247, 252);
          doc.rect(margin, yPos - 1, contentWidth, 4.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(...colors.primary);
          doc.text('OBSERVATIONS:', margin + 3, yPos + 2);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...colors.text);
          const obsLines = doc.splitTextToSize(cleanObservations, contentWidth - 6);
          for (let i = 0; i < Math.min(obsLines.length, 6); i++) {
            checkPageBreak(4);
            doc.text(obsLines[i], margin + 3, yPos);
            yPos += 3.5;
          }
          yPos += 2;
        }

        // Recommendations
        const cleanRecommendations = stripHtmlTags(component.recommendations);
        if (cleanRecommendations) {
          checkPageBreak(18);
          doc.setFillColor(240, 250, 244);
          doc.rect(margin, yPos - 1, contentWidth, 4.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(22, 120, 50);
          doc.text('RECOMMENDATIONS:', margin + 3, yPos + 2);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...colors.text);
          const recLines = doc.splitTextToSize(cleanRecommendations, contentWidth - 6);
          for (let i = 0; i < Math.min(recLines.length, 6); i++) {
            checkPageBreak(4);
            doc.text(recLines[i], margin + 3, yPos);
            yPos += 3.5;
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
            checkPageBreak(42);
            const photoWidth = 38;
            const photoHeight = 28;
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
                  doc.setFontSize(5.5);
                  doc.setTextColor(...colors.secondary);
                  doc.text(photoData.caption.substring(0, 35), photoX + photoWidth / 2, photoY2 + photoHeight + 3, { align: 'center' });
                }
              } catch (e) {
                console.error('Failed to add image to PDF:', e);
              }
            }
            const photoRows = Math.ceil(dedupedPhotos.length / 4);
            yPos += photoRows * (photoHeight + 10);
          }
        }

        yPos += 4;
        // Subtle separator between components
        doc.setDrawColor(...colors.mediumGray);
        doc.setLineWidth(0.2);
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

    // Filter out test/invalid action items
    const validActions = data.actionList.filter(a => {
      const firstChar = (a.uniformatCode || '').charAt(0).toUpperCase();
      return 'ABCDEFG'.includes(firstChar);
    });

    const getActionScope = (action: ActionListItem): string => {
      const cleanDesc = stripHtmlTags(action.description);
      if (cleanDesc && cleanDesc.length > 5) {
        return cleanDesc.substring(0, 45) + (cleanDesc.length > 45 ? '...' : '');
      }
      return action.actionName.substring(0, 40);
    };

    const actionTableData = validActions.slice(0, 50).map(action => [
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
      headStyles: tableHeadStyle,
      bodyStyles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, textColor: colors.text },
      alternateRowStyles: tableAlternateStyle,
      columnStyles: {
        0: { cellWidth: 15 }, 1: { cellWidth: 48 }, 2: { cellWidth: 14 },
        3: { cellWidth: 25 }, 4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }, 6: { cellWidth: 25 }
      },
      margin: { left: margin, right: margin }
    });

    if (validActions.length > 50) {
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 100;
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.secondary);
      doc.text(`Showing 50 of ${validActions.length} actions.`, margin, finalY + 5);
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
      headStyles: tableHeadStyle,
      bodyStyles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, textColor: colors.text },
      alternateRowStyles: tableAlternateStyle,
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
      UNIFORMAT_GROUPS[group.groupCode.charAt(0).toUpperCase()] || group.groupName.substring(0, 30),
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
      headStyles: tableHeadStyle,
      bodyStyles: tableBodyStyle,
      alternateRowStyles: tableAlternateStyle,
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 50 }, 2: { halign: 'center' },
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
      headStyles: { ...tableHeadStyle, fontSize: 9.5 },
      bodyStyles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: colors.text },
      alternateRowStyles: tableAlternateStyle,
      columnStyles: {
        0: { cellWidth: 55 }, 1: { halign: 'center' },
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
    yPos = finalY + 8;
    
    if (yPos < pageHeight - 40) {
      addParagraph(`This priority matrix summarizes ${totalCount} assessed components with a total estimated remediation cost of ${formatCurrency(totalCostSum)}. Items are categorized by urgency to support capital planning and budget allocation.`);
    }
  }

  // ============================================
  // FILL TABLE OF CONTENTS (go back to TOC page)
  // ============================================
  doc.setPage(tocPageNumber);
  let tocY = 16;
  
  // TOC Header
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 10, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BUILDING CONDITION ASSESSMENT REPORT', margin, 7);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(config.projectName, pageWidth - margin, 7, { align: 'right' });

  tocY = 24;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Table of Contents', margin, tocY);
  tocY += 3;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.6);
  doc.line(margin, tocY, margin + contentWidth, tocY);
  tocY += 8;

  for (const entry of tocEntries) {
    if (tocY > pageHeight - 20) break;
    
    doc.setFontSize(entry.level === 1 ? 9.5 : 8.5);
    doc.setFont('helvetica', entry.level === 1 ? 'bold' : 'normal');
    doc.setTextColor(...(entry.level === 1 ? colors.text : colors.textLight));
    
    const indent = entry.level === 1 ? 0 : 8;
    const title = entry.title.substring(0, 65);
    doc.text(title, margin + indent, tocY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(entry.pageNumber.toString(), pageWidth - margin, tocY, { align: 'right' });
    
    // Dotted leader
    const titleWidth = doc.getTextWidth(title);
    const pageNumWidth = doc.getTextWidth(entry.pageNumber.toString());
    const dotsStart = margin + indent + titleWidth + 3;
    const dotsEnd = pageWidth - margin - pageNumWidth - 3;
    if (dotsEnd > dotsStart + 5) {
      doc.setFontSize(7);
      doc.setTextColor(...colors.mediumGray);
      let dotX = dotsStart;
      while (dotX < dotsEnd) {
        doc.text('.', dotX, tocY);
        dotX += 2;
      }
    }
    
    tocY += entry.level === 1 ? 6.5 : 5;
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
  pages += 1; // Dashboard (single page)
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
