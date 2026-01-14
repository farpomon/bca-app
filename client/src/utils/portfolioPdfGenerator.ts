/**
 * Portfolio Report PDF Generator
 * 
 * Generates professional PDF documents for stakeholder presentations
 * using jsPDF and jspdf-autotable
 */

import { default as jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types matching the portfolio report data structure
interface AssetMetric {
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
}

interface CategoryBreakdown {
  category: string;
  categoryCode: string;
  totalRepairCost: number;
  totalReplacementValue: number;
  assessmentCount: number;
  averageCondition: number;
  fci: number;
}

interface PriorityMatrixItem {
  assetName: string;
  componentName: string;
  description: string;
  estimatedCost: number;
}

interface PriorityMatrix {
  priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  count: number;
  totalCost: number;
  percentageOfTotal: number;
  items: PriorityMatrixItem[];
}

interface CapitalForecast {
  year: number;
  immediateNeeds: number;
  shortTermNeeds: number;
  mediumTermNeeds: number;
  longTermNeeds: number;
  totalProjectedCost: number;
  cumulativeCost: number;
}

interface PortfolioSummary {
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
}

interface BudgetAllocation {
  availableBudget: number;
  fundingGap: number;
  allocations: {
    priority: string;
    allocated: number;
    required: number;
    coverage: number;
  }[];
  recommendations: string[];
}

export interface PortfolioReportData {
  project: {
    id: number;
    name: string;
    address: string | null;
    clientName: string | null;
    status: string;
    createdAt: string;
  };
  summary: PortfolioSummary;
  assetMetrics: AssetMetric[];
  categoryBreakdown: CategoryBreakdown[];
  priorityMatrix: PriorityMatrix[];
  capitalForecast: CapitalForecast[];
  generatedAt: string;
  budgetAllocation?: BudgetAllocation;
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Format percentage
const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Get priority label
const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'immediate': return 'Immediate (0-1 year)';
    case 'short_term': return 'Short Term (1-3 years)';
    case 'medium_term': return 'Medium Term (3-5 years)';
    case 'long_term': return 'Long Term (5+ years)';
    default: return priority;
  }
};

// Colors for the PDF
const colors = {
  primary: [26, 86, 219] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
};

// Get FCI color
const getFCIColor = (fci: number): [number, number, number] => {
  if (fci <= 5) return colors.success;
  if (fci <= 10) return colors.warning;
  if (fci <= 30) return [249, 115, 22];
  return colors.danger;
};

