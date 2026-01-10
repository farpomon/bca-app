import PDFDocument from "pdfkit";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { storagePut } from "../storage";

// Letter grade descriptors
const GRADE_DESCRIPTORS: Record<string, string> = {
  "A+": "Exceptional",
  "A": "Excellent",
  "A-": "Very Good",
  "B+": "Good",
  "B": "Above Average",
  "B-": "Satisfactory",
  "C+": "Fair",
  "C": "Average",
  "C-": "Below Average",
  "D+": "Needs Improvement",
  "D": "Poor",
  "D-": "Critical",
  "F": "Failing"
};

// Zone colors for PDF
const ZONE_COLORS: Record<string, string> = {
  excellent: "#22c55e",
  good: "#eab308",
  fair: "#f97316",
  poor: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

interface ESGReportData {
  projectId?: number;
  projectName?: string;
  reportDate: Date;
  reportPeriod: { start: Date; end: Date };
  portfolioSummary?: {
    totalProjects: number;
    avgScore: number;
    avgGrade: string;
    zoneDistribution: Record<string, number>;
  };
  projectScores?: Array<{
    projectId: number;
    projectName: string;
    esgScore: number;
    esgGrade: string;
    esgZone: string;
    energyScore?: number;
    waterScore?: number;
    wasteScore?: number;
    emissionsScore?: number;
  }>;
  metrics?: {
    energy?: { score: number; grade: string; trend?: string };
    water?: { score: number; grade: string; trend?: string };
    waste?: { score: number; grade: string; trend?: string };
    emissions?: { score: number; grade: string; trend?: string };
  };
  certifications?: Array<{
    type: string;
    level?: string;
    status: string;
    expirationDate?: string;
  }>;
  improvementActions?: Array<{
    title: string;
    type: string;
    status: string;
    estimatedCost?: number;
    estimatedSavings?: number;
  }>;
  goals?: Array<{
    type: string;
    baseline: number;
    target: number;
    current?: number;
    status: string;
  }>;
}

export async function generateESGReportPDF(
  projectId?: number,
  options?: {
    includePortfolioSummary?: boolean;
    includeAssetBreakdown?: boolean;
    includeMetrics?: boolean;
    includeCertifications?: boolean;
    includeImprovementActions?: boolean;
    includeGoals?: boolean;
    reportPeriodStart?: Date;
    reportPeriodEnd?: Date;
  }
): Promise<{ url: string; fileKey: string; reportData: ESGReportData }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const reportDate = new Date();
  const reportPeriodStart = options?.reportPeriodStart || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const reportPeriodEnd = options?.reportPeriodEnd || new Date();

  // Gather report data
  const reportData: ESGReportData = {
    projectId,
    reportDate,
    reportPeriod: { start: reportPeriodStart, end: reportPeriodEnd },
  };

  // Get project name if specific project
  if (projectId) {
    const projectResult = await db.execute(sql`SELECT name FROM projects WHERE id = ${projectId}`);
    const projects = Array.isArray(projectResult[0]) ? projectResult[0] : [];
    if (projects.length > 0) {
      reportData.projectName = (projects[0] as any).name;
    }
  }

  // Get portfolio summary
  if (options?.includePortfolioSummary !== false) {
    const summaryResult = await db.execute(sql`
      SELECT 
        COUNT(*) as totalProjects,
        AVG(esgScore) as avgScore,
        SUM(CASE WHEN esgZone = 'excellent' THEN 1 ELSE 0 END) as excellentCount,
        SUM(CASE WHEN esgZone = 'good' THEN 1 ELSE 0 END) as goodCount,
        SUM(CASE WHEN esgZone = 'fair' THEN 1 ELSE 0 END) as fairCount,
        SUM(CASE WHEN esgZone = 'poor' THEN 1 ELSE 0 END) as poorCount
      FROM project_esg_ratings per
      INNER JOIN (
        SELECT projectId, MAX(calculationDate) as maxDate
        FROM project_esg_ratings
        GROUP BY projectId
      ) latest ON per.projectId = latest.projectId AND per.calculationDate = latest.maxDate
      ${projectId ? sql`WHERE per.projectId = ${projectId}` : sql``}
    `);
    const summary = Array.isArray(summaryResult[0]) ? summaryResult[0] : [];
    if (summary.length > 0) {
      const s = summary[0] as any;
      const avgScore = parseFloat(s.avgScore) || 0;
      reportData.portfolioSummary = {
        totalProjects: parseInt(s.totalProjects) || 0,
        avgScore,
        avgGrade: getLetterGrade(avgScore),
        zoneDistribution: {
          excellent: parseInt(s.excellentCount) || 0,
          good: parseInt(s.goodCount) || 0,
          fair: parseInt(s.fairCount) || 0,
          poor: parseInt(s.poorCount) || 0,
        },
      };
    }
  }

  // Get project scores
  if (options?.includeAssetBreakdown !== false) {
    const scoresResult = await db.execute(sql`
      SELECT per.*, p.name as projectName
      FROM project_esg_ratings per
      INNER JOIN (
        SELECT projectId, MAX(calculationDate) as maxDate
        FROM project_esg_ratings
        GROUP BY projectId
      ) latest ON per.projectId = latest.projectId AND per.calculationDate = latest.maxDate
      LEFT JOIN projects p ON per.projectId = p.id
      ${projectId ? sql`WHERE per.projectId = ${projectId}` : sql``}
      ORDER BY per.esgScore DESC
      LIMIT 50
    `);
    const scores = Array.isArray(scoresResult[0]) ? scoresResult[0] : [];
    reportData.projectScores = scores.map((s: any) => ({
      projectId: s.projectId,
      projectName: s.projectName || `Project ${s.projectId}`,
      esgScore: parseFloat(s.esgScore) || 0,
      esgGrade: s.esgGrade || "N/A",
      esgZone: s.esgZone || "fair",
      energyScore: s.energyScore ? parseFloat(s.energyScore) : undefined,
      waterScore: s.waterScore ? parseFloat(s.waterScore) : undefined,
      wasteScore: s.wasteScore ? parseFloat(s.wasteScore) : undefined,
      emissionsScore: s.emissionsScore ? parseFloat(s.emissionsScore) : undefined,
    }));
  }

  // Get certifications
  if (options?.includeCertifications !== false && projectId) {
    const certsResult = await db.execute(sql`
      SELECT * FROM esg_certifications 
      WHERE projectId = ${projectId}
      ORDER BY certificationDate DESC
    `);
    const certs = Array.isArray(certsResult[0]) ? certsResult[0] : [];
    reportData.certifications = certs.map((c: any) => ({
      type: c.certificationType,
      level: c.certificationLevel,
      status: c.status,
      expirationDate: c.expirationDate,
    }));
  }

  // Get improvement actions
  if (options?.includeImprovementActions !== false && projectId) {
    const actionsResult = await db.execute(sql`
      SELECT * FROM esg_improvement_actions 
      WHERE projectId = ${projectId}
      ORDER BY priority, createdAt DESC
      LIMIT 20
    `);
    const actions = Array.isArray(actionsResult[0]) ? actionsResult[0] : [];
    reportData.improvementActions = actions.map((a: any) => ({
      title: a.title,
      type: a.actionType,
      status: a.status,
      estimatedCost: a.estimatedCost ? parseFloat(a.estimatedCost) : undefined,
      estimatedSavings: a.estimatedSavings ? parseFloat(a.estimatedSavings) : undefined,
    }));
  }

  // Get sustainability goals
  if (options?.includeGoals !== false && projectId) {
    const goalsResult = await db.execute(sql`
      SELECT * FROM sustainability_goals 
      WHERE projectId = ${projectId}
      ORDER BY targetYear
    `);
    const goals = Array.isArray(goalsResult[0]) ? goalsResult[0] : [];
    reportData.goals = goals.map((g: any) => ({
      type: g.goalType,
      baseline: parseFloat(g.baselineValue) || 0,
      target: parseFloat(g.targetValue) || 0,
      status: g.status,
    }));
  }

  // Generate PDF
  const pdfBuffer = await createPDFDocument(reportData);

  // Upload to S3
  const timestamp = Date.now();
  const fileKey = `esg-reports/${projectId || 'portfolio'}/esg-report-${timestamp}.pdf`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

  // Store report record
  await db.execute(sql`
    INSERT INTO esg_reports 
    (projectId, reportType, reportDate, reportPeriodStart, reportPeriodEnd, title, reportData, fileUrl, fileKey, status, createdBy)
    VALUES (
      ${projectId || null},
      'compliance',
      NOW(),
      ${reportPeriodStart.toISOString()},
      ${reportPeriodEnd.toISOString()},
      ${projectId ? `ESG Report - ${reportData.projectName}` : 'Portfolio ESG Report'},
      ${JSON.stringify(reportData)},
      ${url},
      ${fileKey},
      'published',
      1
    )
  `);

  return { url, fileKey, reportData };
}

function getLetterGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

async function createPDFDocument(data: ESGReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: "LETTER",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(24).fillColor("#1e3a5f").text("ESG Compliance Report", { align: "center" });
    doc.moveDown(0.5);
    
    if (data.projectName) {
      doc.fontSize(16).fillColor("#4a5568").text(data.projectName, { align: "center" });
    } else {
      doc.fontSize(16).fillColor("#4a5568").text("Portfolio Summary", { align: "center" });
    }
    
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#718096")
      .text(`Report Date: ${data.reportDate.toLocaleDateString()}`, { align: "center" });
    doc.text(
      `Report Period: ${data.reportPeriod.start.toLocaleDateString()} - ${data.reportPeriod.end.toLocaleDateString()}`,
      { align: "center" }
    );
    
    doc.moveDown(1.5);

    // Portfolio Summary Section
    if (data.portfolioSummary) {
      doc.fontSize(14).fillColor("#1e3a5f").text("Portfolio Summary", { underline: true });
      doc.moveDown(0.5);

      const summary = data.portfolioSummary;
      doc.fontSize(11).fillColor("#2d3748");
      
      // Score box
      doc.rect(50, doc.y, 200, 60).stroke("#e2e8f0");
      const boxY = doc.y + 10;
      doc.fontSize(28).fillColor(getGradeColor(summary.avgGrade))
        .text(summary.avgScore.toFixed(1), 60, boxY);
      doc.fontSize(12).fillColor("#4a5568")
        .text(`Grade: ${summary.avgGrade}`, 60, boxY + 35);
      doc.text(`(${GRADE_DESCRIPTORS[summary.avgGrade] || "N/A"})`, 130, boxY + 35);

      // Stats
      doc.fontSize(11).fillColor("#2d3748");
      doc.text(`Total Projects: ${summary.totalProjects}`, 280, boxY);
      doc.text(`Excellent Zone: ${summary.zoneDistribution.excellent}`, 280, boxY + 15);
      doc.text(`Good Zone: ${summary.zoneDistribution.good}`, 280, boxY + 30);
      doc.text(`Fair Zone: ${summary.zoneDistribution.fair}`, 400, boxY + 15);
      doc.text(`Poor Zone: ${summary.zoneDistribution.poor}`, 400, boxY + 30);

      doc.y = boxY + 70;
      doc.moveDown(1);
    }

    // Project Scores Table
    if (data.projectScores && data.projectScores.length > 0) {
      doc.fontSize(14).fillColor("#1e3a5f").text("Project ESG Ratings", { underline: true });
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const colWidths = [180, 60, 60, 60, 60, 60];
      const headers = ["Project", "Score", "Grade", "Energy", "Water", "Waste"];
      
      doc.fontSize(10).fillColor("#4a5568");
      let x = 50;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop, { width: colWidths[i], align: i === 0 ? "left" : "center" });
        x += colWidths[i];
      });

      doc.moveTo(50, tableTop + 15).lineTo(530, tableTop + 15).stroke("#e2e8f0");

      // Table rows
      let rowY = tableTop + 20;
      doc.fontSize(9).fillColor("#2d3748");
      
      for (const project of data.projectScores.slice(0, 15)) {
        if (rowY > 700) {
          doc.addPage();
          rowY = 50;
        }

        x = 50;
        doc.text(project.projectName.substring(0, 30), x, rowY, { width: colWidths[0] });
        x += colWidths[0];
        doc.text(project.esgScore.toFixed(1), x, rowY, { width: colWidths[1], align: "center" });
        x += colWidths[1];
        doc.fillColor(getGradeColor(project.esgGrade))
          .text(project.esgGrade, x, rowY, { width: colWidths[2], align: "center" });
        doc.fillColor("#2d3748");
        x += colWidths[2];
        doc.text(project.energyScore?.toFixed(0) || "-", x, rowY, { width: colWidths[3], align: "center" });
        x += colWidths[3];
        doc.text(project.waterScore?.toFixed(0) || "-", x, rowY, { width: colWidths[4], align: "center" });
        x += colWidths[4];
        doc.text(project.wasteScore?.toFixed(0) || "-", x, rowY, { width: colWidths[5], align: "center" });

        rowY += 18;
      }

      doc.y = rowY + 10;
      doc.moveDown(1);
    }

    // Certifications
    if (data.certifications && data.certifications.length > 0) {
      if (doc.y > 650) doc.addPage();
      
      doc.fontSize(14).fillColor("#1e3a5f").text("Certifications", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor("#2d3748");
      for (const cert of data.certifications) {
        doc.text(`• ${cert.type.toUpperCase()}${cert.level ? ` - ${cert.level}` : ""} (${cert.status})`);
        if (cert.expirationDate) {
          doc.fontSize(9).fillColor("#718096")
            .text(`  Expires: ${new Date(cert.expirationDate).toLocaleDateString()}`);
        }
        doc.moveDown(0.3);
      }
      doc.moveDown(1);
    }

    // Improvement Actions
    if (data.improvementActions && data.improvementActions.length > 0) {
      if (doc.y > 600) doc.addPage();
      
      doc.fontSize(14).fillColor("#1e3a5f").text("Improvement Actions", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor("#2d3748");
      for (const action of data.improvementActions.slice(0, 10)) {
        doc.text(`• ${action.title}`);
        doc.fontSize(9).fillColor("#718096")
          .text(`  Type: ${action.type.replace(/_/g, " ")} | Status: ${action.status}`);
        if (action.estimatedCost) {
          doc.text(`  Est. Cost: $${action.estimatedCost.toLocaleString()}`);
        }
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#2d3748");
      }
      doc.moveDown(1);
    }

    // Sustainability Goals
    if (data.goals && data.goals.length > 0) {
      if (doc.y > 600) doc.addPage();
      
      doc.fontSize(14).fillColor("#1e3a5f").text("Sustainability Goals", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor("#2d3748");
      for (const goal of data.goals) {
        const progress = goal.current 
          ? ((goal.baseline - goal.current) / (goal.baseline - goal.target) * 100).toFixed(0)
          : "N/A";
        doc.text(`• ${goal.type.replace(/_/g, " ").toUpperCase()}`);
        doc.fontSize(9).fillColor("#718096")
          .text(`  Baseline: ${goal.baseline} → Target: ${goal.target} | Status: ${goal.status}`);
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#2d3748");
      }
    }

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#a0aec0")
        .text(
          `Page ${i + 1} of ${pageCount} | Generated by B³NMA Building Condition Assessment System`,
          50,
          doc.page.height - 30,
          { align: "center", width: doc.page.width - 100 }
        );
    }

    doc.end();
  });
}

function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "#22c55e";
  if (grade.startsWith("B")) return "#84cc16";
  if (grade.startsWith("C")) return "#eab308";
  if (grade.startsWith("D")) return "#f97316";
  return "#ef4444";
}

export async function getESGReports(projectId?: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM esg_reports
    ${projectId ? sql`WHERE projectId = ${projectId}` : sql``}
    ORDER BY reportDate DESC
    LIMIT ${limit}
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}
