/**
 * Enhanced Portfolio Report PDF Generator
 * 
 * Generates professional PDF documents with:
 * - Component photos embedded inline
 * - UNIFORMAT grouping
 * - Action list tables
 * - B3NMA branding
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types for enhanced report data
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
  
  // Section toggles
  includeExecutiveSummary: boolean;
  includeAssetOverview: boolean;
  includeComponentAssessments: boolean;
  includeActionList: boolean;
  includeCapitalForecast: boolean;
  includePriorityMatrix: boolean;
  includeUniformatBreakdown: boolean;
  includePhotoAppendix: boolean;
  
  // Component assessment options
  componentGrouping: 'building_uniformat' | 'uniformat_building' | 'building_only' | 'uniformat_only';
  displayLevel: 'L2' | 'L3' | 'both';
  includePhotos: boolean;
  maxPhotosPerComponent: number;
  showCostFields: boolean;
  showActionDetails: boolean;
  includeRollups: boolean;
  
  // Action list options
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

// Colors for the PDF - B3NMA branding
const colors = {
  primary: [26, 86, 219] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// Format currency
const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Format percentage
const formatPercentage = (value: number | null, decimals: number = 1): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)}%`;
};

// Get condition color
const getConditionColor = (condition: string): [number, number, number] => {
  switch (condition?.toLowerCase()) {
    case 'good': return colors.success;
    case 'fair': return colors.warning;
    case 'poor': return [249, 115, 22];
    case 'failed': return colors.danger;
    default: return colors.secondary;
  }
};

// Get FCI color
const getFCIColor = (fci: number): [number, number, number] => {
  if (fci <= 5) return colors.success;
  if (fci <= 10) return colors.warning;
  if (fci <= 30) return [249, 115, 22];
  return colors.danger;
};

// Priority labels
const getPriorityLabel = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'critical': return 'Critical (0-5 years)';
    case 'necessary': return 'Necessary (6-10 years)';
    case 'recommended': return 'Recommended (11-20 years)';
    case 'no_action': return 'No Action Required';
    case 'immediate': return 'Immediate (0-1 year)';
    case 'short_term': return 'Short Term (1-3 years)';
    case 'medium_term': return 'Medium Term (3-5 years)';
    case 'long_term': return 'Long Term (5+ years)';
    default: return priority || 'N/A';
  }
};

// UNIFORMAT group names
const UNIFORMAT_GROUPS: Record<string, string> = {
  'A': 'SUBSTRUCTURE',
  'B': 'SHELL',
  'C': 'INTERIORS',
  'D': 'SERVICES',
  'E': 'EQUIPMENT & FURNISHINGS',
  'F': 'SPECIAL CONSTRUCTION',
  'G': 'BUILDING SITEWORK',
};

/**
 * Load image from URL and convert to base64 for PDF embedding
 */
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

/**
 * Pre-load all component photos for PDF generation
 */
