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
  
  // Automated CI/FCI calculations
  ci: decimal("ci", { precision: 5, scale: 2 }), // Condition Index (0-100, higher is better)
  fci: decimal("fci", { precision: 5, scale: 4 }), // Facility Condition Index (0-1, lower is better)
  deferredMaintenanceCost: decimal("deferredMaintenanceCost", { precision: 15, scale: 2 }),
  currentReplacementValue: decimal("currentReplacementValue", { precision: 15, scale: 2 }),
  lastCalculatedAt: timestamp("lastCalculatedAt"),
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
