import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from "docx";
import { reportTemplates, reportSections, reportConfigurations } from "../../drizzle/schema";

type ReportTemplate = typeof reportTemplates.$inferSelect;
type ReportSection = typeof reportSections.$inferSelect;
type ReportConfiguration = typeof reportConfigurations.$inferSelect;
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportData {
  project: any;
  assessments?: any[];
  deficiencies?: any[];
  photos?: any[];
  riskAssessments?: any[];
  optimizationResults?: any[];
  prioritizationRankings?: any[];
  cashFlowProjections?: any[];
  facilitySummary?: any;
}

export interface GeneratedReport {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Report Generator Service
 * Generates customizable reports in multiple formats (PDF, Excel, Word, HTML)
 */
export class ReportGeneratorService {
  /**
   * Generate report in specified format
   */
  async generateReport(
    template: ReportTemplate,
    sections: ReportSection[],
    configuration: ReportConfiguration | null,
    data: ReportData,
    format: "pdf" | "excel" | "word" | "html"
  ): Promise<GeneratedReport> {
    const sortedSections = sections
      .filter(s => s.isEnabled)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    switch (format) {
      case "pdf":
        return this.generatePDF(template, sortedSections, configuration, data);
      case "excel":
        return this.generateExcel(template, sortedSections, configuration, data);
      case "word":
        return this.generateWord(template, sortedSections, configuration, data);
      case "html":
        return this.generateHTML(template, sortedSections, configuration, data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate PDF report
   */
  private async generatePDF(
    template: ReportTemplate,
    sections: ReportSection[],
    configuration: ReportConfiguration | null,
    data: ReportData
  ): Promise<GeneratedReport> {
    const doc = new jsPDF({
      orientation: (configuration?.pageOptions as any)?.orientation || "portrait",
      unit: "mm",
      format: (configuration?.pageOptions as any)?.size || "letter",
    });

    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = (configuration?.pageOptions as any)?.margins || { top: 20, right: 20, bottom: 20, left: 20 };

    // Cover page
    if ((configuration?.coverPageOptions as any)?.enabled) {
      doc.setFontSize(24);
      doc.text((configuration?.coverPageOptions as any)?.title || template.name, pageWidth / 2, 60, { align: "center" });
      
      if ((configuration?.coverPageOptions as any)?.subtitle) {
        doc.setFontSize(16);
        doc.text((configuration?.coverPageOptions as any)?.subtitle, pageWidth / 2, 80, { align: "center" });
      }
      
      if ((configuration?.coverPageOptions as any)?.includeProjectInfo) {
        doc.setFontSize(12);
        doc.text(`Project: ${data.project.name}`, pageWidth / 2, 100, { align: "center" });
        doc.text(`Address: ${data.project.address}`, pageWidth / 2, 110, { align: "center" });
      }
      
      if ((configuration?.coverPageOptions as any)?.includeDate) {
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 130, { align: "center" });
      }
      
      doc.addPage();
      yPosition = margins.top;
    }

    // Header
    if (configuration?.headerText) {
      doc.setFontSize(10);
      doc.text(configuration.headerText, margins.left, 10);
    }

    // Process sections
    for (const section of sections) {
      if ((section.layoutOptions as any)?.pageBreakBefore) {
        doc.addPage();
        yPosition = margins.top;
      }

      // Section title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(section.title || section.sectionType.replace(/_/g, " ").toUpperCase(), margins.left, yPosition);
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      // Render section content
      yPosition = await this.renderPDFSection(doc, section, data, yPosition, margins, pageWidth, pageHeight);

      if ((section.layoutOptions as any)?.pageBreakAfter) {
        doc.addPage();
        yPosition = margins.top;
      }
    }

    // Footer
    if (configuration?.footerText) {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text(configuration.footerText, margins.left, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margins.right - 20, pageHeight - 10);
      }
    }

    // Disclaimer
    if (configuration?.disclaimerText) {
      doc.addPage();
      doc.setFontSize(10);
      doc.text("Disclaimer", margins.left, margins.top);
      const disclaimerLines = doc.splitTextToSize(configuration.disclaimerText, pageWidth - margins.left - margins.right);
      doc.text(disclaimerLines, margins.left, margins.top + 10);
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const fileName = `${template.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;

    return {
      buffer: pdfBuffer,
      fileName,
      mimeType: "application/pdf",
      fileSize: pdfBuffer.length,
    };
  }

  /**
   * Render individual PDF section
   */
  private async renderPDFSection(
    doc: jsPDF,
    section: ReportSection,
    data: ReportData,
    yPosition: number,
    margins: any,
    pageWidth: number,
    pageHeight: number
  ): Promise<number> {
    const contentWidth = pageWidth - margins.left - margins.right;

    switch (section.sectionType) {
      case "executive_summary":
        if (data.facilitySummary) {
          doc.text(`Facility: ${data.project.name}`, margins.left, yPosition);
          yPosition += 7;
          doc.text(`Overall Condition: ${data.facilitySummary.condition.overallRating}`, margins.left, yPosition);
          yPosition += 7;
          doc.text(`Health Score: ${data.facilitySummary.condition.healthScore}/100`, margins.left, yPosition);
          yPosition += 7;
          doc.text(`FCI: ${data.facilitySummary.condition.fci}%`, margins.left, yPosition);
          yPosition += 10;
        }
        break;

      case "condition_summary":
        if (data.assessments && data.assessments.length > 0) {
          const conditionData = data.assessments.map(a => [
            a.componentName,
            a.conditionRating,
            `${a.remainingUsefulLife} years`,
            `$${a.estimatedRepairCost?.toLocaleString() || "0"}`,
          ]);

          (doc as any).autoTable({
            startY: yPosition,
            head: [["Component", "Condition", "Remaining Life", "Repair Cost"]],
            body: conditionData,
            margin: { left: margins.left, right: margins.right },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [66, 139, 202] },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }
        break;

      case "cost_tables":
        if (data.facilitySummary?.financial) {
          const costData = [
            ["Identified Costs", `$${data.facilitySummary.financial.identifiedCosts.toLocaleString()}`],
            ["Planned Costs", `$${data.facilitySummary.financial.plannedCosts.toLocaleString()}`],
            ["Executed Costs", `$${data.facilitySummary.financial.executedCosts.toLocaleString()}`],
            ["Total Costs", `$${data.facilitySummary.financial.totalCosts.toLocaleString()}`],
          ];

          (doc as any).autoTable({
            startY: yPosition,
            head: [["Cost Type", "Amount"]],
            body: costData,
            margin: { left: margins.left, right: margins.right },
            styles: { fontSize: 10 },
            headStyles: { fillColor: [92, 184, 92] },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }
        break;

      case "deficiencies_list":
        if (data.deficiencies && data.deficiencies.length > 0) {
          const defData = data.deficiencies.map(d => [
            d.description.substring(0, 50),
            d.priority,
            `$${d.estimatedCost?.toLocaleString() || "0"}`,
            d.urgency,
          ]);

          (doc as any).autoTable({
            startY: yPosition,
            head: [["Description", "Priority", "Cost", "Urgency"]],
            body: defData,
            margin: { left: margins.left, right: margins.right },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [217, 83, 79] },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }
        break;

      case "custom_text":
        if ((section.contentOptions as any)?.customText) {
          const textLines = doc.splitTextToSize((section.contentOptions as any).customText, contentWidth);
          doc.text(textLines, margins.left, yPosition);
          yPosition += textLines.length * 7 + 10;
        }
        break;

      default:
        doc.text(`[${section.sectionType} content]`, margins.left, yPosition);
        yPosition += 10;
    }

    return yPosition;
  }

  /**
   * Generate Excel report
   */
  private async generateExcel(
    template: ReportTemplate,
    sections: ReportSection[],
    configuration: ReportConfiguration | null,
    data: ReportData
  ): Promise<GeneratedReport> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BCA System";
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Property", key: "property", width: 30 },
      { header: "Value", key: "value", width: 50 },
    ];

    summarySheet.addRow({ property: "Project Name", value: data.project.name });
    summarySheet.addRow({ property: "Address", value: data.project.address });
    summarySheet.addRow({ property: "Report Generated", value: new Date().toLocaleString() });
    summarySheet.addRow({ property: "Template", value: template.name });

    // Process sections
    for (const section of sections) {
      await this.renderExcelSection(workbook, section, data);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${template.name.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;

    return {
      buffer: Buffer.from(buffer),
      fileName,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileSize: buffer.byteLength,
    };
  }

  /**
   * Render individual Excel section
   */
  private async renderExcelSection(
    workbook: ExcelJS.Workbook,
    section: ReportSection,
    data: ReportData
  ): Promise<void> {
    const sheetName = section.title || section.sectionType.replace(/_/g, " ");

    switch (section.sectionType) {
      case "condition_summary":
        if (data.assessments && data.assessments.length > 0) {
          const sheet = workbook.addWorksheet(sheetName);
          sheet.columns = [
            { header: "Component", key: "component", width: 30 },
            { header: "Location", key: "location", width: 25 },
            { header: "Condition", key: "condition", width: 15 },
            { header: "Remaining Life (years)", key: "remainingLife", width: 20 },
            { header: "Repair Cost", key: "repairCost", width: 15 },
          ];

          data.assessments.forEach(a => {
            sheet.addRow({
              component: a.componentName,
              location: a.location,
              condition: a.conditionRating,
              remainingLife: a.remainingUsefulLife,
              repairCost: a.estimatedRepairCost || 0,
            });
          });

          // Style header
          sheet.getRow(1).font = { bold: true };
          sheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF428BCA" },
          };
        }
        break;

      case "deficiencies_list":
        if (data.deficiencies && data.deficiencies.length > 0) {
          const sheet = workbook.addWorksheet(sheetName);
          sheet.columns = [
            { header: "Description", key: "description", width: 50 },
            { header: "Priority", key: "priority", width: 15 },
            { header: "Urgency", key: "urgency", width: 15 },
            { header: "Estimated Cost", key: "cost", width: 15 },
          ];

          data.deficiencies.forEach(d => {
            sheet.addRow({
              description: d.description,
              priority: d.priority,
              urgency: d.urgency,
              cost: d.estimatedCost || 0,
            });
          });

          sheet.getRow(1).font = { bold: true };
          sheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9534F" },
          };
        }
        break;

      case "cost_tables":
        if (data.facilitySummary?.financial) {
          const sheet = workbook.addWorksheet(sheetName);
          sheet.columns = [
            { header: "Cost Type", key: "type", width: 30 },
            { header: "Amount", key: "amount", width: 20 },
          ];

          sheet.addRow({ type: "Identified Costs", amount: data.facilitySummary.financial.identifiedCosts });
          sheet.addRow({ type: "Planned Costs", amount: data.facilitySummary.financial.plannedCosts });
          sheet.addRow({ type: "Executed Costs", amount: data.facilitySummary.financial.executedCosts });
          sheet.addRow({ type: "Total Costs", amount: data.facilitySummary.financial.totalCosts });

          sheet.getRow(1).font = { bold: true };
          sheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF5CB85C" },
          };
        }
        break;
    }
  }

  /**
   * Generate Word report
   */
  private async generateWord(
    template: ReportTemplate,
    sections: ReportSection[],
    configuration: ReportConfiguration | null,
    data: ReportData
  ): Promise<GeneratedReport> {
    const docSections: any[] = [];

    // Cover page
    if ((configuration?.coverPageOptions as any)?.enabled) {
      docSections.push({
        properties: {},
        children: [
          new Paragraph({
            text: (configuration?.coverPageOptions as any)?.title || template.name,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000, after: 400 },
          }),
          new Paragraph({
            text: (configuration?.coverPageOptions as any)?.subtitle || "",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: `Project: ${data.project.name}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: `Generated: ${new Date().toLocaleDateString()}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        ],
      });
    }

    // Process sections
    const sectionContent: Paragraph[] = [];
    for (const section of sections) {
      const content = await this.renderWordSection(section, data);
      sectionContent.push(...content);
    }

    docSections.push({
      properties: {},
      children: sectionContent,
    });

    const doc = new Document({
      sections: docSections,
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${template.name.replace(/\s+/g, "_")}_${Date.now()}.docx`;

    return {
      buffer,
      fileName,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: buffer.length,
    };
  }

  /**
   * Render individual Word section
   */
  private async renderWordSection(
    section: ReportSection,
    data: ReportData
  ): Promise<Paragraph[]> {
    const paragraphs: Paragraph[] = [];

    // Section title
    paragraphs.push(
      new Paragraph({
        text: section.title || section.sectionType.replace(/_/g, " ").toUpperCase(),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    switch (section.sectionType) {
      case "executive_summary":
        if (data.facilitySummary) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Facility: ", bold: true }),
                new TextRun(data.project.name),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Overall Condition: ", bold: true }),
                new TextRun(data.facilitySummary.condition.overallRating),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Health Score: ", bold: true }),
                new TextRun(`${data.facilitySummary.condition.healthScore}/100`),
              ],
              spacing: { after: 100 },
            })
          );
        }
        break;

      case "custom_text":
        if ((section.contentOptions as any)?.customText) {
          paragraphs.push(
            new Paragraph({
              text: (section.contentOptions as any).customText,
              spacing: { after: 200 },
            })
          );
        }
        break;

      default:
        paragraphs.push(
          new Paragraph({
            text: `[${section.sectionType} content will be rendered here]`,
            spacing: { after: 200 },
          })
        );
    }

    return paragraphs;
  }

