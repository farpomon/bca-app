import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Municipalities - represents different cities/towns/counties
 */
export const municipalities = mysqlTable("municipalities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("USA"),
  population: int("population"),
  area: decimal("area", { precision: 10, scale: 2 }), // in square miles
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  address: text("address"),
  website: varchar("website", { length: 500 }),
  logoUrl: varchar("logoUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Municipality = typeof municipalities.$inferSelect;
export type InsertMunicipality = typeof municipalities.$inferInsert;

/**
 * Projects - BCA assessment projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  municipalityId: int("municipalityId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectNumber: varchar("projectNumber", { length: 100 }).notNull().unique(),
  status: mysqlEnum("status", ["draft", "in_progress", "under_review", "completed", "archived"]).default("draft").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  dueDate: timestamp("dueDate"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 15, scale: 2 }),
  projectManagerId: int("projectManagerId"),
  clientContact: varchar("clientContact", { length: 255 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 50 }),
  notes: text("notes"),
  tags: json("tags").$type<string[]>(),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Asset Categories - types of assets (buildings, infrastructure, etc.)
 */
export const assetCategories = mysqlTable("assetCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 20 }),
  parentId: int("parentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetCategory = typeof assetCategories.$inferSelect;
export type InsertAssetCategory = typeof assetCategories.$inferInsert;

/**
 * Assets - individual assets being assessed
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  categoryId: int("categoryId"),
  name: varchar("name", { length: 255 }).notNull(),
  assetCode: varchar("assetCode", { length: 100 }).notNull(),
  description: text("description"),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  yearBuilt: int("yearBuilt"),
  yearRenovated: int("yearRenovated"),
  squareFootage: decimal("squareFootage", { precision: 12, scale: 2 }),
  numberOfFloors: int("numberOfFloors"),
  numberOfUnits: int("numberOfUnits"),
  occupancyType: mysqlEnum("occupancyType", ["occupied", "vacant", "partially_occupied", "seasonal"]).default("occupied"),
  ownershipType: mysqlEnum("ownershipType", ["municipal", "state", "federal", "private", "mixed"]).default("municipal"),
  constructionType: varchar("constructionType", { length: 100 }),
  primaryUse: varchar("primaryUse", { length: 255 }),
  secondaryUse: varchar("secondaryUse", { length: 255 }),
  replacementValue: decimal("replacementValue", { precision: 15, scale: 2 }),
  insuranceValue: decimal("insuranceValue", { precision: 15, scale: 2 }),
  annualMaintenanceCost: decimal("annualMaintenanceCost", { precision: 12, scale: 2 }),
  lastInspectionDate: timestamp("lastInspectionDate"),
  nextInspectionDate: timestamp("nextInspectionDate"),
  status: mysqlEnum("status", ["active", "inactive", "pending_demolition", "under_construction", "renovating"]).default("active"),
  overallCondition: mysqlEnum("overallCondition", ["excellent", "good", "fair", "poor", "critical"]),
  fciScore: decimal("fciScore", { precision: 5, scale: 4 }), // Facility Condition Index (0-1)
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Assessment Components - building systems/components to assess
 */
export const assessmentComponents = mysqlTable("assessmentComponents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  category: mysqlEnum("category", [
    "structural", "exterior", "roofing", "plumbing", "electrical", 
    "hvac", "interior", "fire_safety", "accessibility", "site", "other"
  ]).notNull(),
  description: text("description"),
  expectedLifespan: int("expectedLifespan"), // in years
  weight: decimal("weight", { precision: 5, scale: 4 }).default("1.0000"), // for weighted scoring
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssessmentComponent = typeof assessmentComponents.$inferSelect;
export type InsertAssessmentComponent = typeof assessmentComponents.$inferInsert;

/**
 * Assessments - individual condition assessments
 */
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  componentId: int("componentId").notNull(),
  assessorId: int("assessorId"),
  assessmentDate: timestamp("assessmentDate").notNull(),
  conditionRating: mysqlEnum("conditionRating", ["1", "2", "3", "4", "5"]).notNull(), // 1=Critical, 5=Excellent
  conditionNotes: text("conditionNotes"),
  deficiencyDescription: text("deficiencyDescription"),
  deficiencySeverity: mysqlEnum("deficiencySeverity", ["minor", "moderate", "major", "critical"]),
  recommendedAction: mysqlEnum("recommendedAction", [
    "none", "monitor", "preventive_maintenance", "repair", "replace", "immediate_action"
  ]).default("none"),
  estimatedRepairCost: decimal("estimatedRepairCost", { precision: 12, scale: 2 }),
  priorityLevel: mysqlEnum("priorityLevel", ["1", "2", "3", "4", "5"]).default("3"), // 1=Highest
  remainingLifeYears: int("remainingLifeYears"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  location: varchar("location", { length: 255 }),
  accessibilityIssue: boolean("accessibilityIssue").default(false),
  safetyHazard: boolean("safetyHazard").default(false),
  energyEfficiencyIssue: boolean("energyEfficiencyIssue").default(false),
  codeViolation: boolean("codeViolation").default(false),
  status: mysqlEnum("status", ["draft", "submitted", "reviewed", "approved", "rejected"]).default("draft"),
  reviewedById: int("reviewedById"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

/**
 * Photos - assessment photos and documentation
 */
export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId"),
  assetId: int("assetId"),
  url: varchar("url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
  filename: varchar("filename", { length: 255 }),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  caption: text("caption"),
  photoType: mysqlEnum("photoType", [
    "exterior", "interior", "deficiency", "before", "after", "overview", "detail", "other"
  ]).default("other"),
  takenAt: timestamp("takenAt"),
  takenById: int("takenById"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  sortOrder: int("sortOrder").default(0),
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;

/**
 * Documents - reports and other documents
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  assetId: int("assetId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 500 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  documentType: mysqlEnum("documentType", [
    "report", "drawing", "specification", "permit", "warranty", 
    "maintenance_record", "inspection_report", "cost_estimate", "other"
  ]).default("other"),
  version: varchar("version", { length: 50 }),
  uploadedById: int("uploadedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Capital Projects - recommended capital improvement projects
 */
export const capitalProjects = mysqlTable("capitalProjects", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  assetId: int("assetId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  scope: text("scope"),
  justification: text("justification"),
  estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
  costConfidenceLevel: mysqlEnum("costConfidenceLevel", ["low", "medium", "high"]).default("medium"),
  priority: mysqlEnum("priority", ["1", "2", "3", "4", "5"]).default("3"),
  category: mysqlEnum("category", [
    "safety", "code_compliance", "deferred_maintenance", "energy_efficiency",
    "accessibility", "capacity", "modernization", "replacement", "other"
  ]).default("other"),
  recommendedYear: int("recommendedYear"),
  estimatedDuration: int("estimatedDuration"), // in months
  fundingSource: varchar("fundingSource", { length: 255 }),
  status: mysqlEnum("status", ["proposed", "approved", "funded", "in_progress", "completed", "deferred", "cancelled"]).default("proposed"),
  relatedAssessmentIds: json("relatedAssessmentIds").$type<number[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CapitalProject = typeof capitalProjects.$inferSelect;
export type InsertCapitalProject = typeof capitalProjects.$inferInsert;

/**
 * Activity Log - audit trail for changes
 */
export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete", "view", "export", "import", "approve", "reject"]).notNull(),
  description: text("description"),
  previousData: json("previousData").$type<Record<string, unknown>>(),
  newData: json("newData").$type<Record<string, unknown>>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * Comments - comments on assessments or assets
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["asset", "assessment", "project", "capital_project"]).notNull(),
  entityId: int("entityId").notNull(),
  parentId: int("parentId"),
  content: text("content").notNull(),
  isResolved: boolean("isResolved").default(false),
  resolvedById: int("resolvedById"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
