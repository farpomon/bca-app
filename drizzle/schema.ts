import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

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
 * Projects table - represents a building being assessed
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  clientName: varchar("clientName", { length: 255 }),
  propertyType: varchar("propertyType", { length: 100 }),
  constructionType: varchar("constructionType", { length: 100 }),
  yearBuilt: int("yearBuilt"),
  numberOfUnits: int("numberOfUnits"),
  numberOfStories: int("numberOfStories"),
  buildingCode: varchar("buildingCode", { length: 100 }),
  assessmentDate: timestamp("assessmentDate"),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "archived"]).default("draft").notNull(),
  overallConditionScore: int("overallConditionScore"), // Calculated overall building condition score
  overallFciScore: int("overallFciScore"), // Overall Facility Condition Index (0-100)
  overallConditionRating: varchar("overallConditionRating", { length: 50 }), // e.g., "Good", "Fair", "Poor"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Building sections - represents extensions, additions, or distinct areas within a project
 */
export const buildingSections = mysqlTable("building_sections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sectionType: mysqlEnum("sectionType", ["original", "extension", "addition", "renovation"]).default("original").notNull(),
  installDate: timestamp("installDate"),
  expectedLifespan: int("expectedLifespan"), // in years
  grossFloorArea: int("grossFloorArea"), // in square feet
  numberOfStories: int("numberOfStories"),
  constructionType: varchar("constructionType", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuildingSection = typeof buildingSections.$inferSelect;
export type InsertBuildingSection = typeof buildingSections.$inferInsert;

/**
 * Building components based on UNIFORMAT II classification
 * Stores the hierarchical structure: Major Group > Group > Individual Element
 */
export const buildingComponents = mysqlTable("building_components", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  level: int("level").notNull(), // 1=Major Group, 2=Group, 3=Individual Element
  parentCode: varchar("parentCode", { length: 20 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BuildingComponent = typeof buildingComponents.$inferSelect;
export type InsertBuildingComponent = typeof buildingComponents.$inferInsert;

/**
 * Assessments - links projects to building components with condition ratings
 */
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sectionId: int("sectionId"),
  componentCode: varchar("componentCode", { length: 20 }).notNull(),
  condition: mysqlEnum("condition", ["good", "fair", "poor", "not_assessed"]).default("not_assessed").notNull(),
  status: mysqlEnum("status", ["initial", "active", "completed"]).default("initial").notNull(),
  conditionPercentage: varchar("conditionPercentage", { length: 50 }), // e.g., "75-50% of ESL" for Fair condition
  observations: text("observations"),
  recommendations: text("recommendations"),
  remainingUsefulLife: int("remainingUsefulLife"), // in years
  expectedUsefulLife: int("expectedUsefulLife"), // in years (ESL - Estimated Service Life)
  reviewYear: int("reviewYear"), // Year when review is recommended
  lastTimeAction: int("lastTimeAction"), // Year of last action/repair
  estimatedRepairCost: int("estimatedRepairCost").default(0), // Estimated cost to repair/maintain
  replacementValue: int("replacementValue").default(0), // Full replacement cost
  actionYear: int("actionYear"), // Year when action is recommended
  conditionScore: int("conditionScore"), // Numerical condition score (based on configured rating scale)
  ciScore: int("ciScore"), // Condition Index score
  fciScore: int("fciScore"), // Facility Condition Index score (0-100)
  assessedAt: timestamp("assessedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

/**
 * Deficiencies - specific issues found during assessment
 */
export const deficiencies = mysqlTable("deficiencies", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId"),
  projectId: int("projectId").notNull(),
  componentCode: varchar("componentCode", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  priority: mysqlEnum("priority", ["immediate", "short_term", "medium_term", "long_term"]).default("medium_term").notNull(),
  recommendedAction: text("recommendedAction"),
  estimatedCost: int("estimatedCost"), // in cents to avoid decimal issues
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "deferred"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deficiency = typeof deficiencies.$inferSelect;
export type InsertDeficiency = typeof deficiencies.$inferInsert;

/**
 * Photos - images attached to assessments or deficiencies
 */
export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  assessmentId: int("assessmentId"),
  deficiencyId: int("deficiencyId"),
  componentCode: varchar("componentCode", { length: 20 }),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  takenAt: timestamp("takenAt"),
  // Geolocation fields
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  altitude: decimal("altitude", { precision: 10, scale: 2 }),
  locationAccuracy: decimal("locationAccuracy", { precision: 10, scale: 2 }),
  // OCR fields
  ocrText: text("ocrText"),
  ocrConfidence: decimal("ocrConfidence", { precision: 5, scale: 2 }),
  // Floor plan fields
  floorPlanId: int("floorPlanId"),
  floorPlanX: decimal("floorPlanX", { precision: 10, scale: 4 }),
  floorPlanY: decimal("floorPlanY", { precision: 10, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;

/**
 * Report schedules - automated report generation
 */
export const reportSchedules = mysqlTable("report_schedules", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).notNull(),
  dayOfWeek: int("dayOfWeek"), // 0-6 for weekly
  dayOfMonth: int("dayOfMonth"), // 1-31 for monthly
  recipientEmails: text("recipientEmails").notNull(), // JSON array of emails
  active: int("active").default(1).notNull(), // 1 = active, 0 = inactive
  lastRun: timestamp("lastRun"),
  nextRun: timestamp("nextRun"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type InsertReportSchedule = typeof reportSchedules.$inferInsert;

/**
 * Cost estimates - detailed cost breakdown for repairs/replacements
 */
export const costEstimates = mysqlTable("cost_estimates", {
  id: int("id").autoincrement().primaryKey(),
  deficiencyId: int("deficiencyId").notNull(),
  projectId: int("projectId").notNull(),
  componentCode: varchar("componentCode", { length: 20 }).notNull(),
  description: text("description"),
  quantity: int("quantity"),
  unit: varchar("unit", { length: 50 }),
  unitCost: int("unitCost"), // in cents
  totalCost: int("totalCost"), // in cents
  timeline: mysqlEnum("timeline", ["immediate", "1_5_years", "5_10_years", "10_plus_years"]).default("1_5_years").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CostEstimate = typeof costEstimates.$inferSelect;
export type InsertCostEstimate = typeof costEstimates.$inferInsert;

/**
 * Hierarchy templates - global UNIFORMAT II configuration templates
 * Defines the default structure, weightings, and priorities
 */
export const hierarchyTemplates = mysqlTable("hierarchy_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("isDefault").default(false).notNull(),
  config: text("config").notNull(), // JSON: { maxDepth, componentWeights, priorities }
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HierarchyTemplate = typeof hierarchyTemplates.$inferSelect;
export type InsertHierarchyTemplate = typeof hierarchyTemplates.$inferInsert;

/**
 * Project hierarchy configuration - per-project overrides
 * Allows customization of hierarchy depth, weightings, and priorities per project
 */
export const projectHierarchyConfig = mysqlTable("project_hierarchy_config", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  templateId: int("templateId"), // Reference to hierarchy template, null means custom
  maxDepth: int("maxDepth").default(3).notNull(), // 1-4 (UNIFORMAT levels)
  componentWeights: text("componentWeights"), // JSON: { "A": 1.2, "B": 1.0, ... }
  componentPriorities: text("componentPriorities"), // JSON: { "A": "high", "B": "medium", ... }
  enabledComponents: text("enabledComponents"), // JSON: ["A", "B", "C", ...] or null for all
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectHierarchyConfig = typeof projectHierarchyConfig.$inferSelect;
export type InsertProjectHierarchyConfig = typeof projectHierarchyConfig.$inferInsert;

/**
 * Rating scales - Define different condition rating systems
 * Supports FCI, CI, and custom rating scales
 */
export const ratingScales = mysqlTable("rating_scales", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["fci", "ci", "condition", "priority", "custom"]).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  minValue: int("minValue").notNull(), // e.g., 0 for FCI, 1 for 1-10 scale
  maxValue: int("maxValue").notNull(), // e.g., 100 for FCI, 10 for 1-10 scale
  scaleItems: text("scaleItems").notNull(), // JSON: [{ value, label, description, color }]
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RatingScale = typeof ratingScales.$inferSelect;
export type InsertRatingScale = typeof ratingScales.$inferInsert;

/**
 * Project rating configuration - Per-project rating scale selection
 */
export const projectRatingConfig = mysqlTable("project_rating_config", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  conditionScaleId: int("conditionScaleId"), // Rating scale for component conditions
  priorityScaleId: int("priorityScaleId"), // Rating scale for deficiency priorities
  fciScaleId: int("fciScaleId"), // Rating scale for FCI calculations
  useWeightedAverage: boolean("useWeightedAverage").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectRatingConfig = typeof projectRatingConfig.$inferSelect;
export type InsertProjectRatingConfig = typeof projectRatingConfig.$inferInsert;

/**
 * Audit log - Tracks all changes to data
 */
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Who made the change
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g., "assessment", "deficiency", "project"
  entityId: int("entityId").notNull(), // ID of the entity that changed
  action: mysqlEnum("action", ["create", "update", "delete"]).notNull(),
  changes: text("changes").notNull(), // JSON: { before: {...}, after: {...} }
  metadata: text("metadata"), // JSON: Additional context (IP, user agent, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * Assessment versions - Snapshots of assessment state over time
 */
export const assessmentVersions = mysqlTable("assessment_versions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  data: text("data").notNull(), // JSON snapshot of entire assessment
  changedBy: int("changedBy").notNull(),
  changeDescription: text("changeDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssessmentVersion = typeof assessmentVersions.$inferSelect;
export type InsertAssessmentVersion = typeof assessmentVersions.$inferInsert;

/**
 * Deficiency versions - Snapshots of deficiency state over time
 */
export const deficiencyVersions = mysqlTable("deficiency_versions", {
  id: int("id").autoincrement().primaryKey(),
  deficiencyId: int("deficiencyId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  data: text("data").notNull(), // JSON snapshot of entire deficiency
  changedBy: int("changedBy").notNull(),
  changeDescription: text("changeDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeficiencyVersion = typeof deficiencyVersions.$inferSelect;
export type InsertDeficiencyVersion = typeof deficiencyVersions.$inferInsert;

/**
 * Project versions - Snapshots of project state over time
 */
export const projectVersions = mysqlTable("project_versions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  data: text("data").notNull(), // JSON snapshot of entire project
  changedBy: int("changedBy").notNull(),
  changeDescription: text("changeDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

/**
 * Database backups - Periodic snapshots for disaster recovery
 */
export const databaseBackups = mysqlTable("database_backups", {
  id: int("id").autoincrement().primaryKey(),
  backupType: mysqlEnum("backupType", ["manual", "automatic", "scheduled"]).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).default("pending").notNull(),
  fileSize: int("fileSize"), // Size in bytes
  recordCount: int("recordCount"), // Total records backed up
  backupPath: text("backupPath"), // S3 path or file location
  metadata: text("metadata"), // JSON: Additional backup info
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = typeof databaseBackups.$inferInsert;

/**
 * Floor plans - Digital floor plan images for projects
 */
export const floorPlans = mysqlTable("floor_plans", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  floorNumber: int("floorNumber"),
  buildingSectionId: int("buildingSectionId"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  url: text("url").notNull(),
  imageWidth: int("imageWidth"),
  imageHeight: int("imageHeight"),
  scale: varchar("scale", { length: 100 }), // e.g., "1:100"
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FloorPlan = typeof floorPlans.$inferSelect;
export type InsertFloorPlan = typeof floorPlans.$inferInsert;
