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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

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
  componentCode: varchar("componentCode", { length: 20 }).notNull(),
  condition: mysqlEnum("condition", ["good", "fair", "poor", "not_assessed"]).default("not_assessed").notNull(),
  observations: text("observations"),
  remainingUsefulLife: int("remainingUsefulLife"), // in years
  expectedUsefulLife: int("expectedUsefulLife"), // in years
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;

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
