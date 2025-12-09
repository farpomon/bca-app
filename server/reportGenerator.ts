import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Project, Assessment, Photo } from "../drizzle/schema";

interface ReportData {
  project: Project;
  assessments: (Assessment & { photos: Photo[] })[];
  fciData: {
    fci: number;
    rating: string;
    totalRepairCost: number;
    totalReplacementValue: number;
  };
  financialPlanning: {
    period: string;
    structure: number;
    enclosure: number;
    interior: number;
    mep: number;
    site: number;
  }[];
  conditionMatrix: {
    system: string;
    condition: string;
  }[];
}

// Maben brand colors
const MABEN_ORANGE: [number, number, number] = [255, 153, 51]; // RGB for Maben orange
const MABEN_NAVY: [number, number, number] = [25, 25, 112]; // RGB for Maben navy
const HEADER_GRAY: [number, number, number] = [240, 240, 240];

// Condition colors matching Maben report
const CONDITION_COLORS: Record<string, [number, number, number]> = {
  excellent: [76, 175, 80],    // Green
  good: [139, 195, 74],         // Light green
  fair: [255, 193, 7],          // Amber
  poor: [255, 152, 0],          // Orange
  critical: [244, 67, 54],      // Red
};

export async function generateBCAReport(data: ReportData): Promise<Buffer> {
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
    doc.text(data.project.address || "", 10, 295);
    doc.text(`Page ${pageNum} of ${totalPages}`, 190, 295, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  // Cover Page
  addMabenHeader();
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Building Condition Assessment", 105, 80, { align: "center" });
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  doc.text(data.project.name, 105, 100, { align: "center" });
  
  if (data.project.address) {
    doc.setFontSize(12);
    doc.text(data.project.address, 105, 115, { align: "center" });
  }
  
  doc.setFontSize(10);
  const reportDate = new Date().toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  doc.text(`Report Date: ${reportDate}`, 105, 135, { align: "center" });
  
  if (data.project.clientName) {
    doc.text(`Prepared for: ${data.project.clientName}`, 105, 145, { align: "center" });
  }

  // Dashboard Page
  doc.addPage();
  addMabenHeader();
  let yPos = 25;
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Dashboard", 10, yPos);
  yPos += 10;

  // FCI Section
  doc.setFontSize(14);
  doc.text("1.1 FCI - Facility Condition Index", 10, yPos);
  yPos += 10;

  // FCI Gauge (simplified text representation)
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const fciColor: [number, number, number] = data.fciData.fci < 5 ? [76, 175, 80] : 
                   data.fciData.fci < 10 ? [255, 193, 7] :
                   data.fciData.fci < 30 ? [255, 152, 0] : [244, 67, 54];
  doc.setTextColor(...fciColor);
  doc.text(`${data.fciData.fci.toFixed(2)}`, 105, yPos, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("FCI", 105, yPos + 7, { align: "center" });
  yPos += 15;

  // FCI Details Table
  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: [
      ["Replacement Value:", `$${data.fciData.totalReplacementValue.toLocaleString()}`],
      ["Action Cost - First 5 years:", `$${data.fciData.totalRepairCost.toLocaleString()}`],
      ["FCI Rating:", data.fciData.rating],
    ],
    theme: "plain",
    styles: { fontSize: 10 },
    headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "bold" },
      1: { cellWidth: 80 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // FCI Range Table
  autoTable(doc, {
    startY: yPos,
    head: [["FCI Range (%)", "Description"]],
    body: [
      ["0.0 – 1.0", "Newer or well-maintained buildings showing minimal wear. Only routine maintenance is needed."],
      ["1.0 – 2.5", "Some signs of wear; more frequent component and equipment repair required."],
      ["2.5 – 6.0", "Apparent and increasing deterioration; frequent component and equipment failures."],
      ["> 6.0", "Serious disrepair; frequent equipment failures, potential safety concerns, and risk of full replacement."],
    ],
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 150 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // FCI Formula
  doc.setFontSize(10);
  doc.text("FCI = (Action Cost (First 5 years) / Replacement Value) × 100", 105, yPos, { align: "center" });

  // Condition Matrix
  doc.addPage();
  addMabenHeader();
  yPos = 25;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1.2 Overall Component Condition Summary", 10, yPos);
  yPos += 10;

  const conditionMatrixRows = data.conditionMatrix.map(item => {
    const color = CONDITION_COLORS[item.condition.toLowerCase()] || [200, 200, 200];
    return [item.system, item.condition];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Component", "Condition"]],
    body: conditionMatrixRows,
    theme: "grid",
    styles: { fontSize: 11 },
    headStyles: { fillColor: HEADER_GRAY, textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const condition = data.cell.text[0]?.toLowerCase() || "";
        const color = CONDITION_COLORS[condition] || [200, 200, 200];
        data.cell.styles.fillColor = color;
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
  });

  // Financial Planning
  doc.addPage();
  addMabenHeader();
  yPos = 25;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1.3 Component Action per year x Cost", 10, yPos);
  yPos += 10;

  // Financial Planning Table
  const financialRows = data.financialPlanning.map(period => [
    period.period,
    `$${period.structure.toLocaleString()}`,
    `$${period.enclosure.toLocaleString()}`,
    `$${period.interior.toLocaleString()}`,
    `$${period.mep.toLocaleString()}`,
    `$${period.site.toLocaleString()}`,
  ]);

  // Calculate totals
  const totals = data.financialPlanning.reduce((acc, period) => ({
    structure: acc.structure + period.structure,
    enclosure: acc.enclosure + period.enclosure,
    interior: acc.interior + period.interior,
    mep: acc.mep + period.mep,
    site: acc.site + period.site,
  }), { structure: 0, enclosure: 0, interior: 0, mep: 0, site: 0 });

  const grandTotal = totals.structure + totals.enclosure + totals.interior + totals.mep + totals.site;

  financialRows.push([
    "SubTotal",
    `$${totals.structure.toLocaleString()}`,
    `$${totals.enclosure.toLocaleString()}`,
    `$${totals.interior.toLocaleString()}`,
    `$${totals.mep.toLocaleString()}`,
    `$${totals.site.toLocaleString()}`,
  ]);

  financialRows.push([
    "Total",
    "",
    "",
    "",
    "",
    `$${grandTotal.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Component", "Structure", "Bld Enclosure", "Interior", "Mech / Elect", "Site Improvements"]],
    body: financialRows,
    theme: "grid",
    styles: { fontSize: 9, halign: "right" },
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: [255, 255, 255], 
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 35, halign: "left" },
      1: { cellWidth: 25, fillColor: [52, 152, 219], textColor: [255, 255, 255] },
      2: { cellWidth: 30, fillColor: [230, 126, 34], textColor: [255, 255, 255] },
      3: { cellWidth: 25, fillColor: [46, 125, 50], textColor: [255, 255, 255] },
      4: { cellWidth: 30, fillColor: [0, 188, 212], textColor: [255, 255, 255] },
      5: { cellWidth: 35, fillColor: [156, 39, 176], textColor: [255, 255, 255] },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const rowText = data.row.cells[0]?.text[0] || "";
        if (rowText === "SubTotal" || rowText === "Total") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Component Group Definitions
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Component Group Definitions", 10, yPos);
  yPos += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const definitions = [
    "• Structure – Foundations, slabs-on-grade, and major load-bearing framing (wood, concrete, steel).",
    "• Building Enclosure – Exterior walls, windows, exterior doors, roofs, and related waterproofing/cladding systems.",
    "• Interior – Interior partitions, doors, wall and ceiling finishes, floor coverings, interior stairs, and millwork.",
    "• Mechanical and Electrical Services – Plumbing, HVAC, fire protection, electrical services and distribution systems.",
    "• Site Improvements – Walkways, ramps, railings, landscaping, and similar site elements immediately serving the building.",
  ];

  definitions.forEach(def => {
    doc.text(def, 10, yPos, { maxWidth: 190 });
    yPos += 5;
  });

  // Building Components Inventory
  doc.addPage();
  addMabenHeader();
  yPos = 25;
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("3) Building Components Inventory", 10, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const inventoryText = `The review was completed on ${reportDate}, and included a comprehensive assessment of all major building systems and components. The areas reviewed are considered generally representative of the building's overall condition.`;
  doc.text(inventoryText, 10, yPos, { maxWidth: 190 });
  yPos += 20;

  // Group assessments by UNIFORMAT Level 1 (first letter of component code)
  const groupedAssessments: Record<string, (Assessment & { photos: Photo[] })[]> = {};
  data.assessments.forEach(assessment => {
    const level1 = assessment.componentCode?.charAt(0) || "Other";
    if (!groupedAssessments[level1]) {
      groupedAssessments[level1] = [];
    }
    groupedAssessments[level1].push(assessment);
  });

  const uniformatNames: Record<string, string> = {
    A: "SUBSTRUCTURE",
    B: "BUILDING ENCLOSURE",
    C: "INTERIORS",
    D: "SERVICES (MEP)",
    E: "EQUIPMENT & FURNISHINGS",
    F: "SPECIAL CONSTRUCTION",
    G: "BUILDING SITEWORK",
  };

  // Generate component sections
  const sortedKeys = Object.keys(groupedAssessments).sort();
  for (let sectionIndex = 0; sectionIndex < sortedKeys.length; sectionIndex++) {
    const level1 = sortedKeys[sectionIndex];
    if (sectionIndex > 0) {
      doc.addPage();
      addMabenHeader();
      yPos = 25;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const sectionNumber = sectionIndex + 5; // Start from section 5
    doc.text(`${sectionNumber}) ${uniformatNames[level1] || level1}`, 10, yPos);
    yPos += 10;

    for (const assessment of groupedAssessments[level1]) {
      // Check if we need a new page
      if (yPos > 240) {
        doc.addPage();
        addMabenHeader();
        yPos = 25;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${assessment.componentCode}`, 10, yPos);
      yPos += 7;

      // Observations
      if (assessment.observations) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(assessment.observations, 10, yPos, { maxWidth: 190 });
        yPos += Math.ceil(assessment.observations.length / 100) * 5 + 5;
      }

      // Condition Table
      autoTable(doc, {
        startY: yPos,
        body: [
          ["Condition:", assessment.condition ? (assessment.condition.charAt(0).toUpperCase() + assessment.condition.slice(1)) : "Not Assessed", 
           "Estimated Service Life:", assessment.expectedUsefulLife ? `${assessment.expectedUsefulLife} years` : "N/A"],
          ["Review Year:", assessment.reviewYear?.toString() || "2025", 
           "Last Time Action:", assessment.lastTimeAction?.toString() || "N/A"],
        ],
        theme: "plain",
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: "bold" },
          1: { cellWidth: 45 },
          2: { cellWidth: 50, fontStyle: "bold" },
          3: { cellWidth: 45 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // Recommendations
      if (assessment.recommendations) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${assessment.componentCode}.1 – Action`, 10, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Action Description", 10, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        doc.text(assessment.recommendations, 10, yPos, { maxWidth: 190 });
        yPos += Math.ceil(assessment.recommendations.length / 100) * 5 + 5;

        // Action details table
        autoTable(doc, {
          startY: yPos,
          body: [
            ["Priority", assessment.actionYear ? "Recommended" : "No Action required"],
            ["Action Year", assessment.actionYear?.toString() || "N/A"],
            ["Current Cost", assessment.estimatedRepairCost ? `$${assessment.estimatedRepairCost.toLocaleString()}` : "N/A"],
          ],
          theme: "plain",
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 40, fontStyle: "bold" },
            1: { cellWidth: 60 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Add photos if available
      if (assessment.photos && assessment.photos.length > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Photos:", 10, yPos);
        yPos += 7;

        // Display photos in a grid (2 per row)
        const photoWidth = 85;
        const photoHeight = 60;
        let xPos = 10;
        let photosInRow = 0;

        for (const photo of assessment.photos.slice(0, 4)) { // Limit to 4 photos
          // Check if we need a new page
          if (yPos + photoHeight > 270) {
            doc.addPage();
            addMabenHeader();
            yPos = 25;
            xPos = 10;
            photosInRow = 0;
          }

          try {
            // Fetch image from S3 and convert to base64
            const response = await fetch(photo.url);
            if (!response.ok) throw new Error('Failed to fetch image');
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            
            // Determine image format from mime type or URL
            let format = 'JPEG';
            if (photo.url.toLowerCase().includes('.png')) {
              format = 'PNG';
            } else if (photo.url.toLowerCase().includes('.jpg') || photo.url.toLowerCase().includes('.jpeg')) {
              format = 'JPEG';
            }
            
            const dataUrl = `data:image/${format.toLowerCase()};base64,${base64}`;
            
            // Add photo to PDF using data URL
            doc.addImage(dataUrl, format, xPos, yPos, photoWidth, photoHeight);
            
            // Add caption if available
            if (photo.caption) {
              doc.setFontSize(8);
              doc.setFont("helvetica", "italic");
              doc.text(photo.caption, xPos, yPos + photoHeight + 4, { maxWidth: photoWidth });
            }
          } catch (error) {
            // If image fails to load, show placeholder text
            console.error('Failed to load photo:', photo.url, error);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("[Photo unavailable]", xPos + 20, yPos + 30);
          }

          photosInRow++;
          if (photosInRow === 2) {
            // Move to next row
            yPos += photoHeight + 10;
            xPos = 10;
            photosInRow = 0;
          } else {
            // Move to next column
            xPos += photoWidth + 10;
          }
        }

        // Adjust yPos if we ended mid-row
        if (photosInRow > 0) {
          yPos += photoHeight + 10;
        }
      }

      yPos += 5;
    }
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Return as buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}