async function preloadPhotos(
  components: EnhancedComponentData[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<number, string[]>> {
  const photoMap = new Map<number, string[]>();
  const allPhotos: Array<{ componentId: number; url: string }> = [];
  
  // Collect all photo URLs
  for (const component of components) {
    for (const photo of component.photos) {
      allPhotos.push({ componentId: component.id, url: photo.url });
    }
  }
  
  // Load photos in parallel with progress tracking
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

/**
 * Generate enhanced PDF report with photo embedding
 */
export async function generateEnhancedPDF(
  data: EnhancedReportData,
  onProgress?: (stage: string, progress: number) => void
): Promise<void> {
  const { config } = data;
  
  onProgress?.('Initializing PDF...', 0);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;
  let currentPage = 1;
  
  // Pre-load photos if needed
  let photoMap = new Map<number, string[]>();
  if (config.includePhotos && config.includeComponentAssessments) {
    onProgress?.('Loading photos...', 10);
    photoMap = await preloadPhotos(data.components, (loaded, total) => {
      const progress = 10 + (loaded / total) * 20;
      onProgress?.(`Loading photos (${loaded}/${total})...`, progress);
    });
  }
  
  onProgress?.('Generating PDF pages...', 30);

  // Helper: Check page break
  const checkPageBreak = (requiredSpace: number): void => {
    if (yPos + requiredSpace > pageHeight - margin - 10) {
      doc.addPage();
      currentPage++;
      yPos = margin;
      addHeader();
    }
  };

  // Helper: Add header to each page
  const addHeader = (): void => {
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BUILDING CONDITION ASSESSMENT REPORT', margin, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(config.projectName, pageWidth - margin, 8, { align: 'right' });
    yPos = 20;
  };

  // Helper: Add footer to all pages
  const addFooter = (): void => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...colors.secondary);
      
      // B3NMA branding in footer
      doc.text('B3NMA - Building Condition Assessment System', margin, pageHeight - 8);
      doc.text(
        `${config.clientName || ''} | Page ${i} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    }
  };

  // Helper: Add section title
  const addSectionTitle = (title: string): void => {
    checkPageBreak(20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(title, margin, yPos);
    yPos += 10;
  };

  // ============================================
  // COVER PAGE
  // ============================================
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Building Condition', pageWidth / 2, 35, { align: 'center' });
  doc.text('Assessment Report', pageWidth / 2, 48, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(config.reportTitle || config.projectName, pageWidth / 2, 65, { align: 'center' });

  // Project details box
  yPos = 95;
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(margin, yPos, contentWidth, 60, 3, 3, 'F');
  
  doc.setTextColor(...colors.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Information', margin + 5, yPos + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const projectDetails = [
    ['Prepared For:', config.preparedFor || config.clientName || 'N/A'],
    ['Prepared By:', config.preparedBy || 'B3NMA'],
    ['Client Address:', config.clientAddress || 'N/A'],
    ['Report Date:', config.reportDate || new Date().toLocaleDateString('en-CA', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })],
    ['Total Assets:', data.summary.totalAssets.toString()],
  ];
  
  let detailY = yPos + 20;
  projectDetails.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 5, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(value.substring(0, 60), margin + 45, detailY);
    detailY += 8;
  });

  // Key metrics summary on cover page
  yPos = 170;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Executive Summary', margin, yPos);
  
  yPos += 10;
  const summaryMetrics = [
    { label: 'Portfolio FCI', value: formatPercentage(data.summary.portfolioFCI, 2), color: getFCIColor(data.summary.portfolioFCI) },
    { label: 'Condition Rating', value: data.summary.portfolioFCIRating },
    { label: 'Total CRV', value: formatCurrency(data.summary.totalCurrentReplacementValue) },
    { label: 'Deferred Maintenance', value: formatCurrency(data.summary.totalDeferredMaintenanceCost) },
    { label: 'Funding Gap', value: formatCurrency(data.summary.fundingGap) },
    { label: 'Total Assessments', value: data.summary.totalAssessments.toString() },
  ];

  const metricBoxWidth = (contentWidth - 10) / 3;
  const metricBoxHeight = 25;
  
  summaryMetrics.forEach((metric, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = margin + (col * (metricBoxWidth + 5));
    const y = yPos + (row * (metricBoxHeight + 5));
    
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(x, y, metricBoxWidth, metricBoxHeight, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(...colors.secondary);
    doc.setFont('helvetica', 'normal');
    doc.text(metric.label, x + 3, y + 8);
    
    doc.setFontSize(14);
    if (metric.color) {
      doc.setTextColor(...metric.color);
    } else {
      doc.setTextColor(...colors.text);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, x + 3, y + 19);
  });

  onProgress?.('Generating asset overview...', 40);

  // ============================================
  // ASSET OVERVIEW PAGE
  // ============================================
  if (config.includeAssetOverview && data.assetMetrics.length > 0) {
    doc.addPage();
    addHeader();
    addSectionTitle('Asset Portfolio Overview');

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
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'center' }
      },
      margin: { left: margin, right: margin }
    });
  }

  onProgress?.('Generating component assessments...', 50);

  // ============================================
  // COMPONENT ASSESSMENTS WITH PHOTOS
  // ============================================
  if (config.includeComponentAssessments && data.components.length > 0) {
    doc.addPage();
    addHeader();
    addSectionTitle('Component Assessments');

    // Group components by UNIFORMAT Level 1
    const groupedComponents = new Map<string, EnhancedComponentData[]>();
    for (const component of data.components) {
      const groupKey = component.uniformatLevel1 || 'OTHER';
      const existing = groupedComponents.get(groupKey) || [];
      existing.push(component);
      groupedComponents.set(groupKey, existing);
    }

    // Sort groups by UNIFORMAT order
    const sortedGroups = Array.from(groupedComponents.entries()).sort((a, b) => {
      const orderA = 'ABCDEFG'.indexOf(a[0]);
      const orderB = 'ABCDEFG'.indexOf(b[0]);
      return orderA - orderB;
    });

    let componentIndex = 0;
    const totalComponents = data.components.length;

    for (const [groupCode, components] of sortedGroups) {
      const groupName = UNIFORMAT_GROUPS[groupCode] || 'OTHER';
      
      // Group header
      checkPageBreak(30);
      doc.setFillColor(...colors.primary);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${groupCode} - ${groupName}`, margin + 3, yPos + 6);
      yPos += 12;

      // Components in this group
      for (const component of components) {
        componentIndex++;
        const progress = 50 + (componentIndex / totalComponents) * 30;
        onProgress?.(`Processing component ${componentIndex}/${totalComponents}...`, progress);

        checkPageBreak(60);

        // Component header
        doc.setFillColor(...colors.lightGray);
        doc.rect(margin, yPos, contentWidth, 7, 'F');
        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${component.uniformatCode} - ${component.componentName}`, margin + 2, yPos + 5);
        yPos += 10;

        // Component details in two columns
        const leftColX = margin;
        const rightColX = margin + contentWidth / 2;
        const detailFontSize = 8;
        
        doc.setFontSize(detailFontSize);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);

        // Left column
        let leftY = yPos;
        doc.setFont('helvetica', 'bold');
        doc.text('Asset:', leftColX, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text(component.assetName.substring(0, 35), leftColX + 20, leftY);
        leftY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Location:', leftColX, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text((component.componentLocation || 'N/A').substring(0, 35), leftColX + 20, leftY);
        leftY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Condition:', leftColX, leftY);
        doc.setTextColor(...getConditionColor(component.condition));
        doc.setFont('helvetica', 'bold');
        doc.text(component.condition || 'N/A', leftColX + 20, leftY);
        doc.setTextColor(...colors.text);
        doc.setFont('helvetica', 'normal');
        leftY += 5;

        // Right column
        let rightY = yPos;
        if (config.showCostFields) {
          doc.setFont('helvetica', 'bold');
          doc.text('Repair Cost:', rightColX, rightY);
          doc.setFont('helvetica', 'normal');
          doc.text(formatCurrency(component.repairCost), rightColX + 25, rightY);
          rightY += 5;

          doc.setFont('helvetica', 'bold');
          doc.text('Replacement:', rightColX, rightY);
          doc.setFont('helvetica', 'normal');
          doc.text(formatCurrency(component.replacementCost), rightColX + 25, rightY);
          rightY += 5;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Action Year:', rightColX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(component.actionYear?.toString() || 'N/A', rightColX + 25, rightY);
        rightY += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Priority:', rightColX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(getPriorityLabel(component.priority), rightColX + 25, rightY);

        yPos = Math.max(leftY, rightY) + 3;

        // Action details
        if (config.showActionDetails && (component.actionDescription || component.recommendations)) {
          checkPageBreak(20);
          
          if (component.actionDescription) {
            doc.setFont('helvetica', 'bold');
            doc.text('Action:', margin, yPos);
            doc.setFont('helvetica', 'normal');
            const actionLines = doc.splitTextToSize(component.actionDescription, contentWidth - 20);
            doc.text(actionLines.slice(0, 2), margin + 15, yPos);
            yPos += actionLines.slice(0, 2).length * 4 + 2;
          }

          if (component.recommendations) {
            doc.setFont('helvetica', 'bold');
            doc.text('Notes:', margin, yPos);
            doc.setFont('helvetica', 'normal');
            const recLines = doc.splitTextToSize(component.recommendations, contentWidth - 15);
            doc.text(recLines.slice(0, 2), margin + 15, yPos);
            yPos += recLines.slice(0, 2).length * 4 + 2;
          }
        }

        // Photos
        if (config.includePhotos && component.photos.length > 0) {
          const photos = photoMap.get(component.id) || [];
          if (photos.length > 0) {
            checkPageBreak(45);
            
            const photoWidth = 40;
            const photoHeight = 30;
            const photosPerRow = Math.min(photos.length, 4);
            const photoSpacing = (contentWidth - (photosPerRow * photoWidth)) / (photosPerRow + 1);
            
            for (let i = 0; i < Math.min(photos.length, config.maxPhotosPerComponent); i++) {
              const row = Math.floor(i / 4);
              const col = i % 4;
              const photoX = margin + photoSpacing + (col * (photoWidth + photoSpacing));
              const photoY = yPos + (row * (photoHeight + 8));
              
              try {
                doc.addImage(photos[i], 'JPEG', photoX, photoY, photoWidth, photoHeight);
                
                // Photo caption
                const photoData = component.photos[i];
                if (photoData?.caption) {
                  doc.setFontSize(6);
                  doc.setTextColor(...colors.secondary);
                  const captionText = photoData.caption.substring(0, 25);
                  doc.text(captionText, photoX + photoWidth / 2, photoY + photoHeight + 3, { align: 'center' });
                }
              } catch (e) {
                // Skip failed images
                console.error('Failed to add image to PDF:', e);
              }
            }
            
            const photoRows = Math.ceil(Math.min(photos.length, config.maxPhotosPerComponent) / 4);
            yPos += photoRows * (photoHeight + 10);
          }
        }

        yPos += 5;

        // Separator line
        doc.setDrawColor(...colors.lightGray);
        doc.line(margin, yPos, margin + contentWidth, yPos);
        yPos += 5;
      }
    }
  }

  onProgress?.('Generating action list...', 85);

  // ============================================
  // ACTION LIST TABLE
  // ============================================
  if (config.includeActionList && data.actionList.length > 0) {
    doc.addPage();
    addHeader();
    addSectionTitle('Action List Summary');

    const actionTableData = data.actionList.slice(0, 50).map(action => [
      action.itemId,
      action.actionName.substring(0, 30),
      action.assetName.substring(0, 20),
      action.uniformatCode,
      action.actionYear?.toString() || '-',
      formatCurrency(action.actionCost),
      action.priority.substring(0, 10)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Action', 'Asset', 'Code', 'Year', 'Cost', 'Priority']],
      body: actionTableData,
      theme: 'striped',
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 20 }
      },
      margin: { left: margin, right: margin }
    });

    if (data.actionList.length > 50) {
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 100;
      doc.setFontSize(8);
      doc.setTextColor(...colors.secondary);
      doc.text(`Showing 50 of ${data.actionList.length} actions. See full action list in appendix.`, margin, finalY + 5);
    }
  }

  onProgress?.('Generating capital forecast...', 90);

  // ============================================
  // CAPITAL FORECAST
  // ============================================
  if (config.includeCapitalForecast && data.capitalForecast.length > 0) {
    doc.addPage();
    addHeader();
    addSectionTitle('5-Year Capital Renewal Forecast');

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
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });
  }

  onProgress?.('Finalizing PDF...', 95);

  // ============================================
  // UNIFORMAT BREAKDOWN
  // ============================================
  if (config.includeUniformatBreakdown && data.uniformatSummary.length > 0) {
    doc.addPage();
    addHeader();
    addSectionTitle('UNIFORMAT II Category Breakdown');

    const uniformatTableData = data.uniformatSummary.map(group => [
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
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 50 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });
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
  
  if (config.includeCapitalForecast) {
    pages += 1;
  }
  
  if (config.includeUniformatBreakdown) {
    pages += 1;
  }
  
  if (config.includePriorityMatrix) {
    pages += 1;
  }
  
  return pages;
}
