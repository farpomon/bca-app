import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Asset, Assessment, Deficiency, Photo } from "../drizzle/schema";

interface AssetReportData {
  asset: Asset;
  projectName: string;
  assessments: (Assessment & { photos: Photo[] })[];
  deficiencies: Deficiency[];
}

// B³NMA brand colors
const B3NMA_TEAL: [number, number, number] = [64, 182, 176]; // Teal from logo
const B3NMA_NAVY: [number, number, number] = [44, 62, 80]; // Navy from logo
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

// Financial calculation helpers
function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cf, year) => {
    return npv + cf / Math.pow(1 + discountRate, year);
  }, 0);
}

function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 100;
  const tolerance = 0.0001;
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;
    
    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + rate, j);
      derivative -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
    }
    
    if (Math.abs(npv) < tolerance) break;
    if (derivative === 0) break;
    
    rate = rate - npv / derivative;
  }
  
  return isNaN(rate) || !isFinite(rate) ? 0 : rate;
}

function calculatePaybackPeriod(initialCost: number, annualSavings: number): number {
  if (annualSavings <= 0) return Infinity;
  return initialCost / annualSavings;
}

export async function generateAssetReport(data: AssetReportData): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Helper to add B³NMA header to each page
  const addB3NMAHeader = () => {
    try {
      doc.setFillColor(...B3NMA_NAVY);
      doc.rect(0, 0, 210, 15, "F");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("B³NMA", 10, 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Building Better Business through Needs and Maintenance Analysis", 40, 10);
      doc.setTextColor(0, 0, 0);
    } catch (error) {
      console.error("Error adding header:", error);
    }
  };

  // Helper to add page footer with client information
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(data.projectName || "", 10, 290);
    const clientAddress = data.asset.address || 
      [data.asset.streetNumber, data.asset.streetAddress, data.asset.city, data.asset.province, data.asset.postalCode]
        .filter(Boolean)
        .join(", ");
    if (clientAddress) {
      doc.text(clientAddress, 10, 295);
    }
    doc.text(`Page ${pageNum}`, 190, 295, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  // Cover Page
  addB3NMAHeader();
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

  // Calculate all financial metrics upfront
  const totalAssessments = data.assessments.length;
  const totalDeficiencies = data.deficiencies.length;
  const criticalDeficiencies = data.deficiencies.filter(d => d.severity === 'critical').length;
  
  // Calculate repair costs from assessments
  const totalRepairCost = data.assessments.reduce((sum, a) => sum + (a.estimatedRepairCost || a.repairCost || 0), 0);
  const deficiencyCost = data.deficiencies.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
  const totalDeferredMaintenance = totalRepairCost > 0 ? totalRepairCost : deficiencyCost;
  
  // Calculate replacement value from assessments
  const totalReplacementValue = data.assessments.reduce((sum, a) => sum + (a.replacementValue || a.replacementCost || 0), 0);
  
  // Estimate CRV if not available
  const estimatedCRV = totalReplacementValue > 0 
    ? totalReplacementValue 
    : (data.asset.grossFloorArea ? data.asset.grossFloorArea * 350 : totalDeferredMaintenance * 10);

  // Calculate FCI as decimal ratio (0-1 scale)
  const fci = estimatedCRV > 0 ? totalDeferredMaintenance / estimatedCRV : 0;
  const fciRating = fci <= 0.05 ? "Good" : fci <= 0.10 ? "Fair" : fci <= 0.30 ? "Poor" : "Critical";

  // Economic analysis calculations
  const discountRate = 0.05; // 5% industry standard
  const assetLifeExtension = 15; // years
  const annualOperationalSavings = totalDeferredMaintenance * 0.02;
  const avoidedReplacementCost = totalReplacementValue * 0.30;
  const annualBenefit = (avoidedReplacementCost / assetLifeExtension) + annualOperationalSavings;
  
  // Build cash flows for NPV/IRR
  const cashFlows = [-totalDeferredMaintenance];
  for (let i = 1; i <= assetLifeExtension; i++) {
    cashFlows.push(annualBenefit);
  }
  
  const npv = totalDeferredMaintenance > 0 ? calculateNPV(cashFlows, discountRate) : 0;
  const irr = totalDeferredMaintenance > 0 ? calculateIRR(cashFlows) : 0;
  const paybackPeriod = calculatePaybackPeriod(totalDeferredMaintenance, annualBenefit);
  const roi = totalDeferredMaintenance > 0 ? ((annualBenefit * assetLifeExtension - totalDeferredMaintenance) / totalDeferredMaintenance) * 100 : 0;

  // Cost by priority
  const costByPriority: Record<string, number> = {
    immediate: 0,
    short_term: 0,
    medium_term: 0,
    long_term: 0,
  };

  if (deficiencyCost > 0) {
    data.deficiencies.forEach(d => {
      const priority = d.priority || 'long_term';
      costByPriority[priority] += d.estimatedCost || 0;
    });
  } else if (totalDeferredMaintenance > 0) {
    data.assessments.forEach(a => {
      const repairCost = a.estimatedRepairCost || a.repairCost || 0;
      if (repairCost > 0) {
        const condition = a.condition || 'not_assessed';
        if (condition === 'poor') {
          costByPriority.immediate += repairCost;
        } else if (condition === 'fair') {
          costByPriority.short_term += repairCost;
        } else if (condition === 'good') {
          costByPriority.medium_term += repairCost;
        } else {
          costByPriority.long_term += repairCost;
        }
      }
    });
  }

  // Asset Overview Page
  doc.addPage();
  addB3NMAHeader();
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

  // Summary Statistics with Repair and Replacement Costs
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Assessment Summary", 10, yPos);
  yPos += 10;

  const summaryStats: string[][] = [
    ["Total Assessments:", totalAssessments.toString()],
    ["Total Deficiencies:", totalDeficiencies.toString()],
    ["Critical Deficiencies:", criticalDeficiencies.toString()],
    ["Total Repair Cost:", `$${totalDeferredMaintenance.toLocaleString()}`],
    ["Total Replacement Value:", `$${(totalReplacementValue || estimatedCRV).toLocaleString()}`],
    ["Facility Condition Index (FCI):", `${fci.toFixed(2)}% (${fciRating})`],
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

  // Assessments Details with Repair and Replacement Costs
  if (data.assessments.length > 0) {
    doc.addPage();
    addB3NMAHeader();
    yPos = 25;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Assessment Details", 10, yPos);
    yPos += 10;

    const assessmentRows = data.assessments.map(a => [
      a.componentName || "N/A",
      (a.condition || 'not_assessed').charAt(0).toUpperCase() + (a.condition || 'not_assessed').slice(1).replace('_', ' '),
      a.estimatedRepairCost || a.repairCost ? `$${(a.estimatedRepairCost || a.repairCost || 0).toLocaleString()}` : "N/A",
      a.replacementValue || a.replacementCost ? `$${(a.replacementValue || a.replacementCost || 0).toLocaleString()}` : "N/A",
      a.observations || "N/A",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Component", "Condition", "Repair Cost", "Replacement Value", "Observations"]],
      body: assessmentRows,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 72 },
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
    addB3NMAHeader();
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
        addB3NMAHeader();
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

  // ============================================
  // FINANCIAL METRICS SECTION (NEW DEDICATED PAGE)
  // ============================================
  doc.addPage();
  addB3NMAHeader();
  yPos = 25;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Analysis", 10, yPos);
  yPos += 15;

  // Economic Investment Analysis
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B3NMA_TEAL);
  doc.text("Investment Analysis", 10, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  const investmentMetrics: string[][] = [
    ["Net Present Value (NPV)", `$${npv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, npv >= 0 ? "Positive return expected" : "Review investment priorities"],
    ["Internal Rate of Return (IRR)", `${(irr * 100).toFixed(2)}%`, irr > 0.08 ? "Excellent return" : irr > 0.05 ? "Good return" : "Below target rate"],
    ["Simple Payback Period", paybackPeriod === Infinity ? "N/A" : `${paybackPeriod.toFixed(1)} years`, paybackPeriod <= 5 ? "Quick recovery" : paybackPeriod <= 10 ? "Moderate" : "Long-term"],
    ["Return on Investment (ROI)", `${roi.toFixed(1)}%`, `Over ${assetLifeExtension}-year period`],
    ["Discount Rate Used", `${(discountRate * 100).toFixed(1)}%`, "Industry standard (PWGSC)"],
    ["Analysis Period", `${assetLifeExtension} years`, "Expected asset life extension"],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value", "Interpretation"]],
    body: investmentMetrics,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: B3NMA_NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
      1: { cellWidth: 45 },
      2: { cellWidth: 85 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Cost Summary Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B3NMA_TEAL);
  doc.text("Cost Summary", 10, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  const costSummary: string[][] = [
    ["Total Repair Cost (Deferred Maintenance)", `$${totalDeferredMaintenance.toLocaleString()}`],
    ["Total Replacement Value", `$${(totalReplacementValue || estimatedCRV).toLocaleString()}`],
    ["Estimated Annual Savings", `$${annualBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Avoided Replacement Cost (30%)", `$${avoidedReplacementCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
  ];

  if (data.asset.grossFloorArea) {
    costSummary.push(["Cost per Square Foot", `$${(totalDeferredMaintenance / data.asset.grossFloorArea).toFixed(2)}`]);
    costSummary.push(["Replacement Value per Sq Ft", `$${((totalReplacementValue || estimatedCRV) / data.asset.grossFloorArea).toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: yPos,
    body: costSummary,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold" },
      1: { cellWidth: 70 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Facility Condition Index Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B3NMA_TEAL);
  doc.text("Facility Condition Index (FCI)", 10, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  const fciMetrics: string[][] = [
    ["Current FCI", `${fci.toFixed(2)}%`],
    ["FCI Rating", fciRating],
    ["Deferred Maintenance", `$${totalDeferredMaintenance.toLocaleString()}`],
    ["Current Replacement Value (CRV)", `$${(totalReplacementValue || estimatedCRV).toLocaleString()}`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: fciMetrics,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "bold" },
      1: { cellWidth: 70 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // FCI Rating Guide
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
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowIndex = data.row.index;
        const rating = fciGuide[rowIndex][1];
        if (rating === fciRating) {
          data.cell.styles.fillColor = B3NMA_TEAL;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ============================================
  // BUDGET PROJECTION PAGE
  // ============================================
  doc.addPage();
  addB3NMAHeader();
  yPos = 25;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Budget Projections & Capital Planning", 10, yPos);
  yPos += 15;

  // Cost by Priority Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B3NMA_TEAL);
  doc.text("Cost by Priority", 10, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  const priorityLabelsForTable: Record<string, string> = {
    immediate: "Immediate (0-1 year)",
    short_term: "Short Term (1-2 years)",
    medium_term: "Medium Term (2-5 years)",
    long_term: "Long Term (5+ years)",
  };

  const costByPriorityRows = Object.entries(costByPriority).map(([priority, cost]) => [
    priorityLabelsForTable[priority],
    `$${cost.toLocaleString()}`,
    totalDeferredMaintenance > 0 ? `${((cost / totalDeferredMaintenance) * 100).toFixed(1)}%` : "0%",
  ]);

  costByPriorityRows.push([
    "Total Deferred Maintenance",
    `$${totalDeferredMaintenance.toLocaleString()}`,
    "100%",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Priority", "Estimated Cost", "% of Total"]],
    body: costByPriorityRows,
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: B3NMA_NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
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

  // 5-Year Budget Projection
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B3NMA_TEAL);
  doc.text("5-Year Capital Budget Projection", 10, yPos);
  doc.setTextColor(0, 0, 0);
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
    headStyles: { fillColor: B3NMA_NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
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

  // Long-term Financial Outlook
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...B3NMA_TEAL);
  doc.text("Long-term Financial Outlook", 10, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  const longTermOutlook: string[][] = [
    ["Total Investment Required", `$${totalDeferredMaintenance.toLocaleString()}`],
    ["Projected Savings (${assetLifeExtension} years)", `$${(annualBenefit * assetLifeExtension).toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Net Benefit", `$${(annualBenefit * assetLifeExtension - totalDeferredMaintenance).toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Break-even Point", paybackPeriod === Infinity ? "N/A" : `Year ${Math.ceil(paybackPeriod)}`],
  ];

  autoTable(doc, {
    startY: yPos,
    body: longTermOutlook,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold" },
      1: { cellWidth: 70 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Methodology Note
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const methodologyNote = [
    "Note: Financial analysis uses industry-standard assumptions including 5% discount rate (PWGSC guideline),",
    "2% annual operational savings from repairs, and 30% avoided replacement costs. Actual returns may vary",
    "based on project specifics, market conditions, and implementation timing.",
  ];
  methodologyNote.forEach((line, i) => {
    doc.text(line, 10, yPos + (i * 5));
  });
  doc.setTextColor(0, 0, 0);

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) {
      addFooter(i, totalPages);
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