  /**
   * Generate HTML report
   */
  private async generateHTML(
    template: ReportTemplate,
    sections: ReportSection[],
    configuration: ReportConfiguration | null,
    data: ReportData
  ): Promise<GeneratedReport> {
    const colorScheme = (configuration?.colorScheme as any) || {};
    const fontOptions = (configuration?.fontOptions as any) || {};

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
  <style>
    body {
      font-family: ${fontOptions.family || "Arial, sans-serif"};
      font-size: ${fontOptions.sizeBody || 11}pt;
      color: ${colorScheme.text || "#333"};
      background: ${colorScheme.background || "#fff"};
      margin: 0;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: ${fontOptions.sizeHeading || 24}pt;
      color: ${colorScheme.primary || "#428bca"};
      border-bottom: 2px solid ${colorScheme.primary || "#428bca"};
      padding-bottom: 10px;
    }
    h2 {
      font-size: ${fontOptions.sizeHeading ? fontOptions.sizeHeading * 0.8 : 18}pt;
      color: ${colorScheme.secondary || "#5cb85c"};
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: ${colorScheme.primary || "#428bca"};
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid #ddd;
      margin-bottom: 30px;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 1px solid #ddd;
      margin-top: 30px;
      font-size: 9pt;
      color: #666;
    }
    .cover-page {
      text-align: center;
      padding: 100px 0;
    }
    .cover-page h1 {
      font-size: 36pt;
      border: none;
    }
  </style>
</head>
<body>
`;

    // Cover page
    if ((configuration?.coverPageOptions as any)?.enabled) {
      html += `
  <div class="cover-page">
    <h1>${(configuration?.coverPageOptions as any)?.title || template.name}</h1>
    <p style="font-size: 18pt;">${(configuration?.coverPageOptions as any)?.subtitle || ""}</p>
    <p>Project: ${data.project.name}</p>
    <p>Address: ${data.project.address}</p>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>
  <div style="page-break-after: always;"></div>
`;
    }

    // Header
    if (configuration?.headerText) {
      html += `
  <div class="header">
    <p>${configuration.headerText}</p>
  </div>
`;
    }

    // Sections
    for (const section of sections) {
      html += await this.renderHTMLSection(section, data);
    }

    // Footer
    if (configuration?.footerText) {
      html += `
  <div class="footer">
    <p>${configuration.footerText}</p>
  </div>
`;
    }

    html += `
</body>
</html>
`;

    const buffer = Buffer.from(html, "utf-8");
    const fileName = `${template.name.replace(/\s+/g, "_")}_${Date.now()}.html`;

    return {
      buffer,
      fileName,
      mimeType: "text/html",
      fileSize: buffer.length,
    };
  }

  /**
   * Render individual HTML section
   */
  private async renderHTMLSection(
    section: ReportSection,
    data: ReportData
  ): Promise<string> {
    let html = `<h2>${section.title || section.sectionType.replace(/_/g, " ").toUpperCase()}</h2>`;

    switch (section.sectionType) {
      case "executive_summary":
        if (data.facilitySummary) {
          html += `
            <p><strong>Facility:</strong> ${data.project.name}</p>
            <p><strong>Overall Condition:</strong> ${data.facilitySummary.condition.overallRating}</p>
            <p><strong>Health Score:</strong> ${data.facilitySummary.condition.healthScore}/100</p>
            <p><strong>FCI:</strong> ${data.facilitySummary.condition.fci}%</p>
          `;
        }
        break;

      case "condition_summary":
        if (data.assessments && data.assessments.length > 0) {
          html += `
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Location</th>
                  <th>Condition</th>
                  <th>Remaining Life</th>
                  <th>Repair Cost</th>
                </tr>
              </thead>
              <tbody>
          `;
          data.assessments.forEach(a => {
            html += `
                <tr>
                  <td>${a.componentName}</td>
                  <td>${a.location}</td>
                  <td>${a.conditionRating}</td>
                  <td>${a.remainingUsefulLife} years</td>
                  <td>$${a.estimatedRepairCost?.toLocaleString() || "0"}</td>
                </tr>
            `;
          });
          html += `
              </tbody>
            </table>
          `;
        }
        break;

      case "deficiencies_list":
        if (data.deficiencies && data.deficiencies.length > 0) {
          html += `
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Urgency</th>
                  <th>Estimated Cost</th>
                </tr>
              </thead>
              <tbody>
          `;
          data.deficiencies.forEach(d => {
            html += `
                <tr>
                  <td>${d.description}</td>
                  <td>${d.priority}</td>
                  <td>${d.urgency}</td>
                  <td>$${d.estimatedCost?.toLocaleString() || "0"}</td>
                </tr>
            `;
          });
          html += `
              </tbody>
            </table>
          `;
        }
        break;

      case "cost_tables":
        if (data.facilitySummary?.financial) {
          html += `
            <table>
              <thead>
                <tr>
                  <th>Cost Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Identified Costs</td><td>$${data.facilitySummary.financial.identifiedCosts.toLocaleString()}</td></tr>
                <tr><td>Planned Costs</td><td>$${data.facilitySummary.financial.plannedCosts.toLocaleString()}</td></tr>
                <tr><td>Executed Costs</td><td>$${data.facilitySummary.financial.executedCosts.toLocaleString()}</td></tr>
                <tr><td><strong>Total Costs</strong></td><td><strong>$${data.facilitySummary.financial.totalCosts.toLocaleString()}</strong></td></tr>
              </tbody>
            </table>
          `;
        }
        break;

      case "custom_text":
        if ((section.contentOptions as any)?.customText) {
          html += `<p>${(section.contentOptions as any).customText}</p>`;
        }
        break;

      default:
        html += `<p>[${section.sectionType} content]</p>`;
    }

    if ((section.layoutOptions as any)?.pageBreakAfter) {
      html += `<div style="page-break-after: always;"></div>`;
    }

    return html;
  }
}

export const reportGeneratorService = new ReportGeneratorService();
