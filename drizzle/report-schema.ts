import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Report templates - Pre-defined and custom report configurations
 */
export const reportTemplates = mysqlTable("report_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", [
    "executive_summary",
    "detailed_assessment",
    "financial_analysis",
    "compliance",
    "risk_assessment",
    "optimization_results",
    "custom"
  ]).notNull(),
  stakeholder: varchar("stakeholder", { length: 100 }), // e.g., "Board", "Management", "Operations", "Finance"
  isGlobal: boolean("isGlobal").default(false).notNull(), // Available to all projects
  userId: int("userId"), // Creator if custom template
  projectId: int("projectId"), // Specific to project if not global
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Report sections - Individual sections that can be included in reports
 */
export const reportSections = mysqlTable("report_sections", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  sectionType: mysqlEnum("sectionType", [
    "cover_page",
    "executive_summary",
    "condition_summary",
    "cost_tables",
    "deficiencies_list",
    "photo_gallery",
    "risk_assessment",
    "optimization_results",
    "prioritization_rankings",
    "component_details",
    "ci_fci_trends",
    "cash_flow_projections",
    "custom_text"
  ]).notNull(),
  title: varchar("title", { length: 255 }),
  orderIndex: int("orderIndex").notNull(), // Display order
  isEnabled: boolean("isEnabled").default(true).notNull(),
  layoutOptions: json("layoutOptions").$type<{
    tableFormat?: "simple" | "detailed" | "grouped";
    chartType?: "bar" | "line" | "pie" | "scatter";
    groupBy?: string;
    sortBy?: string;
    columnsVisible?: string[];
    showSummary?: boolean;
    pageBreakBefore?: boolean;
    pageBreakAfter?: boolean;
  }>(),
  contentOptions: json("contentOptions").$type<{
    includePhotos?: boolean;
    includeCharts?: boolean;
    includeRecommendations?: boolean;
    filterBy?: Record<string, any>;
    customText?: string;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Report configurations - Branding and formatting options
 */
export const reportConfigurations = mysqlTable("report_configurations", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull().unique(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  headerText: text("headerText"),
  footerText: text("footerText"),
  colorScheme: json("colorScheme").$type<{
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    background?: string;
  }>(),
  fontOptions: json("fontOptions").$type<{
    family?: string;
    sizeBase?: number;
    sizeHeading?: number;
    sizeBody?: number;
  }>(),
  pageOptions: json("pageOptions").$type<{
    orientation?: "portrait" | "landscape";
    size?: "letter" | "a4" | "legal";
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }>(),
  coverPageOptions: json("coverPageOptions").$type<{
    enabled?: boolean;
    title?: string;
    subtitle?: string;
    includeProjectInfo?: boolean;
    includeDate?: boolean;
    backgroundImage?: string;
  }>(),
  tableOfContents: boolean("tableOfContents").default(true).notNull(),
  disclaimerText: text("disclaimerText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Generated reports history
 */
export const reportHistory = mysqlTable("report_history", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  templateId: int("templateId").notNull(),
  userId: int("userId").notNull(),
  format: mysqlEnum("format", ["pdf", "excel", "word", "html"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }),
  fileSize: int("fileSize"), // bytes
  status: mysqlEnum("status", ["generating", "completed", "failed"]).default("generating").notNull(),
  errorMessage: text("errorMessage"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;

export type ReportSection = typeof reportSections.$inferSelect;
export type InsertReportSection = typeof reportSections.$inferInsert;

export type ReportConfiguration = typeof reportConfigurations.$inferSelect;
export type InsertReportConfiguration = typeof reportConfigurations.$inferInsert;

export type ReportHistory = typeof reportHistory.$inferSelect;
export type InsertReportHistory = typeof reportHistory.$inferInsert;
