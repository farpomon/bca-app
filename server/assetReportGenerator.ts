import jsPDF from "jspdf";
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

  // Cost Summary Page
  if (data.deficiencies.length > 0) {
    doc.addPage();
    addMabenHeader();
    yPos = 25;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Cost Summary", 10, yPos);
    yPos += 10;

    const costByPriority: Record<string, number> = {
      immediate: 0,
      short_term: 0,
      medium_term: 0,
      long_term: 0,
    };

    data.deficiencies.forEach(d => {
      const priority = d.priority || 'long_term';
      costByPriority[priority] += d.estimatedCost || 0;
    });

    const priorityLabels: Record<string, string> = {
      immediate: "Immediate (0-1 year)",
      short_term: "Short Term (1-2 years)",
      medium_term: "Medium Term (2-5 years)",
      long_term: "Long Term (5+ years)",
    };

    const costRows = Object.entries(costByPriority).map(([priority, cost]) => [
      priorityLabels[priority],
      `$${cost.toLocaleString()}`,
    ]);

    costRows.push([
      "Total",
      `$${totalCost.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Priority", "Estimated Cost"]],
      body: costRows,
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: "bold" },
        1: { cellWidth: 60 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === costRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = HEADER_GRAY;
        }
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
