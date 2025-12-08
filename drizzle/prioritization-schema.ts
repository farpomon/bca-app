import { int, mysqlTable, text, varchar, decimal, datetime, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * Multi-Criteria Prioritization Schema
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
  createdAt: datetime("createdAt").notNull().default(new Date()),
  updatedAt: datetime("updatedAt").notNull().default(new Date()),
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
  scoredAt: datetime("scoredAt").notNull().default(new Date()),
  updatedAt: datetime("updatedAt").notNull().default(new Date()),
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
  calculatedAt: datetime("calculatedAt").notNull().default(new Date()),
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
  createdAt: datetime("createdAt").notNull().default(new Date()),
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
  createdAt: datetime("createdAt").notNull().default(new Date()),
  updatedAt: datetime("updatedAt").notNull().default(new Date()),
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
  createdAt: datetime("createdAt").notNull().default(new Date()),
  updatedAt: datetime("updatedAt").notNull().default(new Date()),
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
  createdAt: datetime("createdAt").notNull().default(new Date()),
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
