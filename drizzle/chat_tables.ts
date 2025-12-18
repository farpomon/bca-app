import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, index, json } from "drizzle-orm/mysql-core";

// AI Chat Sessions table - tracks conversation contexts
export const chatSessions = mysqlTable("chat_sessions", {
  id: int().autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionType: mysqlEnum("sessionType", ['project', 'asset', 'company']).notNull(),
  contextId: int("contextId"), // projectId or assetId (NULL for company-level)
  companyId: int("companyId"), // for company-level isolation
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_user_session").on(table.userId, table.sessionType),
  index("idx_context").on(table.sessionType, table.contextId),
  index("idx_company").on(table.companyId),
]);

// Chat Messages table - stores conversation history
export const chatMessages = mysqlTable("chat_messages", {
  id: int().autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ['user', 'assistant', 'system']).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string: context data, citations, confidence scores
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("idx_session").on(table.sessionId, table.createdAt),
]);

// Chat Context Cache - stores retrieved context for faster responses
export const chatContextCache = mysqlTable("chat_context_cache", {
  id: int().autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  contextType: varchar("contextType", { length: 50 }).notNull(), // 'assessments', 'deficiencies', 'photos', 'costs', etc.
  contextData: text("contextData").notNull(), // JSON string
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
  expiresAt: timestamp("expiresAt", { mode: 'string' }),
},
(table) => [
  index("idx_session_type").on(table.sessionId, table.contextType),
]);

// Type exports
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type ChatContextCache = typeof chatContextCache.$inferSelect;
export type InsertChatContextCache = typeof chatContextCache.$inferInsert;