export function generatePortfolioPDF(data: PortfolioReportData): void {
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

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number): void => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      addHeader();
    }
  };

  // Add header to each page
  const addHeader = (): void => {
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PORTFOLIO CONDITION ASSESSMENT REPORT', margin, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(data.project.name, pageWidth - margin, 8, { align: 'right' });
    yPos = 20;
  };

  // Add footer to each page
  const addFooter = (): void => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...colors.secondary);
      doc.text(
        `Generated: ${new Date(data.generatedAt).toLocaleDateString('en-CA')} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }
  };

  // ============================================
  // COVER PAGE
  // ============================================
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Condition', pageWidth / 2, 35, { align: 'center' });
  doc.text('Assessment Report', pageWidth / 2, 48, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(data.project.name, pageWidth / 2, 65, { align: 'center' });

  // Project details box
  yPos = 95;
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(margin, yPos, contentWidth, 50, 3, 3, 'F');
  
  doc.setTextColor(...colors.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Information', margin + 5, yPos + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const projectDetails = [
    ['Client:', data.project.clientName || 'N/A'],
    ['Address:', data.project.address || 'N/A'],
    ['Status:', data.project.status.charAt(0).toUpperCase() + data.project.status.slice(1)],
    ['Report Date:', new Date(data.generatedAt).toLocaleDateString('en-CA', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })]
  ];
  
  let detailY = yPos + 20;
  projectDetails.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 5, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, detailY);
    detailY += 7;
  });

  // Key metrics summary
  yPos = 160;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Executive Summary', margin, yPos);
  
  yPos += 10;
  const summaryMetrics = [
    { label: 'Total Assets', value: data.summary.totalAssets.toString() },
    { label: 'Portfolio FCI', value: formatPercentage(data.summary.portfolioFCI, 2), color: getFCIColor(data.summary.portfolioFCI) },
    { label: 'Condition Rating', value: data.summary.portfolioFCIRating },
    { label: 'Total CRV', value: formatCurrency(data.summary.totalCurrentReplacementValue) },
    { label: 'Deferred Maintenance', value: formatCurrency(data.summary.totalDeferredMaintenanceCost) },
    { label: 'Funding Gap', value: formatCurrency(data.summary.fundingGap) },
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

  // ============================================
  // ASSET SUMMARY PAGE
  // ============================================
  doc.addPage();
  addHeader();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Asset Portfolio Overview', margin, yPos);
  yPos += 10;

  // Asset metrics table
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
      textColor: [255, 255, 255],
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

  // ============================================
  // PRIORITY MATRIX PAGE
  // ============================================
  doc.addPage();
  addHeader();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('Priority Matrix & Capital Planning', margin, yPos);
  yPos += 10;

  // Priority summary table
  const priorityTableData = data.priorityMatrix.map(p => [
    getPriorityLabel(p.priority),
    p.count.toString(),
    formatCurrency(p.totalCost),
    formatPercentage(p.percentageOfTotal)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Priority Level', 'Items', 'Total Cost', '% of Total']],
    body: priorityTableData,
    theme: 'striped',
    headStyles: {
      fillColor: colors.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // ============================================
  // BUDGET ALLOCATION PAGE (if available)
  // ============================================
  if (data.budgetAllocation) {
    doc.addPage();
    addHeader();
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('Budget Allocation Analysis', margin, yPos);
    yPos += 15;

    // Budget summary boxes
    const budgetMetrics = [
      { label: 'Available Budget', value: formatCurrency(data.budgetAllocation.availableBudget), color: colors.success },
      { label: 'Total Required', value: formatCurrency(data.summary.totalDeferredMaintenanceCost), color: colors.primary },
      { label: 'Funding Gap', value: formatCurrency(data.budgetAllocation.fundingGap), color: data.budgetAllocation.fundingGap > 0 ? colors.danger : colors.success }
    ];

    const budgetBoxWidth = (contentWidth - 10) / 3;
    budgetMetrics.forEach((metric, index) => {
      const x = margin + (index * (budgetBoxWidth + 5));
      
      doc.setFillColor(...colors.lightGray);
      doc.roundedRect(x, yPos, budgetBoxWidth, 30, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(...colors.secondary);
      doc.setFont('helvetica', 'normal');
      doc.text(metric.label, x + 5, yPos + 10);
      
      doc.setFontSize(16);
      doc.setTextColor(...metric.color);
      doc.setFont('helvetica', 'bold');
      doc.text(metric.value, x + 5, yPos + 23);
    });

    yPos += 45;

    // Budget allocation table
    if (data.budgetAllocation.allocations.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.text);
      doc.text('Budget Coverage by Priority', margin, yPos);
      yPos += 8;

      const allocationData = data.budgetAllocation.allocations.map(a => [
        getPriorityLabel(a.priority),
        formatCurrency(a.required),
        formatCurrency(a.allocated),
        formatPercentage(a.coverage)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Priority', 'Required', 'Allocated', 'Coverage']],
        body: allocationData,
        theme: 'striped',
        headStyles: {
          fillColor: colors.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      });
    }
  }

  // ============================================
  // CAPITAL FORECAST PAGE
  // ============================================
  doc.addPage();
  addHeader();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('5-Year Capital Renewal Forecast', margin, yPos);
  yPos += 10;

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
      textColor: [255, 255, 255],
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

  // ============================================
  // CATEGORY BREAKDOWN PAGE
  // ============================================
  if (data.categoryBreakdown.length > 0) {
    doc.addPage();
    addHeader();
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('UNIFORMAT II Category Breakdown', margin, yPos);
    yPos += 10;

    const categoryTableData = data.categoryBreakdown.map(cat => [
      cat.categoryCode,
      cat.category.substring(0, 30) + (cat.category.length > 30 ? '...' : ''),
      cat.assessmentCount.toString(),
      formatCurrency(cat.totalRepairCost),
      formatCurrency(cat.totalReplacementValue),
      formatPercentage(cat.fci, 1)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Code', 'Category', 'Assessments', 'Repair Cost', 'Replacement Value', 'FCI']],
      body: categoryTableData,
      theme: 'striped',
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
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

  // Save the PDF
  const fileName = `Portfolio_Report_${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
