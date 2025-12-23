import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Asset, Assessment, Deficiency, Photo } from "../drizzle/schema";

interface AssetReportData {
  asset: Asset;
  projectName: string;
  assessments: (Assessment & { photos: Photo[] })[];
  deficiencies: Deficiency[];
}

// Maben brand colors
const MABEN_ORANGE: [number, number, number] = [255, 153, 51];
const MABEN_NAVY: [number, number, number] = [25, 25, 112];
const HEADER_GRAY: [number, number, number] = [240, 240, 240];

// Condition colors
const CONDITION_COLORS: Record<string, [number, number, number]> = {
  excellent: [76, 175, 80],
  good: [139, 195, 74],
  fair: [255, 193, 7],
  poor: [255, 152, 0],
  critical: [244, 67, 54],
  not_assessed: [158, 158, 158],
};

export async function generateAssetReport(data: AssetReportData): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Helper to add Maben header to each page
  const addMabenHeader = () => {
    doc.setFillColor(...MABEN_ORANGE);
    doc.rect(0, 0, 210, 15, "F");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("MABEN", 10, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("CONSULTING", 35, 10);
    doc.setTextColor(0, 0, 0);
  };

  // Helper to add page footer
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`www.mabenconsulting.ca`, 10, 290);
    doc.text(`tfaria@mabenconsulting.ca`, 80, 290);
    doc.text(`+1 604-802-9184`, 160, 290);
    doc.text(data.asset.address || data.asset.streetAddress || "", 10, 295);
    doc.text(`Page ${pageNum}`, 190, 295, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  // Cover Page
  addMabenHeader();
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Asset Condition Report", 105, 80, { align: "center" });
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  doc.text(data.asset.name, 105, 100, { align: "center" });
  
  if (data.asset.address || data.asset.streetAddress) {
    doc.setFontSize(12);
    const address = data.asset.address || 
      [data.asset.streetNumber, data.asset.streetAddress, data.asset.unitNumber, data.asset.city, data.asset.province, data.asset.postalCode]
        .filter(Boolean)
        .join(" ");
    doc.text(address, 105, 115, { align: "center" });
  }
  
  doc.setFontSize(10);
  const reportDate = new Date().toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  doc.text(`Report Date: ${reportDate}`, 105, 135, { align: "center" });
  doc.text(`Project: ${data.projectName}`, 105, 145, { align: "center" });
  if (data.asset.uniqueId) {
    doc.text(`Asset ID: ${data.asset.uniqueId}`, 105, 155, { align: "center" });
  }

  // Asset Overview Page
  doc.addPage();
  addMabenHeader();
  let yPos = 25;
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Asset Overview", 10, yPos);
  yPos += 10;

  // Asset Details Table
  const assetDetails: string[][] = [
    ["Asset Name:", data.asset.name],
    ["Status:", data.asset.status.charAt(0).toUpperCase() + data.asset.status.slice(1)],
    ["Type:", data.asset.assetType || "N/A"],
  ];

  if (data.asset.yearBuilt) {
    assetDetails.push(["Year Built:", data.asset.yearBuilt.toString()]);
  }
  if (data.asset.grossFloorArea) {
    assetDetails.push(["Gross Floor Area:", `${data.asset.grossFloorArea.toLocaleString()} sq ft`]);
  }
  if (data.asset.description) {
    assetDetails.push(["Description:", data.asset.description]);
  }

  autoTable(doc, {
    startY: yPos,
    body: assetDetails,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 120 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Summary Statistics
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Assessment Summary", 10, yPos);
  yPos += 10;

  const totalAssessments = data.assessments.length;
  const totalDeficiencies = data.deficiencies.length;
  const criticalDeficiencies = data.deficiencies.filter(d => d.severity === 'critical').length;
  const totalCost = data.deficiencies.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

  const summaryStats: string[][] = [
    ["Total Assessments:", totalAssessments.toString()],
    ["Total Deficiencies:", totalDeficiencies.toString()],
    ["Critical Deficiencies:", criticalDeficiencies.toString()],
    ["Total Estimated Cost:", `$${totalCost.toLocaleString()}`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: summaryStats,
    theme: "plain",
    styles: { fontSize: 10 },
    headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "bold" },
      1: { cellWidth: 80 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Condition Distribution
  if (data.assessments.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Condition Distribution", 10, yPos);
    yPos += 10;

    const conditionCounts: Record<string, number> = {};
    data.assessments.forEach(a => {
      const condition = a.condition || 'not_assessed';
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });

    const conditionRows = Object.entries(conditionCounts).map(([condition, count]) => [
      condition.charAt(0).toUpperCase() + condition.slice(1).replace('_', ' '),
      count.toString(),
      `${((count / totalAssessments) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Condition", "Count", "Percentage"]],
      body: conditionRows,
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Assessments Details
  if (data.assessments.length > 0) {
    doc.addPage();
    addMabenHeader();
    yPos = 25;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Assessment Details", 10, yPos);
    yPos += 10;

    const assessmentRows = data.assessments.map(a => [
      a.componentName || "N/A",
      (a.condition || 'not_assessed').charAt(0).toUpperCase() + (a.condition || 'not_assessed').slice(1).replace('_', ' '),
      a.observations || "N/A",
      a.recommendations || "N/A",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Component", "Condition", "Observations", "Recommendations"]],
      body: assessmentRows,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 60 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const condition = data.cell.text[0]?.toLowerCase().replace(' ', '_') || 'not_assessed';
          const color = CONDITION_COLORS[condition] || CONDITION_COLORS.not_assessed;
          data.cell.styles.fillColor = color;
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
    });
  }

  // Deficiencies Details
  if (data.deficiencies.length > 0) {
    doc.addPage();
    addMabenHeader();
    yPos = 25;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Deficiencies", 10, yPos);
    yPos += 10;

    // Group by priority
    const deficienciesByPriority: Record<string, Deficiency[]> = {
      immediate: [],
      short_term: [],
      medium_term: [],
      long_term: [],
    };

    data.deficiencies.forEach(d => {
      const priority = d.priority || 'long_term';
      if (deficienciesByPriority[priority]) {
        deficienciesByPriority[priority].push(d);
      }
    });

    const priorityLabels: Record<string, string> = {
      immediate: "Immediate (0-1 year)",
      short_term: "Short Term (1-2 years)",
      medium_term: "Medium Term (2-5 years)",
      long_term: "Long Term (5+ years)",
    };

    Object.entries(deficienciesByPriority).forEach(([priority, deficiencies]) => {
      if (deficiencies.length === 0) return;

      if (yPos > 250) {
        doc.addPage();
        addMabenHeader();
        yPos = 25;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(priorityLabels[priority], 10, yPos);
      yPos += 7;

      const defRows = deficiencies.map(d => [
        d.title || "Untitled",
        d.description || "N/A",
        d.severity || "N/A",
        d.estimatedCost ? `$${d.estimatedCost.toLocaleString()}` : "N/A",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Title", "Description", "Severity", "Cost"]],
        body: defRows,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 80 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // Financial KPIs Page
  doc.addPage();
  addMabenHeader();
  yPos = 25;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Financial KPIs & Cost Analysis", 10, yPos);
  yPos += 15;

  // Calculate financial metrics
  const costByPriority: Record<string, number> = {
    immediate: 0,
    short_term: 0,
    medium_term: 0,
    long_term: 0,
  };

  const costBySeverity: Record<string, number> = {
    critical: 0,
    major: 0,
    moderate: 0,
    minor: 0,
  };

  data.deficiencies.forEach(d => {
    const priority = d.priority || 'long_term';
    const severity = d.severity || 'minor';
    costByPriority[priority] += d.estimatedCost || 0;
    costBySeverity[severity] += d.estimatedCost || 0;
  });

  // Current Replacement Value (CRV) - estimate based on gross floor area
  const estimatedCRV = data.asset.grossFloorArea ? data.asset.grossFloorArea * 350 : totalCost * 10; // $350/sq ft average or 10x deferred maintenance
  
  // Facility Condition Index (FCI) = Deferred Maintenance / CRV
  const fci = estimatedCRV > 0 ? (totalCost / estimatedCRV) * 100 : 0;
  const fciRating = fci <= 5 ? "Good" : fci <= 10 ? "Fair" : fci <= 30 ? "Poor" : "Critical";

  // Key Financial Metrics Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Key Financial Metrics", 10, yPos);
  yPos += 8;

  const keyMetrics: string[][] = [
    ["Total Deferred Maintenance", `$${totalCost.toLocaleString()}`],
    ["Estimated Current Replacement Value (CRV)", `$${estimatedCRV.toLocaleString()}`],
    ["Facility Condition Index (FCI)", `${fci.toFixed(2)}%`],
    ["FCI Rating", fciRating],
    ["Average Cost per Deficiency", totalDeficiencies > 0 ? `$${Math.round(totalCost / totalDeficiencies).toLocaleString()}` : "N/A"],
  ];

  if (data.asset.grossFloorArea) {
    keyMetrics.push(["Cost per Square Foot", `$${(totalCost / data.asset.grossFloorArea).toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: yPos,
    body: keyMetrics,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold" },
      1: { cellWidth: 70 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Cost by Priority Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cost by Priority", 10, yPos);
  yPos += 8;

  const priorityLabels: Record<string, string> = {
    immediate: "Immediate (0-1 year)",
    short_term: "Short Term (1-2 years)",
    medium_term: "Medium Term (2-5 years)",
    long_term: "Long Term (5+ years)",
  };

  const costByPriorityRows = Object.entries(costByPriority).map(([priority, cost]) => [
    priorityLabels[priority],
    `$${cost.toLocaleString()}`,
    totalCost > 0 ? `${((cost / totalCost) * 100).toFixed(1)}%` : "0%",
  ]);

  costByPriorityRows.push([
    "Total Deferred Maintenance",
    `$${totalCost.toLocaleString()}`,
    "100%",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Priority", "Estimated Cost", "% of Total"]],
    body: costByPriorityRows,
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === costByPriorityRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = HEADER_GRAY;
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Cost by Severity Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cost by Severity", 10, yPos);
  yPos += 8;

  const severityLabels: Record<string, string> = {
    critical: "Critical",
    major: "Major",
    moderate: "Moderate",
    minor: "Minor",
  };

  const costBySeverityRows = Object.entries(costBySeverity).map(([severity, cost]) => [
    severityLabels[severity] || severity,
    `$${cost.toLocaleString()}`,
    totalCost > 0 ? `${((cost / totalCost) * 100).toFixed(1)}%` : "0%",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Severity", "Estimated Cost", "% of Total"]],
    body: costBySeverityRows,
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Budget Projection Section (5-Year)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("5-Year Budget Projection", 10, yPos);
  yPos += 8;

  const currentYear = new Date().getFullYear();
  const budgetProjection: string[][] = [
    [`Year 1 (${currentYear})`, `$${costByPriority.immediate.toLocaleString()}`, "Immediate priorities"],
    [`Year 2 (${currentYear + 1})`, `$${Math.round(costByPriority.short_term * 0.5).toLocaleString()}`, "Short-term (50%)"],
    [`Year 3 (${currentYear + 2})`, `$${Math.round(costByPriority.short_term * 0.5).toLocaleString()}`, "Short-term (50%)"],
    [`Year 4 (${currentYear + 3})`, `$${Math.round(costByPriority.medium_term * 0.33).toLocaleString()}`, "Medium-term (33%)"],
    [`Year 5 (${currentYear + 4})`, `$${Math.round(costByPriority.medium_term * 0.33).toLocaleString()}`, "Medium-term (33%)"],
  ];

  const fiveYearTotal = costByPriority.immediate + costByPriority.short_term + Math.round(costByPriority.medium_term * 0.66);
  budgetProjection.push(["5-Year Total", `$${fiveYearTotal.toLocaleString()}`, "Projected capital needs"]);

  autoTable(doc, {
    startY: yPos,
    head: [["Year", "Projected Cost", "Notes"]],
    body: budgetProjection,
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 50 },
      2: { cellWidth: 70 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === budgetProjection.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = HEADER_GRAY;
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // FCI Interpretation Guide
  if (yPos < 240) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FCI Rating Guide", 10, yPos);
    yPos += 8;

    const fciGuide: string[][] = [
      ["0% - 5%", "Good", "Asset in good condition, routine maintenance only"],
      ["5% - 10%", "Fair", "Some deferred maintenance, plan for repairs"],
      ["10% - 30%", "Poor", "Significant deferred maintenance, prioritize repairs"],
      [">30%", "Critical", "Major investment needed, consider replacement"],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [["FCI Range", "Rating", "Interpretation"]],
      body: fciGuide,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 105 },
      },
    });
  }

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) { // Skip footer on cover page
      addFooter(i, totalPages);
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
