import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["viewer", "editor", "project_manager", "admin"]).default("editor").notNull(),
  company: varchar("company", { length: 255 }),
  city: varchar("city", { length: 255 }),
  accountStatus: mysqlEnum("accountStatus", ["pending", "active", "trial", "suspended"]).default("pending").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Custom vocabulary - user-defined technical terms for improved transcription
 */
export const customVocabulary = mysqlTable("custom_vocabulary", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  term: varchar("term", { length: 255 }).notNull(),
  pronunciation: varchar("pronunciation", { length: 255 }), // Optional phonetic guide
  category: varchar("category", { length: 100 }), // e.g., "Product Names", "Technical Terms"
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomVocabulary = typeof customVocabulary.$inferSelect;
export type InsertCustomVocabulary = typeof customVocabulary.$inferInsert;

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
  observations: text("observations"),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "archived", "deleted"]).default("draft").notNull(),
  overallConditionScore: int("overallConditionScore"), // Calculated overall building condition score
  overallFciScore: int("overallFciScore"), // Overall Facility Condition Index (0-100)
  overallConditionRating: varchar("overallConditionRating", { length: 50 }), // e.g., "Good", "Fair", "Poor"
  
  // Automated CI/FCI calculations
  ci: decimal("ci", { precision: 5, scale: 2 }), // Condition Index (0-100, higher is better)
  fci: decimal("fci", { precision: 5, scale: 4 }), // Facility Condition Index (0-1, lower is better)
  deferredMaintenanceCost: decimal("deferredMaintenanceCost", { precision: 15, scale: 2 }),
  currentReplacementValue: decimal("currentReplacementValue", { precision: 15, scale: 2 }),
  lastCalculatedAt: timestamp("lastCalculatedAt"),
  
  // Facility lifecycle information
  designLife: int("designLife"), // Expected design life in years (e.g., 50)
  endOfLifeDate: timestamp("endOfLifeDate"), // Calculated end of life date
  
  // Administrative information
  holdingDepartment: varchar("holdingDepartment", { length: 255 }),
  propertyManager: varchar("propertyManager", { length: 255 }),
  managerEmail: varchar("managerEmail", { length: 320 }),
  managerPhone: varchar("managerPhone", { length: 50 }),
  facilityType: varchar("facilityType", { length: 100 }), // e.g., "Recreation Center", "Office Building"
  occupancyStatus: mysqlEnum("occupancyStatus", ["occupied", "vacant", "partial"]),
  criticalityLevel: mysqlEnum("criticalityLevel", ["critical", "important", "standard"]),
  company: varchar("company", { length: 255 }), // Company that created this project
  
  // Soft delete fields
  deletedAt: timestamp("deletedAt"),
  deletedBy: int("deletedBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Assets table - represents individual buildings/facilities within a project
 * A project can have multiple assets, and each asset has its own assessments
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  assetType: varchar("assetType", { length: 100 }), // e.g., "Building A", "Parking Structure", "Pool House"
  address: text("address"),
  yearBuilt: int("yearBuilt"),
  grossFloorArea: int("grossFloorArea"), // in square feet
  numberOfStories: int("numberOfStories"),
  constructionType: varchar("constructionType", { length: 100 }),
  currentReplacementValue: decimal("currentReplacementValue", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["active", "inactive", "demolished"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Asset documents - stores PDF/Word files uploaded for each asset
 */
export const assetDocuments = mysqlTable("asset_documents", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(), // User who uploaded the document
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 file key
  fileUrl: text("fileUrl").notNull(), // S3 public URL
  fileSize: int("fileSize").notNull(), // File size in bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(), // e.g., "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  description: text("description"), // Optional description of the document
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetDocument = typeof assetDocuments.$inferSelect;
export type InsertAssetDocument = typeof assetDocuments.$inferInsert;

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
 * Custom components - project-specific components not in standard UNIFORMAT II
 */
export const customComponents = mysqlTable("custom_components", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  level: int("level").notNull(), // 2=Group, 3=Individual Element (custom components can't be level 1)
  parentCode: varchar("parentCode", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: int("createdBy").notNull(), // userId who created it
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomComponent = typeof customComponents.$inferSelect;
export type InsertCustomComponent = typeof customComponents.$inferInsert;

/**
 * Assessments - links projects to building components with condition ratings
 */
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  assetId: int("assetId"), // Links assessment to a specific asset (optional for backward compatibility)
  sectionId: int("sectionId"),
  componentCode: varchar("componentCode", { length: 20 }),
  componentName: varchar("componentName", { length: 255 }),
  componentLocation: varchar("componentLocation", { length: 255 }),
  condition: mysqlEnum("condition", ["good", "fair", "poor", "not_assessed"]).default("not_assessed"),
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
  hasValidationOverrides: int("hasValidationOverrides").default(0), // 1 if user overrode any warnings
  validationWarnings: text("validationWarnings"), // JSON: Array of warnings that were shown
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

/**
 * Validation rules - Configurable business rules for data validation
 */
export const validationRules = mysqlTable("validation_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: mysqlEnum("ruleType", [
    "date_range",
    "numeric_range",
    "required_field",
    "custom_logic",
    "same_year_inspection"
  ]).notNull(),
  severity: mysqlEnum("severity", ["error", "warning", "info"]).default("warning").notNull(),
  field: varchar("field", { length: 100 }).notNull(), // Field name being validated
  condition: text("condition").notNull(), // JSON: validation condition parameters
  message: text("message").notNull(), // Message to display when rule is triggered
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  projectId: int("projectId"), // null = global rule, otherwise project-specific
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ValidationRule = typeof validationRules.$inferSelect;
export type InsertValidationRule = typeof validationRules.$inferInsert;

/**
 * Validation overrides - Log when users override validation warnings
 */
export const validationOverrides = mysqlTable("validation_overrides", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId").notNull(),
  assessmentId: int("assessmentId"),
  deficiencyId: int("deficiencyId"),
  projectId: int("projectId").notNull(),
  fieldName: varchar("fieldName", { length: 100 }).notNull(),
  originalValue: text("originalValue"),
  overriddenValue: text("overriddenValue"),
  justification: text("justification"), // User's reason for overriding
  overriddenBy: int("overriddenBy").notNull(),
  overriddenAt: timestamp("overriddenAt").defaultNow().notNull(),
});

export type ValidationOverride = typeof validationOverrides.$inferSelect;
export type InsertValidationOverride = typeof validationOverrides.$inferInsert;

/**
 * Component history - Permanent lifecycle log for all changes to component-related data
 * Tracks notes, specifications, deficiencies, recommendations, and assessments over time
 */
export const componentHistory = mysqlTable("component_history", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  componentCode: varchar("componentCode", { length: 50 }).notNull(),
  componentName: varchar("componentName", { length: 255 }),
  
  // Change tracking
  changeType: mysqlEnum("changeType", [
    "assessment_created",
    "assessment_updated",
    "deficiency_created",
    "deficiency_updated",
    "note_added",
    "specification_updated",
    "recommendation_added",
    "recommendation_updated",
    "status_changed",
    "cost_updated"
  ]).notNull(),
  
  // Field-level tracking
  fieldName: varchar("fieldName", { length: 100 }), // e.g., "observations", "recommendations", "condition"
  oldValue: text("oldValue"), // Previous value (plain text or JSON)
  newValue: text("newValue"), // New value (plain text or JSON)
  
  // Rich text content
  richTextContent: text("richTextContent"), // HTML formatted content for display
  
  // Related entity IDs
  assessmentId: int("assessmentId"),
  deficiencyId: int("deficiencyId"),
  
  // Metadata
  userId: int("userId").notNull(), // Who made the change
  userName: varchar("userName", { length: 255 }), // Denormalized for historical accuracy
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Additional context
  summary: varchar("summary", { length: 500 }), // Brief description of the change
  tags: text("tags"), // JSON array of tags for categorization
}, (table) => ({
  // Indexes for efficient querying
  componentIdx: {
    name: "component_idx",
    columns: [table.projectId, table.componentCode, table.timestamp],
  },
  timestampIdx: {
    name: "timestamp_idx",
    columns: [table.timestamp],
  },
  userIdx: {
    name: "user_idx",
    columns: [table.userId],
  },
}));

export type ComponentHistory = typeof componentHistory.$inferSelect;
export type InsertComponentHistory = typeof componentHistory.$inferInsert;


/**
 * Consultant submissions - Track bulk data upload batches from 3rd party consultants
 */
export const consultantSubmissions = mysqlTable("consultant_submissions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // Submission metadata
  submissionId: varchar("submissionId", { length: 50 }).notNull().unique(), // Unique tracking ID
  submittedBy: int("submittedBy").notNull(), // User ID of consultant
  consultantName: varchar("consultantName", { length: 255 }),
  consultantEmail: varchar("consultantEmail", { length: 320 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  
  // Submission content
  dataType: mysqlEnum("dataType", ["assessments", "deficiencies", "mixed"]).notNull(),
  fileName: varchar("fileName", { length: 255 }), // Original uploaded file name
  totalItems: int("totalItems").default(0).notNull(),
  validItems: int("validItems").default(0).notNull(),
  invalidItems: int("invalidItems").default(0).notNull(),
  
  // Review workflow
  status: mysqlEnum("status", [
    "pending_review",
    "under_review",
    "approved",
    "rejected",
    "partially_approved",
    "finalized"
  ]).default("pending_review").notNull(),
  
  reviewedBy: int("reviewedBy"), // User ID of city staff reviewer
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"), // Feedback from reviewer
  
  // Finalization
  finalizedAt: timestamp("finalizedAt"),
  finalizedBy: int("finalizedBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConsultantSubmission = typeof consultantSubmissions.$inferSelect;
export type InsertConsultantSubmission = typeof consultantSubmissions.$inferInsert;

/**
 * Submission items - Staging area for individual records before approval
 */
export const submissionItems = mysqlTable("submission_items", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(), // FK to consultant_submissions
  projectId: int("projectId").notNull(),
  
  // Item type and data
  itemType: mysqlEnum("itemType", ["assessment", "deficiency"]).notNull(),
  rowNumber: int("rowNumber"), // Row in spreadsheet for error reporting
  
  // Staged data (JSON blob containing the parsed row data)
  data: text("data").notNull(), // JSON string of the item data
  
  // Validation
  validationStatus: mysqlEnum("validationStatus", ["valid", "warning", "error"]).notNull(),
  validationErrors: text("validationErrors"), // JSON array of error messages
  
  // Review status for this specific item
  itemStatus: mysqlEnum("itemStatus", [
    "pending",
    "approved",
    "rejected"
  ]).default("pending").notNull(),
  
  reviewNotes: text("reviewNotes"), // Item-specific feedback
  
  // Link to finalized record (after approval)
  finalizedAssessmentId: int("finalizedAssessmentId"),
  finalizedDeficiencyId: int("finalizedDeficiencyId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubmissionItem = typeof submissionItems.$inferSelect;
export type InsertSubmissionItem = typeof submissionItems.$inferInsert;

/**
 * Submission photos - Staging area for photos uploaded with consultant submissions
 */
export const submissionPhotos = mysqlTable("submission_photos", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  submissionItemId: int("submissionItemId"), // Link to specific item if applicable
  
  // Photo metadata
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"), // Bytes
  mimeType: varchar("mimeType", { length: 100 }),
  
  // Storage
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  url: varchar("url", { length: 1000 }).notNull(), // S3 URL
  thumbnailUrl: varchar("thumbnailUrl", { length: 1000 }),
  
  // Component linkage (from spreadsheet)
  componentCode: varchar("componentCode", { length: 50 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  
  // Link to finalized photo (after approval)
  finalizedPhotoId: int("finalizedPhotoId"),
  
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type SubmissionPhoto = typeof submissionPhotos.$inferSelect;
export type InsertSubmissionPhoto = typeof submissionPhotos.$inferInsert;


/**
 * Deterioration Curves - Best/Design/Worst case scenarios for component lifecycle modeling
 * Each curve has 6 parameters representing condition at different time points
 */
export const deteriorationCurves = mysqlTable("deterioration_curves", {
  id: int("id").autoincrement().primaryKey(),
  
  // Curve identification
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Roof Membrane - Best Case"
  curveType: mysqlEnum("curveType", ["best", "design", "worst"]).notNull(),
  componentType: varchar("componentType", { length: 100 }), // UNIFORMAT II code or category
  
  // 6 curve parameters (condition percentages at different years)
  // These represent points on the deterioration curve
  param1: int("param1").notNull(), // Initial condition (% of ESL, typically 100)
  param2: int("param2").notNull(), // Condition at year 1
  param3: int("param3").notNull(), // Condition at year 2
  param4: int("param4").notNull(), // Condition at year 3
  param5: int("param5").notNull(), // Condition at year 4
  param6: int("param6").notNull(), // Condition at year 5 (or failure threshold)
  
  // Curve metadata
  description: text("description"),
  isDefault: boolean("isDefault").default(false), // System-provided default curves
  interpolationType: mysqlEnum("interpolationType", ["linear", "polynomial", "exponential"]).default("linear"),
  
  // Ownership
  createdBy: int("createdBy"), // User who created custom curve
  projectId: int("projectId"), // Project-specific curve, null for global
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DeteriorationCurve = typeof deteriorationCurves.$inferSelect;
export type InsertDeteriorationCurve = typeof deteriorationCurves.$inferInsert;

/**
 * Component Deterioration Config - Assigns curves to specific components
 */
export const componentDeteriorationConfig = mysqlTable("component_deterioration_config", {
  id: int("id").autoincrement().primaryKey(),
  
  projectId: int("projectId").notNull(),
  componentCode: varchar("componentCode", { length: 50 }).notNull(),
  
  // Assigned curves
  bestCaseCurveId: int("bestCaseCurveId"),
  designCaseCurveId: int("designCaseCurveId"),
  worstCaseCurveId: int("worstCaseCurveId"),
  
  // Active curve selection
  activeCurve: mysqlEnum("activeCurve", ["best", "design", "worst"]).default("design"),
  
  // Override parameters (if user wants to fine-tune without creating new curve)
  customParam1: int("customParam1"),
  customParam2: int("customParam2"),
  customParam3: int("customParam3"),
  customParam4: int("customParam4"),
  customParam5: int("customParam5"),
  customParam6: int("customParam6"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ComponentDeteriorationConfig = typeof componentDeteriorationConfig.$inferSelect;
export type InsertComponentDeteriorationConfig = typeof componentDeteriorationConfig.$inferInsert;

/**
 * Prediction History - Track predictions over time for accuracy analysis
 */
export const predictionHistory = mysqlTable("prediction_history", {
  id: int("id").autoincrement().primaryKey(),
  
  projectId: int("projectId").notNull(),
  componentCode: varchar("componentCode", { length: 50 }).notNull(),
  assessmentId: int("assessmentId"), // Assessment that triggered prediction
  
  // Prediction details
  predictionDate: timestamp("predictionDate").defaultNow().notNull(),
  predictedFailureYear: int("predictedFailureYear"),
  predictedRemainingLife: int("predictedRemainingLife"), // Years
  predictedCondition: int("predictedCondition"), // Condition percentage at prediction date
  
  // Confidence and methodology
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }), // 0-100%
  predictionMethod: mysqlEnum("predictionMethod", [
    "curve_based",
    "ml_model",
    "historical_trend",
    "hybrid"
  ]).default("curve_based"),
  
  // Model information
  modelVersion: varchar("modelVersion", { length: 50 }),
  curveUsed: mysqlEnum("curveUsed", ["best", "design", "worst"]),
  
  // Actual outcome (for validation)
  actualFailureYear: int("actualFailureYear"),
  actualConditionAtDate: int("actualConditionAtDate"),
  predictionAccuracy: decimal("predictionAccuracy", { precision: 5, scale: 2 }), // Calculated later
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PredictionHistory = typeof predictionHistory.$inferSelect;
export type InsertPredictionHistory = typeof predictionHistory.$inferInsert;

/**
 * CI/FCI Snapshots - Track Condition Index and Facility Condition Index over time
 */
export const ciFciSnapshots = mysqlTable("ci_fci_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  
  projectId: int("projectId").notNull(),
  
  // Hierarchy level
  level: mysqlEnum("level", ["component", "system", "building", "portfolio"]).notNull(),
  entityId: varchar("entityId", { length: 100 }), // componentCode, systemName, buildingId, or null for portfolio
  
  // Condition Index (0-100, higher is better)
  ci: decimal("ci", { precision: 5, scale: 2 }),
  
  // Facility Condition Index (0-1, lower is better)
  // FCI = Deferred Maintenance Cost / Current Replacement Value
  fci: decimal("fci", { precision: 5, scale: 4 }),
  
  // Supporting metrics
  deferredMaintenanceCost: decimal("deferredMaintenanceCost", { precision: 15, scale: 2 }),
  currentReplacementValue: decimal("currentReplacementValue", { precision: 15, scale: 2 }),
  
  // Metadata
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  calculationMethod: varchar("calculationMethod", { length: 50 }), // "weighted_avg", "direct", etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CiFciSnapshot = typeof ciFciSnapshots.$inferSelect;
export type InsertCiFciSnapshot = typeof ciFciSnapshots.$inferInsert;

/**
 * Optimization Scenarios - Store different maintenance strategy scenarios for comparison
 */
export const optimizationScenarios = mysqlTable("optimization_scenarios", {
  id: int("id").autoincrement().primaryKey(),
  
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(), // Creator
  
  // Scenario details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Constraints
  budgetConstraint: decimal("budgetConstraint", { precision: 15, scale: 2 }), // Total budget available
  budgetType: mysqlEnum("budgetType", ["hard", "soft"]).default("hard"), // hard = cannot exceed, soft = prefer but can exceed
  timeHorizon: int("timeHorizon").notNull(), // Years (5, 10, 20, 30)
  discountRate: decimal("discountRate", { precision: 5, scale: 4 }).default("0.0300"), // 3% default
  
  // Optimization parameters
  optimizationGoal: mysqlEnum("optimizationGoal", [
    "minimize_cost",
    "maximize_ci",
    "maximize_roi",
    "minimize_risk"
  ]).default("maximize_roi"),
  
  // Results (populated after optimization)
  totalCost: decimal("totalCost", { precision: 15, scale: 2 }),
  totalBenefit: decimal("totalBenefit", { precision: 15, scale: 2 }),
  netPresentValue: decimal("netPresentValue", { precision: 15, scale: 2 }),
  returnOnInvestment: decimal("returnOnInvestment", { precision: 5, scale: 2 }), // Percentage
  paybackPeriod: decimal("paybackPeriod", { precision: 5, scale: 1 }), // Years
  
  // Condition improvements
  currentCI: decimal("currentCI", { precision: 5, scale: 2 }),
  projectedCI: decimal("projectedCI", { precision: 5, scale: 2 }),
  ciImprovement: decimal("ciImprovement", { precision: 5, scale: 2 }),
  
  currentFCI: decimal("currentFCI", { precision: 5, scale: 4 }),
  projectedFCI: decimal("projectedFCI", { precision: 5, scale: 4 }),
  fciImprovement: decimal("fciImprovement", { precision: 5, scale: 4 }),
  
  // Risk metrics
  currentRiskScore: decimal("currentRiskScore", { precision: 5, scale: 2 }),
  projectedRiskScore: decimal("projectedRiskScore", { precision: 5, scale: 2 }),
  riskReduction: decimal("riskReduction", { precision: 5, scale: 2 }),
  
  // Status
  status: mysqlEnum("status", ["draft", "optimized", "approved", "implemented"]).default("draft"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OptimizationScenario = typeof optimizationScenarios.$inferSelect;
export type InsertOptimizationScenario = typeof optimizationScenarios.$inferInsert;

/**
 * Scenario Strategies - Individual component strategies within a scenario
 */
export const scenarioStrategies = mysqlTable("scenario_strategies", {
  id: int("id").autoincrement().primaryKey(),
  
  scenarioId: int("scenarioId").notNull(),
  componentCode: varchar("componentCode", { length: 50 }).notNull(),
  
  // Strategy selection
  strategy: mysqlEnum("strategy", [
    "replace",
    "rehabilitate",
    "defer",
    "do_nothing"
  ]).notNull(),
  
  // Timing
  actionYear: int("actionYear").notNull(), // Year to execute strategy
  deferralYears: int("deferralYears").default(0), // Years deferred from immediate need
  
  // Costs
  strategyCost: decimal("strategyCost", { precision: 15, scale: 2 }).notNull(),
  presentValueCost: decimal("presentValueCost", { precision: 15, scale: 2 }), // Discounted to present
  
  // Benefits
  lifeExtension: int("lifeExtension"), // Years of additional life gained
  conditionImprovement: int("conditionImprovement"), // Condition percentage improvement
  riskReduction: decimal("riskReduction", { precision: 5, scale: 2 }), // Risk score reduction
  
  // Cost avoidance
  failureCostAvoided: decimal("failureCostAvoided", { precision: 15, scale: 2 }),
  maintenanceSavings: decimal("maintenanceSavings", { precision: 15, scale: 2 }),
  
  // Priority (for budget-constrained optimization)
  priorityScore: decimal("priorityScore", { precision: 10, scale: 4 }), // Higher = more important
  selected: int("selected").default(0), // 1 if included in optimized plan, 0 if not
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScenarioStrategy = typeof scenarioStrategies.$inferSelect;
export type InsertScenarioStrategy = typeof scenarioStrategies.$inferInsert;

/**
 * Cash Flow Projections - Year-by-year financial projections for scenarios
 */
export const cashFlowProjections = mysqlTable("cash_flow_projections", {
  id: int("id").autoincrement().primaryKey(),
  
  scenarioId: int("scenarioId").notNull(),
  year: int("year").notNull(), // Projection year (0 = current year)
  
  // Costs
  capitalExpenditure: decimal("capitalExpenditure", { precision: 15, scale: 2 }).default("0"),
  maintenanceCost: decimal("maintenanceCost", { precision: 15, scale: 2 }).default("0"),
  operatingCost: decimal("operatingCost", { precision: 15, scale: 2 }).default("0"),
  totalCost: decimal("totalCost", { precision: 15, scale: 2 }).default("0"),
  
  // Benefits
  costAvoidance: decimal("costAvoidance", { precision: 15, scale: 2 }).default("0"),
  efficiencyGains: decimal("efficiencyGains", { precision: 15, scale: 2 }).default("0"),
  totalBenefit: decimal("totalBenefit", { precision: 15, scale: 2 }).default("0"),
  
  // Net cash flow
  netCashFlow: decimal("netCashFlow", { precision: 15, scale: 2 }).default("0"),
  cumulativeCashFlow: decimal("cumulativeCashFlow", { precision: 15, scale: 2 }).default("0"),
  
  // Condition metrics
  projectedCI: decimal("projectedCI", { precision: 5, scale: 2 }),
  projectedFCI: decimal("projectedFCI", { precision: 5, scale: 4 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CashFlowProjection = typeof cashFlowProjections.$inferSelect;
export type InsertCashFlowProjection = typeof cashFlowProjections.$inferInsert;

/**
 * ===================================================================
 * MULTI-CRITERIA PRIORITIZATION SCHEMA
 * ===================================================================
 * Enables facility asset management teams to score and rank projects
 * based on multiple strategic factors beyond just condition
 */

/**
 * Prioritization criteria definitions
 * Examples: Urgency, Mission Criticality, Energy Savings, Code Compliance, Safety
 */
export const prioritizationCriteria = mysqlTable("prioritization_criteria", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "risk",
    "strategic",
    "compliance",
    "financial",
    "operational",
    "environmental",
  ]).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("10.00"), // Percentage weight (0-100)
  scoringGuideline: text("scoringGuideline"), // Description of what each score level means
  isActive: int("isActive").notNull().default(1),
  displayOrder: int("displayOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrioritizationCriteria = typeof prioritizationCriteria.$inferSelect;
export type InsertPrioritizationCriteria = typeof prioritizationCriteria.$inferInsert;

/**
 * Project scores for each criteria
 * Stores individual criterion scores and justifications
 */
export const projectScores = mysqlTable("project_scores", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  criteriaId: int("criteriaId").notNull(),
  score: decimal("score", { precision: 4, scale: 2 }).notNull(), // 0-10 scale
  justification: text("justification"), // Why this score was assigned
  scoredBy: int("scoredBy").notNull(), // User ID who scored
  scoredAt: timestamp("scoredAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectScore = typeof projectScores.$inferSelect;
export type InsertProjectScore = typeof projectScores.$inferInsert;

/**
 * Composite priority scores for projects
 * Cached weighted scores for performance
 */
export const projectPriorityScores = mysqlTable("project_priority_scores", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  compositeScore: decimal("compositeScore", { precision: 6, scale: 2 }).notNull(), // Weighted sum (0-100)
  rank: int("rank"), // Overall ranking position
  urgencyScore: decimal("urgencyScore", { precision: 4, scale: 2 }),
  missionCriticalityScore: decimal("missionCriticalityScore", { precision: 4, scale: 2 }),
  safetyScore: decimal("safetyScore", { precision: 4, scale: 2 }),
  complianceScore: decimal("complianceScore", { precision: 4, scale: 2 }),
  energySavingsScore: decimal("energySavingsScore", { precision: 4, scale: 2 }),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type ProjectPriorityScore = typeof projectPriorityScores.$inferSelect;
export type InsertProjectPriorityScore = typeof projectPriorityScores.$inferInsert;

/**
 * Criteria presets for common scenarios
 * Pre-configured weighting schemes (e.g., "Safety First", "Cost Optimization")
 */
export const criteriaPresets = mysqlTable("criteria_presets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  configuration: text("configuration").notNull(), // JSON: { criteriaId: weight, ... }
  isDefault: int("isDefault").notNull().default(0),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CriteriaPreset = typeof criteriaPresets.$inferSelect;
export type InsertCriteriaPreset = typeof criteriaPresets.$inferInsert;

/**
 * Capital budget cycles (typically 4-year planning cycles)
 */
export const capitalBudgetCycles = mysqlTable("capital_budget_cycles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  startYear: int("startYear").notNull(),
  endYear: int("endYear").notNull(),
  totalBudget: decimal("totalBudget", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["planning", "approved", "active", "completed"]).notNull().default("planning"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CapitalBudgetCycle = typeof capitalBudgetCycles.$inferSelect;
export type InsertCapitalBudgetCycle = typeof capitalBudgetCycles.$inferInsert;

/**
 * Budget allocations - assigns projects to specific years within a cycle
 */
export const budgetAllocations = mysqlTable("budget_allocations", {
  id: int("id").autoincrement().primaryKey(),
  cycleId: int("cycleId").notNull(),
  projectId: int("projectId").notNull(),
  year: int("year").notNull(),
  allocatedAmount: decimal("allocatedAmount", { precision: 15, scale: 2 }).notNull(),
  priority: int("priority").notNull(), // Priority rank within the year
  status: mysqlEnum("status", ["proposed", "approved", "funded", "completed"]).notNull().default("proposed"),
  justification: text("justification"),
  strategicAlignment: text("strategicAlignment"), // How this aligns with strategic objectives
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type InsertBudgetAllocation = typeof budgetAllocations.$inferInsert;

/**
 * Strategic objectives that criteria can align with
 */
export const strategicObjectives = mysqlTable("strategic_objectives", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  targetYear: int("targetYear"),
  isActive: int("isActive").notNull().default(1),
  displayOrder: int("displayOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StrategicObjective = typeof strategicObjectives.$inferSelect;
export type InsertStrategicObjective = typeof strategicObjectives.$inferInsert;

/**
 * Links criteria to strategic objectives
 */
export const criteriaObjectiveLinks = mysqlTable("criteria_objective_links", {
  id: int("id").autoincrement().primaryKey(),
  criteriaId: int("criteriaId").notNull(),
  objectiveId: int("objectiveId").notNull(),
  alignmentStrength: decimal("alignmentStrength", { precision: 3, scale: 2 }).notNull().default("1.00"), // 0-1 scale
});

export type CriteriaObjectiveLink = typeof criteriaObjectiveLinks.$inferSelect;
export type InsertCriteriaObjectiveLink = typeof criteriaObjectiveLinks.$inferInsert;


// ============================================
// Risk Assessment Tables
// ============================================

/**
 * Risk assessments for components based on PoF × CoF methodology
 */
export const riskAssessments = mysqlTable("risk_assessments", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(), // Link to assessments table
  
  // Probability of Failure (1-5 scale)
  pof: decimal("pof", { precision: 3, scale: 2 }).notNull(), // 1.00 to 5.00
  pofJustification: text("pofJustification"),
  
  // Consequence of Failure (1-5 scale)
  cof: decimal("cof", { precision: 3, scale: 2 }).notNull(), // 1.00 to 5.00
  cofJustification: text("cofJustification"),
  
  // Risk Score (PoF × CoF)
  riskScore: decimal("riskScore", { precision: 5, scale: 2 }).notNull(), // 1.00 to 25.00
  riskLevel: mysqlEnum("riskLevel", ["very_low", "low", "medium", "high", "critical"]).notNull(),
  
  // Assessment metadata
  assessedBy: int("assessedBy").notNull(),
  assessedAt: timestamp("assessedAt").defaultNow().notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  status: mysqlEnum("status", ["draft", "approved", "archived"]).default("draft").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = typeof riskAssessments.$inferInsert;

/**
 * Probability of Failure factors
 */
export const pofFactors = mysqlTable("pof_factors", {
  id: int("id").autoincrement().primaryKey(),
  riskAssessmentId: int("riskAssessmentId").notNull(),
  
  // Age-related factors
  age: int("age"), // Years since installation
  expectedUsefulLife: int("expectedUsefulLife"), // Years
  remainingLifePercent: decimal("remainingLifePercent", { precision: 5, scale: 2 }),
  
  // Condition-related factors
  conditionIndex: decimal("conditionIndex", { precision: 5, scale: 2 }),
  defectSeverity: mysqlEnum("defectSeverity", ["none", "minor", "moderate", "major", "critical"]),
  
  // Maintenance-related factors
  maintenanceFrequency: mysqlEnum("maintenanceFrequency", ["none", "reactive", "scheduled", "preventive", "predictive"]),
  lastMaintenanceDate: timestamp("lastMaintenanceDate"),
  deferredMaintenanceYears: int("deferredMaintenanceYears"),
  
  // Operating environment
  operatingEnvironment: mysqlEnum("operatingEnvironment", ["controlled", "normal", "harsh", "extreme"]),
  utilizationRate: decimal("utilizationRate", { precision: 5, scale: 2 }), // % of design capacity
  
  // Equipment-specific factors
  equipmentType: varchar("equipmentType", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PofFactor = typeof pofFactors.$inferSelect;
export type InsertPofFactor = typeof pofFactors.$inferInsert;

/**
 * Consequence of Failure factors
 */
export const cofFactors = mysqlTable("cof_factors", {
  id: int("id").autoincrement().primaryKey(),
  riskAssessmentId: int("riskAssessmentId").notNull(),
  
  // Safety consequences (1-5 scale)
  safetyImpact: decimal("safetyImpact", { precision: 3, scale: 2 }).notNull(),
  safetyNotes: text("safetyNotes"),
  
  // Operational consequences (1-5 scale)
  operationalImpact: decimal("operationalImpact", { precision: 3, scale: 2 }).notNull(),
  downtimeDays: decimal("downtimeDays", { precision: 5, scale: 1 }),
  affectedSystems: text("affectedSystems"), // JSON array of dependent systems
  operationalNotes: text("operationalNotes"),
  
  // Financial consequences (1-5 scale)
  financialImpact: decimal("financialImpact", { precision: 3, scale: 2 }).notNull(),
  repairCost: decimal("repairCost", { precision: 15, scale: 2 }),
  revenueLoss: decimal("revenueLoss", { precision: 15, scale: 2 }),
  penaltyCost: decimal("penaltyCost", { precision: 15, scale: 2 }),
  financialNotes: text("financialNotes"),
  
  // Environmental consequences (1-5 scale)
  environmentalImpact: decimal("environmentalImpact", { precision: 3, scale: 2 }).notNull(),
  environmentalNotes: text("environmentalNotes"),
  
  // Reputational consequences (1-5 scale)
  reputationalImpact: decimal("reputationalImpact", { precision: 3, scale: 2 }).notNull(),
  reputationalNotes: text("reputationalNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CofFactor = typeof cofFactors.$inferSelect;
export type InsertCofFactor = typeof cofFactors.$inferInsert;

/**
 * Critical equipment registry
 */
export const criticalEquipment = mysqlTable("critical_equipment", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull().unique(), // Link to assessments table
  
  criticalityLevel: mysqlEnum("criticalityLevel", ["critical", "important", "standard"]).notNull(),
  criticalityJustification: text("criticalityJustification"),
  
  // Classification
  isSafetyRelated: int("isSafetyRelated").default(0),
  isMissionCritical: int("isMissionCritical").default(0),
  isHighValue: int("isHighValue").default(0),
  hasRedundancy: int("hasRedundancy").default(0),
  
  // Mitigation
  mitigationStrategies: text("mitigationStrategies"), // JSON array
  contingencyPlan: text("contingencyPlan"),
  
  designatedBy: int("designatedBy").notNull(),
  designatedAt: timestamp("designatedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CriticalEquipment = typeof criticalEquipment.$inferSelect;
export type InsertCriticalEquipment = typeof criticalEquipment.$inferInsert;

/**
 * Risk mitigation actions
 */
export const riskMitigationActions = mysqlTable("risk_mitigation_actions", {
  id: int("id").autoincrement().primaryKey(),
  riskAssessmentId: int("riskAssessmentId").notNull(),
  
  action: text("action").notNull(),
  actionType: mysqlEnum("actionType", ["inspection", "maintenance", "repair", "replacement", "monitoring", "procedure_change", "training"]).notNull(),
  
  priority: mysqlEnum("priority", ["immediate", "high", "medium", "low"]).notNull(),
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "cancelled"]).default("planned").notNull(),
  
  assignedTo: int("assignedTo"),
  dueDate: timestamp("dueDate"),
  completedDate: timestamp("completedDate"),
  
  estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 15, scale: 2 }),
  
  // Effectiveness tracking
  expectedRiskReduction: decimal("expectedRiskReduction", { precision: 5, scale: 2 }), // Points
  actualRiskReduction: decimal("actualRiskReduction", { precision: 5, scale: 2 }),
  effectiveness: mysqlEnum("effectiveness", ["not_effective", "partially_effective", "effective", "highly_effective"]),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RiskMitigationAction = typeof riskMitigationActions.$inferSelect;
export type InsertRiskMitigationAction = typeof riskMitigationActions.$inferInsert;

/**
 * Renovation costs table - tracks identified, planned, and executed renovation costs
 */
export const renovationCosts = mysqlTable("renovation_costs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  costType: mysqlEnum("costType", ["identified", "planned", "executed"]).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., "HVAC", "Roof", "Structural"
  fiscalYear: int("fiscalYear"),
  dateRecorded: timestamp("dateRecorded").defaultNow().notNull(),
  dateCompleted: timestamp("dateCompleted"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RenovationCost = typeof renovationCosts.$inferSelect;
export type InsertRenovationCost = typeof renovationCosts.$inferInsert;

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

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;

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
  layoutOptions: json("layoutOptions"),
  contentOptions: json("contentOptions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportSection = typeof reportSections.$inferSelect;
export type InsertReportSection = typeof reportSections.$inferInsert;

/**
 * Report configurations - Branding and formatting options
 */
export const reportConfigurations = mysqlTable("report_configurations", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull().unique(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  headerText: text("headerText"),
  footerText: text("footerText"),
  colorScheme: json("colorScheme"),
  fontOptions: json("fontOptions"),
  pageOptions: json("pageOptions"),
  coverPageOptions: json("coverPageOptions"),
  tableOfContents: boolean("tableOfContents").default(true).notNull(),
  disclaimerText: text("disclaimerText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportConfiguration = typeof reportConfigurations.$inferSelect;
export type InsertReportConfiguration = typeof reportConfigurations.$inferInsert;

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

export type ReportHistory = typeof reportHistory.$inferSelect;
export type InsertReportHistory = typeof reportHistory.$inferInsert;

/**
 * Maintenance entries - Track multiple maintenance actions per component
 */
export const maintenanceEntries = mysqlTable("maintenance_entries", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  assessmentId: int("assessmentId"), // Link to specific assessment if applicable
  componentName: varchar("componentName", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  
  // Entry classification
  entryType: mysqlEnum("entryType", ["identified", "executed"]).notNull(),
  actionType: mysqlEnum("actionType", [
    "repair",
    "rehabilitation",
    "replacement",
    "preventive_maintenance",
    "emergency_repair",
    "inspection",
    "upgrade"
  ]).notNull(),
  lifecycleStage: mysqlEnum("lifecycleStage", [
    "installation",
    "routine_maintenance",
    "major_repair",
    "replacement",
    "decommission"
  ]),
  
  // Description and details
  description: text("description").notNull(),
  workPerformed: text("workPerformed"), // For executed entries
  findings: text("findings"), // Inspection findings
  
  // Cost tracking
  estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 15, scale: 2 }),
  costVariance: decimal("costVariance", { precision: 15, scale: 2 }), // Calculated: actual - estimated
  costVariancePercent: decimal("costVariancePercent", { precision: 5, scale: 2 }), // Calculated: (variance / estimated) * 100
  
  // Status and timeline
  status: mysqlEnum("status", [
    "planned",
    "approved",
    "in_progress",
    "completed",
    "deferred",
    "cancelled"
  ]).default("planned").notNull(),
  priority: mysqlEnum("priority", ["immediate", "high", "medium", "low"]).default("medium").notNull(),
  
  dateIdentified: timestamp("dateIdentified"),
  dateScheduled: timestamp("dateScheduled"),
  dateStarted: timestamp("dateStarted"),
  dateCompleted: timestamp("dateCompleted"),
  
  // Recurring maintenance
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurringFrequency: mysqlEnum("recurringFrequency", [
    "weekly",
    "monthly",
    "quarterly",
    "semi_annual",
    "annual",
    "biennial"
  ]),
  nextDueDate: timestamp("nextDueDate"),
  lastCompletedDate: timestamp("lastCompletedDate"),
  
  // Contractor and warranty
  contractor: varchar("contractor", { length: 255 }),
  contractorContact: varchar("contractorContact", { length: 255 }),
  warrantyExpiry: timestamp("warrantyExpiry"),
  
  // Component lifecycle tracking
  componentAge: int("componentAge"), // Age in years at time of maintenance
  cumulativeCost: decimal("cumulativeCost", { precision: 15, scale: 2 }), // Total maintenance cost to date
  
  // Notes and attachments
  notes: text("notes"),
  attachments: json("attachments"), // Array of file URLs
  
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceEntry = typeof maintenanceEntries.$inferSelect;
export type InsertMaintenanceEntry = typeof maintenanceEntries.$inferInsert;


// 3D Digital Twin Models
export const facilityModels = mysqlTable("facility_models", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileSize: int("fileSize"),
  format: mysqlEnum("format", ["glb", "gltf", "fbx", "obj"]).notNull(),
  version: int("version").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  metadata: json("metadata"), // { bounds, vertexCount, materialCount, etc. }
  uploadedBy: int("uploadedBy").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const modelAnnotations = mysqlTable("model_annotations", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("modelId").notNull(),
  projectId: int("projectId").notNull(),
  componentName: varchar("componentName", { length: 255 }),
  assessmentId: int("assessmentId"),
  deficiencyId: int("deficiencyId"),
  maintenanceEntryId: int("maintenanceEntryId"),
  annotationType: mysqlEnum("annotationType", ["deficiency", "assessment", "maintenance", "note", "issue"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  positionX: decimal("positionX", { precision: 10, scale: 6 }).notNull(),
  positionY: decimal("positionY", { precision: 10, scale: 6 }).notNull(),
  positionZ: decimal("positionZ", { precision: 10, scale: 6 }).notNull(),
  cameraPosition: json("cameraPosition"), // { x, y, z }
  cameraTarget: json("cameraTarget"), // { x, y, z }
  priority: mysqlEnum("priority", ["immediate", "high", "medium", "low"]),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const modelViewpoints = mysqlTable("model_viewpoints", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("modelId").notNull(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cameraPosition: json("cameraPosition").notNull(), // { x, y, z }
  cameraTarget: json("cameraTarget").notNull(), // { x, y, z }
  cameraZoom: decimal("cameraZoom", { precision: 10, scale: 6 }),
  visibleLayers: json("visibleLayers"), // Array of layer names
  isShared: boolean("isShared").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FacilityModel = typeof facilityModels.$inferSelect;
export type InsertFacilityModel = typeof facilityModels.$inferInsert;
export type ModelAnnotation = typeof modelAnnotations.$inferSelect;
export type InsertModelAnnotation = typeof modelAnnotations.$inferInsert;
export type ModelViewpoint = typeof modelViewpoints.$inferSelect;
export type InsertModelViewpoint = typeof modelViewpoints.$inferInsert;


// Advanced BI Dashboards
export const dashboardConfigs = mysqlTable("dashboard_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  layout: json("layout").notNull(), // Widget positions and sizes
  filters: json("filters"), // Saved filter state
  isDefault: boolean("isDefault").default(false).notNull(),
  isShared: boolean("isShared").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const kpiSnapshots = mysqlTable("kpi_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotDate: timestamp("snapshotDate").notNull(),
  portfolioFCI: decimal("portfolioFCI", { precision: 10, scale: 4 }),
  portfolioCI: decimal("portfolioCI", { precision: 10, scale: 4 }),
  totalReplacementValue: decimal("totalReplacementValue", { precision: 15, scale: 2 }),
  totalRepairCosts: decimal("totalRepairCosts", { precision: 15, scale: 2 }),
  maintenanceBacklog: decimal("maintenanceBacklog", { precision: 15, scale: 2 }),
  deferredMaintenance: decimal("deferredMaintenance", { precision: 15, scale: 2 }),
  budgetUtilization: decimal("budgetUtilization", { precision: 10, scale: 4 }),
  completedProjects: int("completedProjects"),
  activeProjects: int("activeProjects"),
  criticalDeficiencies: int("criticalDeficiencies"),
  metadata: json("metadata"), // Additional KPI data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type InsertDashboardConfig = typeof dashboardConfigs.$inferInsert;
export type KPISnapshot = typeof kpiSnapshots.$inferSelect;
export type InsertKPISnapshot = typeof kpiSnapshots.$inferInsert;


// Sustainability and ESG Tracking
export const utilityConsumption = mysqlTable("utility_consumption", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  recordDate: timestamp("recordDate").notNull(),
  utilityType: mysqlEnum("utilityType", ["electricity", "natural_gas", "water", "steam", "chilled_water"]).notNull(),
  consumption: decimal("consumption", { precision: 15, scale: 4 }).notNull(), // kWh, therms, gallons, etc.
  unit: varchar("unit", { length: 50 }).notNull(), // kWh, therms, gallons, etc.
  cost: decimal("cost", { precision: 15, scale: 2 }),
  source: varchar("source", { length: 100 }), // Utility provider
  isRenewable: boolean("isRenewable").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const wasteTracking = mysqlTable("waste_tracking", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  recordDate: timestamp("recordDate").notNull(),
  wasteType: mysqlEnum("wasteType", ["general", "recycling", "compost", "hazardous", "construction"]).notNull(),
  weight: decimal("weight", { precision: 15, scale: 4 }).notNull(), // kg or lbs
  unit: varchar("unit", { length: 20 }).notNull(),
  disposalMethod: varchar("disposalMethod", { length: 100 }), // Landfill, recycling center, etc.
  cost: decimal("cost", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emissionsData = mysqlTable("emissions_data", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  recordDate: timestamp("recordDate").notNull(),
  scope: mysqlEnum("scope", ["scope1", "scope2", "scope3"]).notNull(),
  emissionSource: varchar("emissionSource", { length: 255 }).notNull(), // e.g., "Natural Gas Combustion", "Purchased Electricity"
  co2Equivalent: decimal("co2Equivalent", { precision: 15, scale: 4 }).notNull(), // metric tons CO2e
  calculationMethod: varchar("calculationMethod", { length: 255 }), // e.g., "EPA emission factors"
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sustainabilityGoals = mysqlTable("sustainability_goals", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"), // null for portfolio-wide goals
  goalType: mysqlEnum("goalType", ["energy_reduction", "water_reduction", "waste_reduction", "carbon_reduction", "renewable_energy"]).notNull(),
  baselineValue: decimal("baselineValue", { precision: 15, scale: 4 }).notNull(),
  baselineYear: int("baselineYear").notNull(),
  targetValue: decimal("targetValue", { precision: 15, scale: 4 }).notNull(),
  targetYear: int("targetYear").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["active", "achieved", "missed", "cancelled"]).default("active").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const greenUpgrades = mysqlTable("green_upgrades", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  upgradeName: varchar("upgradeName", { length: 255 }).notNull(),
  upgradeType: mysqlEnum("upgradeType", ["hvac", "lighting", "insulation", "windows", "solar", "geothermal", "water_fixtures", "building_automation"]).notNull(),
  installDate: timestamp("installDate"),
  cost: decimal("cost", { precision: 15, scale: 2 }).notNull(),
  estimatedAnnualSavings: decimal("estimatedAnnualSavings", { precision: 15, scale: 2 }),
  actualAnnualSavings: decimal("actualAnnualSavings", { precision: 15, scale: 2 }),
  paybackPeriod: decimal("paybackPeriod", { precision: 10, scale: 2 }), // years
  energySavingsKWh: decimal("energySavingsKWh", { precision: 15, scale: 2 }),
  waterSavingsGallons: decimal("waterSavingsGallons", { precision: 15, scale: 2 }),
  co2ReductionMT: decimal("co2ReductionMT", { precision: 15, scale: 4 }), // metric tons
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "cancelled"]).default("planned").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const esgScores = mysqlTable("esg_scores", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  scoreDate: timestamp("scoreDate").notNull(),
  energyScore: decimal("energyScore", { precision: 5, scale: 2 }), // 0-100
  waterScore: decimal("waterScore", { precision: 5, scale: 2 }), // 0-100
  wasteScore: decimal("wasteScore", { precision: 5, scale: 2 }), // 0-100
  emissionsScore: decimal("emissionsScore", { precision: 5, scale: 2 }), // 0-100
  compositeScore: decimal("compositeScore", { precision: 5, scale: 2 }), // 0-100
  benchmarkPercentile: int("benchmarkPercentile"), // 0-100, percentile rank vs peers
  certifications: json("certifications"), // LEED, ENERGY STAR, etc.
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UtilityConsumption = typeof utilityConsumption.$inferSelect;
export type InsertUtilityConsumption = typeof utilityConsumption.$inferInsert;
export type WasteTracking = typeof wasteTracking.$inferSelect;
export type InsertWasteTracking = typeof wasteTracking.$inferInsert;
export type EmissionsData = typeof emissionsData.$inferSelect;
export type InsertEmissionsData = typeof emissionsData.$inferInsert;
export type SustainabilityGoal = typeof sustainabilityGoals.$inferSelect;
export type InsertSustainabilityGoal = typeof sustainabilityGoals.$inferInsert;
export type GreenUpgrade = typeof greenUpgrades.$inferSelect;
export type InsertGreenUpgrade = typeof greenUpgrades.$inferInsert;
export type ESGScore = typeof esgScores.$inferSelect;
export type InsertESGScore = typeof esgScores.$inferInsert;

/**
 * Project permissions - share projects with specific users
 */
export const projectPermissions = mysqlTable("project_permissions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(), // User being granted permission
  permission: mysqlEnum("permission", ["view", "edit"]).notNull(),
  grantedBy: int("grantedBy").notNull(), // User who granted the permission
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectPermission = typeof projectPermissions.$inferSelect;
export type InsertProjectPermission = typeof projectPermissions.$inferInsert;

/**
 * Access requests - pending user registration requests
 */
export const accessRequests = mysqlTable("access_requests", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull(), // From OAuth
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  useCase: text("useCase"), // Why they need access
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy"), // Admin user ID who reviewed
  adminNotes: text("adminNotes"), // Internal notes from admin
  rejectionReason: text("rejectionReason"), // Reason for rejection (shown to user)
});

export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;

/**
 * Assessment documents - PDF/Word documents attached to assessments
 * Allows users to upload source documents (BCA reports, inspection reports, etc.)
 */
export const assessmentDocuments = mysqlTable("assessment_documents", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  projectId: int("projectId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  uploadedBy: int("uploadedBy").notNull(), // userId who uploaded
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssessmentDocument = typeof assessmentDocuments.$inferSelect;
export type InsertAssessmentDocument = typeof assessmentDocuments.$inferInsert;
