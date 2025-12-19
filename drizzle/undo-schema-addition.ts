// Add these tables to drizzle/schema.ts

export const bulkOperationHistory = mysqlTable("bulk_operation_history", {
  id: int().autoincrement().notNull().primaryKey(),
  operationType: mysqlEnum(['delete_users', 'suspend_users', 'activate_users', 'change_role', 'extend_trial', 'delete_companies', 'suspend_companies', 'activate_companies', 'approve_requests', 'reject_requests']).notNull(),
  performedBy: int().notNull(),
  performedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
  affectedCount: int().notNull(),
  metadata: text(), // JSON with operation details
  undoneAt: timestamp({ mode: 'string' }),
  undoneBy: int(),
  status: mysqlEnum(['active', 'undone', 'expired']).default('active').notNull(),
},
(table) => [
  index("idx_performed_by").on(table.performedBy),
  index("idx_expires_at").on(table.expiresAt),
  index("idx_status").on(table.status),
]);

export const bulkOperationSnapshots = mysqlTable("bulk_operation_snapshots", {
  id: int().autoincrement().notNull().primaryKey(),
  operationId: int().notNull(),
  recordType: mysqlEnum(['user', 'company', 'access_request']).notNull(),
  recordId: int().notNull(),
  snapshotData: text().notNull(), // JSON with original record data
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_operation_id").on(table.operationId),
  index("idx_record").on(table.recordType, table.recordId),
]);

export type BulkOperationHistory = typeof bulkOperationHistory.$inferSelect;
export type InsertBulkOperationHistory = typeof bulkOperationHistory.$inferInsert;
export type BulkOperationSnapshot = typeof bulkOperationSnapshots.$inferSelect;
export type InsertBulkOperationSnapshot = typeof bulkOperationSnapshots.$inferInsert;
