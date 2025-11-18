import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Project, Assessment, Deficiency, Photo } from "../drizzle/schema";

interface ReportData {
  project: Project;
  assessments: Assessment[];
  deficiencies: Deficiency[];
  photos: Photo[];
  totalEstimatedCost: number;
}

export function generateBCAReport(data: ReportData): Buffer {
  const doc = new jsPDF();
  let yPos = 20;

  // Helper function to add page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > 280) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title Page
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Building Condition Assessment Report", 105, yPos, { align: "center" });
  yPos += 15;

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(data.project.name, 105, yPos, { align: "center" });
  yPos += 10;

  if (data.project.address) {
    doc.setFontSize(12);
    doc.text(data.project.address, 105, yPos, { align: "center" });
    yPos += 10;
  }

  doc.setFontSize(10);
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 105, yPos, { align: "center" });
  yPos += 20;

  // Executive Summary
  doc.addPage();
  yPos = 20;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const summaryData = [
    ["Total Components Assessed", data.assessments.length.toString()],
    ["Total Deficiencies Identified", data.deficiencies.length.toString()],
    ["Critical Issues", data.deficiencies.filter(d => d.severity === "critical").length.toString()],
    ["High Priority Issues", data.deficiencies.filter(d => d.severity === "high").length.toString()],
    ["Total Estimated Repair Cost", `$${(data.totalEstimatedCost / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Item", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Building Information
  checkPageBreak(60);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Building Information", 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const buildingData = [
    ["Client", data.project.clientName || "N/A"],
    ["Address", data.project.address || "N/A"],
    ["Property Type", data.project.propertyType || "N/A"],
    ["Construction Type", data.project.constructionType || "N/A"],
    ["Year Built", data.project.yearBuilt?.toString() || "N/A"],
    ["Number of Units", data.project.numberOfUnits?.toString() || "N/A"],
    ["Number of Stories", data.project.numberOfStories?.toString() || "N/A"],
    ["Building Code", data.project.buildingCode || "N/A"],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Property", "Details"]],
    body: buildingData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Assessment Summary by Condition
  checkPageBreak(60);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Assessment Summary", 20, yPos);
  yPos += 10;

  const conditionCounts = {
    good: data.assessments.filter(a => a.condition === "good").length,
    fair: data.assessments.filter(a => a.condition === "fair").length,
    poor: data.assessments.filter(a => a.condition === "poor").length,
    not_assessed: data.assessments.filter(a => a.condition === "not_assessed").length,
  };

  const conditionData = [
    ["Good Condition", conditionCounts.good.toString()],
    ["Fair Condition", conditionCounts.fair.toString()],
    ["Poor Condition", conditionCounts.poor.toString()],
    ["Not Assessed", conditionCounts.not_assessed.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Condition", "Count"]],
    body: conditionData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Deficiencies by Priority
  if (data.deficiencies.length > 0) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Deficiencies and Recommended Actions", 20, yPos);
    yPos += 10;

    // Group by priority
    const priorities = ["immediate", "short_term", "medium_term", "long_term"] as const;
    const priorityLabels = {
      immediate: "Immediate",
      short_term: "Short Term (1-2 years)",
      medium_term: "Medium Term (3-5 years)",
      long_term: "Long Term (5+ years)",
    };

    for (const priority of priorities) {
      const priorityDeficiencies = data.deficiencies.filter(d => d.priority === priority);
      
      if (priorityDeficiencies.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(priorityLabels[priority], 20, yPos);
        yPos += 8;

        const deficiencyRows = priorityDeficiencies.map(d => [
          d.componentCode,
          d.title,
          d.severity.toUpperCase(),
          d.estimatedCost ? `$${(d.estimatedCost / 100).toLocaleString("en-US")}` : "TBD",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Component", "Issue", "Severity", "Est. Cost"]],
          body: deficiencyRows,
          theme: "striped",
          headStyles: { fillColor: [41, 128, 185] },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 80 },
            2: { cellWidth: 25 },
            3: { cellWidth: 30 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;
      }
    }
  }

  // Cost Summary
  doc.addPage();
  yPos = 20;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Cost Summary", 20, yPos);
  yPos += 10;

  const costByPriority = {
    immediate: data.deficiencies
      .filter(d => d.priority === "immediate" && d.estimatedCost)
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
    short_term: data.deficiencies
      .filter(d => d.priority === "short_term" && d.estimatedCost)
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
    medium_term: data.deficiencies
      .filter(d => d.priority === "medium_term" && d.estimatedCost)
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
    long_term: data.deficiencies
      .filter(d => d.priority === "long_term" && d.estimatedCost)
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
  };

  const costData = [
    ["Immediate", `$${(costByPriority.immediate / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
    ["Short Term (1-2 years)", `$${(costByPriority.short_term / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
    ["Medium Term (3-5 years)", `$${(costByPriority.medium_term / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
    ["Long Term (5+ years)", `$${(costByPriority.long_term / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
    ["Total", `$${(data.totalEstimatedCost / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Priority", "Estimated Cost"]],
    body: costData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [52, 152, 219], fontStyle: "bold" },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
    doc.text(
      `Generated by BCA System - ${new Date().toLocaleDateString()}`,
      105,
      295,
      { align: "center" }
    );
  }

  // Return as buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}
