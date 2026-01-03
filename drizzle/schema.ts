import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, mysqlEnum, timestamp, index, foreignKey, decimal, date, json, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const accessRequests = mysqlTable("access_requests", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	fullName: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	city: varchar({ length: 255 }).notNull(),
	phoneNumber: varchar({ length: 50 }),
	useCase: text(),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	submittedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewedBy: int(),
	adminNotes: text(),
	rejectionReason: text(),
});

export const smsVerificationCodes = mysqlTable("sms_verification_codes", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	phoneNumber: varchar({ length: 320 }).notNull(),
	code: varchar({ length: 64 }).notNull(), // Increased to 64 to support SHA-256 hashed codes
	purpose: varchar({ length: 50 }).notNull(),
	verified: int().default(0).notNull(),
	attempts: int().default(0).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const projectPermissions = mysqlTable("project_permissions", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	companyId: int(),
	permission: mysqlEnum(['view','edit']).default('view').notNull(),
	grantedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_project_user").on(table.projectId, table.userId),
	index("idx_company_project").on(table.companyId, table.projectId),
]);

export const companies = mysqlTable("companies", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	city: varchar({ length: 255 }),
	status: mysqlEnum(['active','suspended','inactive']).default('active').notNull(),
	contactEmail: varchar({ length: 320 }),
	contactPhone: varchar({ length: 50 }),
	address: text(),
	notes: text(),
	defaultTrialDuration: int().default(14),
	mfaRequired: int().default(0),
	maxUsers: int().default(100),
	featureAccess: text(),
	privacyLockEnabled: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

/**
 * Company Users Junction Table
 * Links users to companies with company-specific roles
 * Allows users to belong to multiple companies with different roles in each
 */
export const companyUsers = mysqlTable("company_users", {
	id: int().autoincrement().notNull().primaryKey(),
	companyId: int().notNull(),
	userId: int().notNull(),
	companyRole: mysqlEnum(['company_admin', 'project_manager', 'editor', 'viewer']).notNull(),
	invitedBy: int(),
	invitedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	status: mysqlEnum(['active', 'inactive', 'pending']).default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_company_user").on(table.companyId, table.userId),
	index("idx_user_companies").on(table.userId),
	index("idx_company_role").on(table.companyId, table.companyRole),
]);

export const companyAccessCodes = mysqlTable("company_access_codes", {
	id: int().autoincrement().notNull(),
	companyId: int().notNull(),
	code: varchar({ length: 64 }).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	usedBy: int(),
	usedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("idx_company_code").on(table.companyId, table.code),
]);

export const conversations = mysqlTable("conversations", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	contextType: mysqlEnum(['project','asset']).notNull(),
	contextId: int().notNull(),
	messages: text().notNull(), // JSON array of messages
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_conversation_context").on(table.userId, table.contextType, table.contextId),
]);

export const assetTimelineEvents = mysqlTable("asset_timeline_events", {
	id: int().autoincrement().notNull(),
	assetId: int().notNull(),
	projectId: int().notNull(),
	eventType: mysqlEnum(['assessment','deficiency','maintenance','document','schedule','custom']).notNull(),
	eventDate: timestamp({ mode: 'string' }).notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text(),
	relatedId: int(),
	metadata: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_asset_timeline").on(table.assetId, table.eventDate),
	index("idx_event_type").on(table.eventType),
]);

export const assessmentDocuments = mysqlTable("assessment_documents", {
	id: int().autoincrement().notNull(),
	assessmentId: int().notNull(),
	projectId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	url: text().notNull(),
	mimeType: varchar({ length: 100 }).notNull(),
	fileSize: int().notNull(),
	uploadedBy: int().notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const assessmentVersions = mysqlTable("assessment_versions", {
	id: int().autoincrement().notNull(),
	assessmentId: int().notNull(),
	versionNumber: int().notNull(),
	data: text().notNull(),
	changedBy: int().notNull(),
	changeDescription: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_assessment").on(table.assessmentId),
	index("idx_version").on(table.assessmentId, table.versionNumber),
]);

export const assessments = mysqlTable("assessments", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assetId: int(),
	sectionId: int().references(() => buildingSections.id, { onDelete: "set null" } ),
	componentCode: varchar({ length: 20 }),
	condition: mysqlEnum(['good','fair','poor','not_assessed']).default('not_assessed'),
	observations: text(),
	remainingUsefulLife: int(),
	expectedUsefulLife: int(),
	estimatedServiceLife: int(),
	assessedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	conditionPercentage: varchar({ length: 50 }),
	reviewYear: int(),
	lastTimeAction: int(),
	estimatedRepairCost: int().default(0),
	replacementValue: int().default(0),
	actionYear: int(),
	recommendations: text(),
	conditionScore: int(),
	ciScore: int(),
	fciScore: int(),
	status: mysqlEnum(['initial','active','completed']).default('initial').notNull(),
	hasValidationOverrides: int().default(0),
	validationWarnings: text(),
	componentName: varchar({ length: 255 }),
	componentLocation: varchar({ length: 255 }),
	complianceStatus: varchar({ length: 50 }),
	complianceIssues: text(),
	complianceRecommendations: text(),
	complianceCheckedAt: timestamp({ mode: 'string' }),
	complianceCheckedBy: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

// Assessment deletion audit log
export const assessmentDeletionLog = mysqlTable("assessment_deletion_log", {
	id: int().autoincrement().primaryKey(),
	assessmentId: int().notNull(),
	projectId: int().notNull(),
	assetId: int(),
	componentCode: varchar({ length: 20 }),
	componentName: varchar({ length: 255 }),
	condition: varchar({ length: 50 }),
	estimatedRepairCost: int(),
	replacementValue: int(),
	deletedBy: int().notNull(),
	deletedByName: varchar({ length: 255 }),
	deletedByEmail: varchar({ length: 320 }),
	deletionReason: text(),
	assessmentData: text(), // JSON snapshot of the full assessment
	deletedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const assetDocuments = mysqlTable("asset_documents", {
	id: int().autoincrement().notNull(),
	assetId: int().notNull(),
	projectId: int().notNull(),
	deficiencyId: int(),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	url: text().notNull(),
	mimeType: varchar({ length: 100 }).notNull(),
	fileSize: int().notNull(),
	uploadedBy: int().notNull(),
	category: varchar({ length: 50 }),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const assets = mysqlTable("assets", {
	id: int().autoincrement().notNull(),
	uniqueId: varchar({ length: 50 }).unique(),
	projectId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	assetType: varchar({ length: 100 }),
	address: text(),
	yearBuilt: int(),
	grossFloorArea: int(),
	numberOfStories: int(),
	constructionType: varchar({ length: 100 }),
	currentReplacementValue: decimal({ precision: 15, scale: 2 }),
	status: mysqlEnum(['active','inactive','demolished']).default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	streetNumber: varchar({ length: 20 }),
	streetAddress: varchar({ length: 255 }),
	unitNumber: varchar({ length: 50 }),
	city: varchar({ length: 255 }),
	postalCode: varchar({ length: 20 }),
	province: varchar({ length: 100 }),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
});

export const auditLog = mysqlTable("audit_log", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	entityType: varchar({ length: 50 }).notNull(),
	entityId: int().notNull(),
	action: mysqlEnum(['create','update','delete','view','export','share']).notNull(),
	changes: text().notNull(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	dataClassification: mysqlEnum(['public','internal','confidential','restricted']).default('internal'),
	complianceTags: text(),
	retentionPolicy: varchar({ length: 50 }),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	sessionId: varchar({ length: 100 }),
},
(table) => [
	index("idx_entity").on(table.entityType, table.entityId),
	index("idx_user").on(table.userId),
	index("idx_created").on(table.createdAt),
]);

export const budgetAllocations = mysqlTable("budget_allocations", {
	id: int().autoincrement().notNull(),
	cycleId: int().notNull(),
	projectId: int().notNull(),
	year: int().notNull(),
	allocatedAmount: decimal({ precision: 15, scale: 2 }).notNull(),
	priority: int().notNull(),
	status: mysqlEnum(['proposed','approved','funded','completed']).default('proposed').notNull(),
	justification: text(),
	strategicAlignment: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const buildingCodes = mysqlTable("building_codes", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	edition: varchar({ length: 100 }),
	jurisdiction: varchar({ length: 100 }),
	year: int(),
	documentUrl: text(),
	documentKey: varchar({ length: 500 }),
	pageCount: int(),
	isActive: int().default(1).notNull(),
	effectiveDate: varchar({ length: 64 }),
	status: varchar({ length: 32 }).default('active'),
	isLatest: int().default(0).notNull(),
	lastVerified: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
	index("jurisdiction_latest").on(table.jurisdiction, table.isLatest),
]);

export const buildingComponents = mysqlTable("building_components", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 20 }).notNull(),
	level: int().notNull(),
	parentCode: varchar({ length: 20 }),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const buildingSections = mysqlTable("building_sections", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	sectionType: mysqlEnum(['original','extension','addition','renovation']).default('original').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	installDate: date({ mode: 'string' }),
	expectedLifespan: int(),
	grossFloorArea: decimal({ precision: 10, scale: 2 }),
	numberOfStories: int(),
	constructionType: varchar({ length: 100 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_project_id").on(table.projectId),
]);

export const capitalBudgetCycles = mysqlTable("capital_budget_cycles", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	startYear: int().notNull(),
	endYear: int().notNull(),
	totalBudget: decimal({ precision: 15, scale: 2 }),
	status: mysqlEnum(['planning','approved','active','completed']).default('planning').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const cashFlowProjections = mysqlTable("cash_flow_projections", {
	id: int().autoincrement().notNull(),
	scenarioId: int().notNull(),
	year: int().notNull(),
	capitalExpenditure: decimal({ precision: 15, scale: 2 }).default('0'),
	maintenanceCost: decimal({ precision: 15, scale: 2 }).default('0'),
	operatingCost: decimal({ precision: 15, scale: 2 }).default('0'),
	totalCost: decimal({ precision: 15, scale: 2 }).default('0'),
	costAvoidance: decimal({ precision: 15, scale: 2 }).default('0'),
	efficiencyGains: decimal({ precision: 15, scale: 2 }).default('0'),
	totalBenefit: decimal({ precision: 15, scale: 2 }).default('0'),
	netCashFlow: decimal({ precision: 15, scale: 2 }).default('0'),
	cumulativeCashFlow: decimal({ precision: 15, scale: 2 }).default('0'),
	projectedCi: decimal({ precision: 5, scale: 2 }),
	projectedFci: decimal({ precision: 10, scale: 4 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const ciFciSnapshots = mysqlTable("ci_fci_snapshots", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	level: mysqlEnum(['component','system','building','portfolio']).notNull(),
	entityId: varchar({ length: 100 }),
	ci: decimal({ precision: 5, scale: 2 }),
	fci: decimal({ precision: 5, scale: 4 }),
	deferredMaintenanceCost: decimal({ precision: 15, scale: 2 }),
	currentReplacementValue: decimal({ precision: 15, scale: 2 }),
	calculatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	calculationMethod: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const cofFactors = mysqlTable("cof_factors", {
	id: int().autoincrement().notNull(),
	riskAssessmentId: int().notNull(),
	safetyImpact: decimal({ precision: 3, scale: 2 }).notNull(),
	safetyNotes: text(),
	operationalImpact: decimal({ precision: 3, scale: 2 }).notNull(),
	downtimeDays: decimal({ precision: 5, scale: 1 }),
	affectedSystems: text(),
	operationalNotes: text(),
	financialImpact: decimal({ precision: 3, scale: 2 }).notNull(),
	repairCost: decimal({ precision: 15, scale: 2 }),
	revenueLoss: decimal({ precision: 15, scale: 2 }),
	penaltyCost: decimal({ precision: 15, scale: 2 }),
	financialNotes: text(),
	environmentalImpact: decimal({ precision: 3, scale: 2 }).notNull(),
	environmentalNotes: text(),
	reputationalImpact: decimal({ precision: 3, scale: 2 }).notNull(),
	reputationalNotes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_risk_assessment").on(table.riskAssessmentId),
]);

export const componentDeteriorationConfig = mysqlTable("component_deterioration_config", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	componentCode: varchar({ length: 50 }).notNull(),
	bestCaseCurveId: int(),
	designCaseCurveId: int(),
	worstCaseCurveId: int(),
	activeCurve: mysqlEnum(['best','design','worst']).default('design'),
	customParam1: int(),
	customParam2: int(),
	customParam3: int(),
	customParam4: int(),
	customParam5: int(),
	customParam6: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const componentHistory = mysqlTable("component_history", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	componentCode: varchar({ length: 50 }).notNull(),
	componentName: varchar({ length: 255 }),
	changeType: mysqlEnum(['assessment_created','assessment_updated','deficiency_created','deficiency_updated','note_added','specification_updated','recommendation_added','recommendation_updated','status_changed','cost_updated']).notNull(),
	fieldName: varchar({ length: 100 }),
	oldValue: text(),
	newValue: text(),
	richTextContent: text(),
	assessmentId: int(),
	deficiencyId: int(),
	userId: int().notNull(),
	userName: varchar({ length: 255 }),
	timestamp: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	summary: varchar({ length: 500 }),
	tags: text(),
},
(table) => [
	index("component_idx").on(table.projectId, table.componentCode, table.timestamp),
	index("timestamp_idx").on(table.timestamp),
	index("user_idx").on(table.userId),
]);

export const consultantSubmissions = mysqlTable("consultant_submissions", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	submissionId: varchar({ length: 50 }).notNull(),
	submittedBy: int().notNull(),
	consultantName: varchar({ length: 255 }),
	consultantEmail: varchar({ length: 320 }),
	submittedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	dataType: mysqlEnum(['assessments','deficiencies','mixed']).notNull(),
	fileName: varchar({ length: 255 }),
	totalItems: int().default(0).notNull(),
	validItems: int().default(0).notNull(),
	invalidItems: int().default(0).notNull(),
	status: mysqlEnum(['pending_review','under_review','approved','rejected','partially_approved','finalized']).default('pending_review').notNull(),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewNotes: text(),
	finalizedAt: timestamp({ mode: 'string' }),
	finalizedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("submissionId").on(table.submissionId),
]);

export const costEstimates = mysqlTable("cost_estimates", {
	id: int().autoincrement().notNull(),
	deficiencyId: int().notNull(),
	projectId: int().notNull(),
	componentCode: varchar({ length: 20 }).notNull(),
	description: text(),
	quantity: int(),
	unit: varchar({ length: 50 }),
	unitCost: int(),
	totalCost: int(),
	timeline: mysqlEnum(['immediate','1_5_years','5_10_years','10_plus_years']).default('1_5_years').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const criteriaObjectiveLinks = mysqlTable("criteria_objective_links", {
	id: int().autoincrement().notNull(),
	criteriaId: int().notNull(),
	objectiveId: int().notNull(),
	alignmentStrength: decimal({ precision: 3, scale: 2 }).default('1.00').notNull(),
});

export const criteriaPresets = mysqlTable("criteria_presets", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	configuration: text().notNull(),
	isDefault: int().default(0).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const criticalEquipment = mysqlTable("critical_equipment", {
	id: int().autoincrement().notNull(),
	assessmentId: int().notNull(),
	criticalityLevel: mysqlEnum(['critical','important','standard']).notNull(),
	criticalityJustification: text(),
	isSafetyRelated: int().default(0),
	isMissionCritical: int().default(0),
	isHighValue: int().default(0),
	hasRedundancy: int().default(0),
	mitigationStrategies: text(),
	contingencyPlan: text(),
	designatedBy: int().notNull(),
	designatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_criticality").on(table.criticalityLevel),
	index("assessmentId").on(table.assessmentId),
]);

export const customComponents = mysqlTable("custom_components", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	code: varchar({ length: 20 }).notNull(),
	level: int().notNull(),
	parentCode: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const customVocabulary = mysqlTable("custom_vocabulary", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	term: varchar({ length: 255 }).notNull(),
	pronunciation: varchar({ length: 255 }),
	category: varchar({ length: 100 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const dashboardConfigs = mysqlTable("dashboard_configs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	layout: json().notNull(),
	filters: json(),
	isDefault: tinyint().default(0).notNull(),
	isShared: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const dataAccessRequests = mysqlTable("data_access_requests", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	requestType: mysqlEnum(['export','deletion','correction','access_log']).notNull(),
	status: mysqlEnum(['pending','processing','completed','rejected']).default('pending').notNull(),
	requestDetails: text(),
	responseData: text(),
	processedBy: int(),
	rejectionReason: text(),
	requestedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	processedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
});

export const dataDisposalRequests = mysqlTable("data_disposal_requests", {
	id: int().autoincrement().notNull(),
	requestType: mysqlEnum(['project','user_data','audit_logs','backups','full_account']).notNull(),
	targetId: int(),
	targetType: varchar({ length: 100 }),
	requestedBy: int().notNull(),
	approvedBy: int(),
	status: mysqlEnum(['pending','approved','in_progress','completed','rejected']).default('pending').notNull(),
	reason: text(),
	disposalMethod: varchar({ length: 100 }),
	backupPurgeStatus: mysqlEnum(['not_started','in_progress','completed','failed']).default('not_started'),
	backupPurgeCompletedAt: timestamp({ mode: 'string' }),
	verificationHash: varchar({ length: 255 }),
	requestedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	approvedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	notes: text(),
});

export const dataResidencySettings = mysqlTable("data_residency_settings", {
	id: int().autoincrement().notNull(),
	settingKey: varchar({ length: 100 }).notNull(),
	settingValue: text().notNull(),
	description: text(),
	updatedBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("settingKey").on(table.settingKey),
]);

export const dataRetentionPolicies = mysqlTable("data_retention_policies", {
	id: int().autoincrement().notNull(),
	policyName: varchar({ length: 255 }).notNull(),
	dataType: varchar({ length: 100 }).notNull(),
	retentionPeriodYears: int().notNull(),
	description: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const databaseBackups = mysqlTable("database_backups", {
	id: int().autoincrement().notNull(),
	backupType: mysqlEnum(['manual','automatic','scheduled']).notNull(),
	status: mysqlEnum(['pending','in_progress','completed','failed']).default('pending').notNull(),
	fileSize: int(),
	recordCount: int(),
	backupPath: text(),
	metadata: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
	// Encryption fields
	isEncrypted: int().default(0).notNull(),
	encryptionKeyId: varchar({ length: 255 }),
	encryptionAlgorithm: varchar({ length: 50 }),
	encryptionIv: varchar({ length: 64 }),
},
(table) => [
	index("idx_status").on(table.status),
	index("idx_created").on(table.createdAt),
]);

export const backupSchedules = mysqlTable("backup_schedules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	cronExpression: varchar({ length: 100 }).notNull(),
	timezone: varchar({ length: 50 }).default('America/New_York').notNull(),
	isEnabled: int().default(1).notNull(),
	retentionDays: int().default(30).notNull(),
	encryptionEnabled: int().default(1).notNull(),
	lastRunAt: timestamp({ mode: 'string' }),
	nextRunAt: timestamp({ mode: 'string' }),
	lastRunStatus: mysqlEnum(['success','failed','skipped']),
	lastRunBackupId: int(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_enabled").on(table.isEnabled),
	index("idx_next_run").on(table.nextRunAt),
]);

export const deficiencies = mysqlTable("deficiencies", {
	id: int().autoincrement().notNull(),
	assessmentId: int(),
	projectId: int().notNull(),
	componentCode: varchar({ length: 20 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	priority: mysqlEnum(['immediate','short_term','medium_term','long_term']).default('medium_term').notNull(),
	recommendedAction: text(),
	estimatedCost: int(),
	status: mysqlEnum(['open','in_progress','resolved','deferred']).default('open').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const deficiencyVersions = mysqlTable("deficiency_versions", {
	id: int().autoincrement().notNull(),
	deficiencyId: int().notNull(),
	versionNumber: int().notNull(),
	data: text().notNull(),
	changedBy: int().notNull(),
	changeDescription: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_deficiency").on(table.deficiencyId),
]);

export const deteriorationCurves = mysqlTable("deterioration_curves", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	curveType: mysqlEnum(['best','design','worst']).notNull(),
	componentType: varchar({ length: 100 }),
	param1: int().notNull(),
	param2: int().notNull(),
	param3: int().notNull(),
	param4: int().notNull(),
	param5: int().notNull(),
	param6: int().notNull(),
	description: text(),
	isDefault: tinyint().default(0),
	interpolationType: mysqlEnum(['linear','polynomial','exponential']).default('linear'),
	createdBy: int(),
	projectId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emissionsData = mysqlTable("emissions_data", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	recordDate: timestamp({ mode: 'string' }).notNull(),
	scope: mysqlEnum(['scope1','scope2','scope3']).notNull(),
	emissionSource: varchar({ length: 255 }).notNull(),
	co2Equivalent: decimal({ precision: 15, scale: 4 }).notNull(),
	calculationMethod: varchar({ length: 255 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const encryptionKeyMetadata = mysqlTable("encryption_key_metadata", {
	id: int().autoincrement().notNull(),
	keyIdentifier: varchar({ length: 255 }).notNull(),
	keyType: mysqlEnum(['data_encryption','backup_encryption','transport']).notNull(),
	keyOwner: varchar({ length: 255 }).notNull(),
	algorithm: varchar({ length: 100 }).notNull(),
	keyStatus: mysqlEnum(['active','rotated','revoked']).default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	rotatedAt: timestamp({ mode: 'string' }),
	expiresAt: timestamp({ mode: 'string' }),
	notes: text(),
},
(table) => [
	index("keyIdentifier").on(table.keyIdentifier),
]);

export const esgScores = mysqlTable("esg_scores", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assetId: int(), // Optional - if null, score applies to entire project
	scoreDate: timestamp({ mode: 'string' }).notNull(),
	energyScore: decimal({ precision: 5, scale: 2 }),
	waterScore: decimal({ precision: 5, scale: 2 }),
	wasteScore: decimal({ precision: 5, scale: 2 }),
	emissionsScore: decimal({ precision: 5, scale: 2 }),
	compositeScore: decimal({ precision: 5, scale: 2 }),
	// New ESG category scores
	environmentalScore: decimal({ precision: 5, scale: 2 }),
	socialScore: decimal({ precision: 5, scale: 2 }),
	governanceScore: decimal({ precision: 5, scale: 2 }),
	overallEsgScore: decimal({ precision: 5, scale: 2 }),
	benchmarkPercentile: int(),
	certifications: json(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_esg_project").on(table.projectId),
	index("idx_esg_asset").on(table.assetId),
	index("idx_esg_date").on(table.scoreDate),
]);

/**
 * ESG Metrics - Detailed environmental performance indicators
 */
export const esgMetrics = mysqlTable("esg_metrics", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assetId: int(), // Optional - if null, metric applies to entire project
	recordDate: timestamp({ mode: 'string' }).notNull(),
	// Carbon footprint metrics
	carbonFootprint: decimal({ precision: 15, scale: 4 }), // tonnes CO2e
	carbonIntensity: decimal({ precision: 15, scale: 4 }), // kg CO2e per sqft
	// Energy metrics
	energyUseIntensity: decimal({ precision: 15, scale: 4 }), // kWh per sqft
	energyStarRating: int(), // 1-100
	renewableEnergyPercent: decimal({ precision: 5, scale: 2 }), // 0-100%
	// Water metrics
	waterUseIntensity: decimal({ precision: 15, scale: 4 }), // gallons per sqft
	waterRecyclingPercent: decimal({ precision: 5, scale: 2 }), // 0-100%
	// Waste metrics
	wasteGenerationRate: decimal({ precision: 15, scale: 4 }), // kg per sqft
	wasteDiversionRate: decimal({ precision: 5, scale: 2 }), // 0-100%
	recyclingRate: decimal({ precision: 5, scale: 2 }), // 0-100%
	// Indoor environmental quality
	indoorAirQualityScore: decimal({ precision: 5, scale: 2 }),
	thermalComfortScore: decimal({ precision: 5, scale: 2 }),
	// Social metrics
	occupantSatisfactionScore: decimal({ precision: 5, scale: 2 }),
	accessibilityScore: decimal({ precision: 5, scale: 2 }),
	healthSafetyScore: decimal({ precision: 5, scale: 2 }),
	// Governance metrics
	complianceScore: decimal({ precision: 5, scale: 2 }),
	transparencyScore: decimal({ precision: 5, scale: 2 }),
	riskManagementScore: decimal({ precision: 5, scale: 2 }),
	notes: text(),
	dataSource: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_esg_metrics_project").on(table.projectId),
	index("idx_esg_metrics_asset").on(table.assetId),
	index("idx_esg_metrics_date").on(table.recordDate),
]);

/**
 * ESG Benchmarks - Industry standards for comparison
 */
export const esgBenchmarks = mysqlTable("esg_benchmarks", {
	id: int().autoincrement().notNull(),
	buildingType: varchar({ length: 100 }).notNull(), // office, retail, residential, industrial, etc.
	region: varchar({ length: 100 }).notNull(), // Canada, Ontario, BC, etc.
	year: int().notNull(),
	// Energy benchmarks
	avgEnergyUseIntensity: decimal({ precision: 15, scale: 4 }),
	medianEnergyUseIntensity: decimal({ precision: 15, scale: 4 }),
	topQuartileEui: decimal({ precision: 15, scale: 4 }),
	// Carbon benchmarks
	avgCarbonIntensity: decimal({ precision: 15, scale: 4 }),
	medianCarbonIntensity: decimal({ precision: 15, scale: 4 }),
	// Water benchmarks
	avgWaterUseIntensity: decimal({ precision: 15, scale: 4 }),
	medianWaterUseIntensity: decimal({ precision: 15, scale: 4 }),
	// Waste benchmarks
	avgWasteDiversionRate: decimal({ precision: 5, scale: 2 }),
	medianWasteDiversionRate: decimal({ precision: 5, scale: 2 }),
	// ESG score benchmarks
	avgEsgScore: decimal({ precision: 5, scale: 2 }),
	medianEsgScore: decimal({ precision: 5, scale: 2 }),
	topQuartileEsgScore: decimal({ precision: 5, scale: 2 }),
	dataSource: varchar({ length: 255 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_benchmark_type_region").on(table.buildingType, table.region),
	index("idx_benchmark_year").on(table.year),
]);

/**
 * ESG Reports - Generated ESG reports and analytics
 */
export const esgReports = mysqlTable("esg_reports", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assetId: int(), // Optional
	reportType: mysqlEnum(['summary', 'detailed', 'compliance', 'annual', 'quarterly', 'custom']).notNull(),
	reportDate: timestamp({ mode: 'string' }).notNull(),
	reportPeriodStart: timestamp({ mode: 'string' }).notNull(),
	reportPeriodEnd: timestamp({ mode: 'string' }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	reportData: json(), // Full report data as JSON
	fileUrl: varchar({ length: 1024 }), // URL to generated PDF/document
	fileKey: varchar({ length: 512 }),
	status: mysqlEnum(['draft', 'published', 'archived']).default('draft').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_esg_report_project").on(table.projectId),
	index("idx_esg_report_type").on(table.reportType),
	index("idx_esg_report_date").on(table.reportDate),
]);

/**
 * ESG Certifications - Building certifications (LEED, BOMA BEST, etc.)
 */
export const esgCertifications = mysqlTable("esg_certifications", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assetId: int(), // Optional
	certificationType: mysqlEnum(['leed', 'boma_best', 'energy_star', 'well', 'fitwel', 'green_globes', 'passive_house', 'net_zero', 'other']).notNull(),
	certificationLevel: varchar({ length: 100 }), // e.g., Gold, Platinum, Level 3
	certificationDate: timestamp({ mode: 'string' }),
	expirationDate: timestamp({ mode: 'string' }),
	certificateNumber: varchar({ length: 100 }),
	verifyingBody: varchar({ length: 255 }),
	score: decimal({ precision: 5, scale: 2 }),
	documentUrl: varchar({ length: 1024 }),
	status: mysqlEnum(['active', 'expired', 'pending', 'revoked']).default('active').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_cert_project").on(table.projectId),
	index("idx_cert_type").on(table.certificationType),
	index("idx_cert_status").on(table.status),
]);

/**
 * ESG Improvement Actions - Tracked sustainability improvements
 */
export const esgImprovementActions = mysqlTable("esg_improvement_actions", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assetId: int(), // Optional
	deficiencyId: int(), // Link to building deficiency if applicable
	assessmentId: int(), // Link to assessment if applicable
	actionType: mysqlEnum(['energy_efficiency', 'water_conservation', 'waste_reduction', 'emissions_reduction', 'renewable_energy', 'indoor_quality', 'accessibility', 'compliance']).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	estimatedCost: decimal({ precision: 15, scale: 2 }),
	actualCost: decimal({ precision: 15, scale: 2 }),
	estimatedSavings: decimal({ precision: 15, scale: 2 }), // Annual savings
	actualSavings: decimal({ precision: 15, scale: 2 }),
	estimatedEsgImpact: decimal({ precision: 5, scale: 2 }), // Score improvement
	actualEsgImpact: decimal({ precision: 5, scale: 2 }),
	paybackPeriodYears: decimal({ precision: 5, scale: 2 }),
	priority: mysqlEnum(['high', 'medium', 'low']).default('medium').notNull(),
	status: mysqlEnum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned').notNull(),
	plannedStartDate: timestamp({ mode: 'string' }),
	plannedEndDate: timestamp({ mode: 'string' }),
	actualStartDate: timestamp({ mode: 'string' }),
	actualEndDate: timestamp({ mode: 'string' }),
	assignedTo: int(),
	notes: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_esg_action_project").on(table.projectId),
	index("idx_esg_action_type").on(table.actionType),
	index("idx_esg_action_status").on(table.status),
	index("idx_esg_action_deficiency").on(table.deficiencyId),
])

export const facilityModels = mysqlTable("facility_models", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assetId: int(), // Optional - if null, model applies to entire project; if set, model is asset-specific
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	fileUrl: varchar({ length: 1024 }).notNull(),
	fileKey: varchar({ length: 512 }).notNull(),
	fileSize: int(),
	format: mysqlEnum(['glb','gltf','fbx','obj','skp','rvt','rfa','dwg','dxf','ifc','nwd','nwc']).notNull(),
	version: int().default(1).notNull(),
	isActive: tinyint().default(1).notNull(),
	metadata: json(),
	uploadedBy: int().notNull(),
	uploadedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	// APS (Autodesk Platform Services) integration fields
	apsObjectKey: varchar({ length: 512 }),
	apsBucketKey: varchar({ length: 128 }),
	apsUrn: varchar({ length: 512 }),
	apsTranslationStatus: mysqlEnum(['pending','in_progress','success','failed','timeout']).default('pending'),
	apsTranslationProgress: int().default(0),
	apsTranslationMessage: text(),
	apsDerivativeUrn: varchar({ length: 512 }),
	apsUploadedAt: timestamp({ mode: 'string' }),
	apsTranslationStartedAt: timestamp({ mode: 'string' }),
	apsTranslationCompletedAt: timestamp({ mode: 'string' }),
});

export const floorPlans = mysqlTable("floor_plans", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	sectionId: int().references(() => buildingSections.id, { onDelete: "set null" } ),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	floorLevel: varchar({ length: 50 }),
	imageUrl: text().notNull(),
	imageWidth: int(),
	imageHeight: int(),
	scale: decimal({ precision: 10, scale: 4 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const greenUpgrades = mysqlTable("green_upgrades", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	upgradeName: varchar({ length: 255 }).notNull(),
	upgradeType: mysqlEnum(['hvac','lighting','insulation','windows','solar','geothermal','water_fixtures','building_automation']).notNull(),
	installDate: timestamp({ mode: 'string' }),
	cost: decimal({ precision: 15, scale: 2 }).notNull(),
	estimatedAnnualSavings: decimal({ precision: 15, scale: 2 }),
	actualAnnualSavings: decimal({ precision: 15, scale: 2 }),
	paybackPeriod: decimal({ precision: 10, scale: 2 }),
	energySavingsKwh: decimal({ precision: 15, scale: 2 }),
	waterSavingsGallons: decimal({ precision: 15, scale: 2 }),
	co2ReductionMt: decimal({ precision: 15, scale: 4 }),
	status: mysqlEnum(['planned','in_progress','completed','cancelled']).default('planned').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const hierarchyTemplates = mysqlTable("hierarchy_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isDefault: tinyint().default(0).notNull(),
	config: text().notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const integrationRuns = mysqlTable("integration_runs", {
	id: int().autoincrement().notNull(),
	source: mysqlEnum(['sap','tririga']).notNull(),
	runType: mysqlEnum(['full','incremental']).notNull(),
	status: mysqlEnum(['running','success','failed','partial']).notNull(),
	startedAt: timestamp({ mode: 'string' }).notNull(),
	completedAt: timestamp({ mode: 'string' }),
	recordsExtracted: int().default(0),
	recordsTransformed: int().default(0),
	recordsLoaded: int().default(0),
	recordsFailed: int().default(0),
	errorMessage: text(),
	errorDetails: text(),
	triggeredBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const kpiSnapshots = mysqlTable("kpi_snapshots", {
	id: int().autoincrement().notNull(),
	snapshotDate: timestamp({ mode: 'string' }).notNull(),
	portfolioFci: decimal({ precision: 10, scale: 4 }),
	portfolioCi: decimal({ precision: 10, scale: 4 }),
	totalReplacementValue: decimal({ precision: 15, scale: 2 }),
	totalRepairCosts: decimal({ precision: 15, scale: 2 }),
	maintenanceBacklog: decimal({ precision: 15, scale: 2 }),
	deferredMaintenance: decimal({ precision: 15, scale: 2 }),
	budgetUtilization: decimal({ precision: 10, scale: 4 }),
	completedProjects: int(),
	activeProjects: int(),
	criticalDeficiencies: int(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const maintenanceEntries = mysqlTable("maintenance_entries", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assessmentId: int(),
	componentName: varchar({ length: 255 }).notNull(),
	location: varchar({ length: 255 }),
	entryType: mysqlEnum(['identified','executed']).notNull(),
	actionType: mysqlEnum(['repair','rehabilitation','replacement','preventive_maintenance','emergency_repair','inspection','upgrade']).notNull(),
	lifecycleStage: mysqlEnum(['installation','routine_maintenance','major_repair','replacement','decommission']),
	description: text().notNull(),
	workPerformed: text(),
	findings: text(),
	estimatedCost: decimal({ precision: 15, scale: 2 }),
	actualCost: decimal({ precision: 15, scale: 2 }),
	costVariance: decimal({ precision: 15, scale: 2 }),
	costVariancePercent: decimal({ precision: 5, scale: 2 }),
	status: mysqlEnum(['planned','approved','in_progress','completed','deferred','cancelled']).default('planned').notNull(),
	priority: mysqlEnum(['immediate','high','medium','low']).default('medium').notNull(),
	dateIdentified: timestamp({ mode: 'string' }),
	dateScheduled: timestamp({ mode: 'string' }),
	dateStarted: timestamp({ mode: 'string' }),
	dateCompleted: timestamp({ mode: 'string' }),
	isRecurring: tinyint().default(0).notNull(),
	recurringFrequency: mysqlEnum(['weekly','monthly','quarterly','semi_annual','annual','biennial']),
	nextDueDate: timestamp({ mode: 'string' }),
	lastCompletedDate: timestamp({ mode: 'string' }),
	contractor: varchar({ length: 255 }),
	contractorContact: varchar({ length: 255 }),
	warrantyExpiry: timestamp({ mode: 'string' }),
	componentAge: int(),
	cumulativeCost: decimal({ precision: 15, scale: 2 }),
	notes: text(),
	attachments: json(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_projectId").on(table.projectId),
	index("idx_assessmentId").on(table.assessmentId),
	index("idx_entryType").on(table.entryType),
	index("idx_status").on(table.status),
	index("idx_componentName").on(table.componentName),
	index("idx_dateCompleted").on(table.dateCompleted),
	index("idx_nextDueDate").on(table.nextDueDate),
]);

export const mfaAuditLog = mysqlTable("mfa_audit_log", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	action: mysqlEnum(['setup','enable','disable','verify_success','verify_fail','backup_code_used','device_trusted','device_removed','email_sent','email_verified','sms_sent','sms_verified','mfa_reset_by_admin']).notNull(),
	success: int().default(1).notNull(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	deviceFingerprint: varchar({ length: 255 }),
	failureReason: varchar({ length: 255 }),
	createdAt: timestamp().default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_user_action").on(table.userId, table.action),
	index("idx_created").on(table.createdAt),
]);

export const mfaMethodSwitchRequests = mysqlTable("mfa_method_switch_requests", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	currentMethod: mysqlEnum(['totp','sms','email']).notNull(),
	newMethod: mysqlEnum(['totp','sms','email']).notNull(),
	newMethodSecret: varchar({ length: 255 }),
	newMethodVerified: int().default(0).notNull(),
	status: mysqlEnum(['pending','completed','cancelled','expired']).default('pending').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("idx_user_status").on(table.userId, table.status),
	index("idx_expires").on(table.expiresAt),
]);

export const mfaRecoveryRequests = mysqlTable("mfa_recovery_requests", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	reason: text().notNull(),
	identityVerification: text(),
	status: mysqlEnum(['pending','approved','rejected','completed','expired']).default('pending').notNull(),
	recoveryCode: varchar({ length: 255 }),
	recoveryCodeExpiresAt: timestamp({ mode: 'string' }),
	submittedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewedBy: int(),
	adminNotes: text(),
	rejectionReason: text(),
	completedAt: timestamp({ mode: 'string' }),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
},
(table) => [
	index("idx_user_status").on(table.userId, table.status),
	index("idx_status").on(table.status),
	index("idx_submitted").on(table.submittedAt),
]);

export const modelAnnotations = mysqlTable("model_annotations", {
	id: int().autoincrement().notNull(),
	modelId: int().notNull(),
	projectId: int().notNull(),
	componentName: varchar({ length: 255 }),
	assessmentId: int(),
	deficiencyId: int(),
	maintenanceEntryId: int(),
	annotationType: mysqlEnum(['deficiency','assessment','maintenance','note','issue']).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	positionX: decimal({ precision: 10, scale: 6 }).notNull(),
	positionY: decimal({ precision: 10, scale: 6 }).notNull(),
	positionZ: decimal({ precision: 10, scale: 6 }).notNull(),
	cameraPosition: json(),
	cameraTarget: json(),
	priority: mysqlEnum(['immediate','high','medium','low']),
	status: mysqlEnum(['open','in_progress','resolved','closed']).default('open').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const modelViewpoints = mysqlTable("model_viewpoints", {
	id: int().autoincrement().notNull(),
	modelId: int().notNull(),
	projectId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	cameraPosition: json().notNull(),
	cameraTarget: json().notNull(),
	cameraZoom: decimal({ precision: 10, scale: 6 }),
	visibleLayers: json(),
	isShared: tinyint().default(0).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const optimizationScenarios = mysqlTable("optimization_scenarios", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	budgetConstraint: decimal({ precision: 15, scale: 2 }),
	budgetType: mysqlEnum(['hard','soft']).default('hard'),
	timeHorizon: int().notNull(),
	discountRate: decimal({ precision: 5, scale: 4 }).default('0.0300'),
	optimizationGoal: mysqlEnum(['minimize_cost','maximize_ci','maximize_roi','minimize_risk']).default('maximize_roi'),
	totalCost: decimal({ precision: 15, scale: 2 }),
	totalBenefit: decimal({ precision: 15, scale: 2 }),
	netPresentValue: decimal({ precision: 15, scale: 2 }),
	returnOnInvestment: decimal({ precision: 5, scale: 2 }),
	paybackPeriod: decimal({ precision: 5, scale: 1 }),
	currentCi: decimal({ precision: 5, scale: 2 }),
	projectedCi: decimal({ precision: 5, scale: 2 }),
	ciImprovement: decimal({ precision: 5, scale: 2 }),
	currentFci: decimal({ precision: 10, scale: 4 }),
	projectedFci: decimal({ precision: 10, scale: 4 }),
	fciImprovement: decimal({ precision: 10, scale: 4 }),
	currentRiskScore: decimal({ precision: 5, scale: 2 }),
	projectedRiskScore: decimal({ precision: 5, scale: 2 }),
	riskReduction: decimal({ precision: 5, scale: 2 }),
	status: mysqlEnum(['draft','optimized','approved','implemented']).default('draft'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const photos = mysqlTable("photos", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	assessmentId: int(),
	assetId: int(),
	deficiencyId: int(),
	fileKey: varchar({ length: 500 }).notNull(),
	url: text().notNull(),
	caption: text(),
	mimeType: varchar({ length: 100 }),
	fileSize: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	componentCode: varchar({ length: 20 }),
	takenAt: timestamp({ mode: 'string' }),
	latitude: decimal({ precision: 10, scale: 8 }),
	longitude: decimal({ precision: 11, scale: 8 }),
	altitude: decimal({ precision: 10, scale: 2 }),
	locationAccuracy: decimal({ precision: 10, scale: 2 }),
	ocrText: text(),
	ocrConfidence: decimal({ precision: 5, scale: 2 }),
	floorPlanId: int().references(() => floorPlans.id, { onDelete: "set null" } ),
	floorPlanX: decimal({ precision: 10, scale: 4 }),
	floorPlanY: decimal({ precision: 10, scale: 4 }),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
});

export const pofFactors = mysqlTable("pof_factors", {
	id: int().autoincrement().notNull(),
	riskAssessmentId: int().notNull(),
	age: int(),
	expectedUsefulLife: int(),
	remainingLifePercent: decimal({ precision: 5, scale: 2 }),
	conditionIndex: decimal({ precision: 5, scale: 2 }),
	defectSeverity: mysqlEnum(['none','minor','moderate','major','critical']),
	maintenanceFrequency: mysqlEnum(['none','reactive','scheduled','preventive','predictive']),
	lastMaintenanceDate: timestamp({ mode: 'string' }),
	deferredMaintenanceYears: int(),
	operatingEnvironment: mysqlEnum(['controlled','normal','harsh','extreme']),
	utilizationRate: decimal({ precision: 5, scale: 2 }),
	equipmentType: varchar({ length: 100 }),
	manufacturer: varchar({ length: 255 }),
	model: varchar({ length: 255 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_risk_assessment").on(table.riskAssessmentId),
]);

export const predictionHistory = mysqlTable("prediction_history", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	componentCode: varchar({ length: 50 }).notNull(),
	assessmentId: int(),
	predictionDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	predictedFailureYear: int(),
	predictedRemainingLife: int(),
	predictedCondition: int(),
	confidenceScore: decimal({ precision: 5, scale: 2 }),
	predictionMethod: mysqlEnum(['curve_based','ml_model','historical_trend','hybrid']).default('curve_based'),
	modelVersion: varchar({ length: 50 }),
	curveUsed: mysqlEnum(['best','design','worst']),
	actualFailureYear: int(),
	actualConditionAtDate: int(),
	predictionAccuracy: decimal({ precision: 5, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const prioritizationCriteria = mysqlTable("prioritization_criteria", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	category: mysqlEnum(['risk','strategic','compliance','financial','operational','environmental']).notNull(),
	weight: decimal({ precision: 5, scale: 2 }).default('10.00').notNull(),
	scoringGuideline: text(),
	isActive: int().default(1).notNull(),
	displayOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const projectDocuments = mysqlTable("project_documents", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	url: text().notNull(),
	mimeType: varchar({ length: 100 }).notNull(),
	fileSize: int().notNull(),
	uploadedBy: int().notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_project_documents_projectId").on(table.projectId),
	index("idx_project_documents_uploadedBy").on(table.uploadedBy),
]);

export const projectHierarchyConfig = mysqlTable("project_hierarchy_config", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	templateId: int(),
	maxDepth: int().default(3).notNull(),
	componentWeights: text(),
	componentPriorities: text(),
	enabledComponents: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("project_hierarchy_config_projectId_unique").on(table.projectId),
]);

export const projectPriorityScores = mysqlTable("project_priority_scores", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	compositeScore: decimal({ precision: 6, scale: 2 }).notNull(),
	rank: int(),
	urgencyScore: decimal({ precision: 4, scale: 2 }),
	missionCriticalityScore: decimal({ precision: 4, scale: 2 }),
	safetyScore: decimal({ precision: 4, scale: 2 }),
	complianceScore: decimal({ precision: 4, scale: 2 }),
	energySavingsScore: decimal({ precision: 4, scale: 2 }),
	calculatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("project_priority_scores_projectId_unique").on(table.projectId),
]);

export const projectRatingConfig = mysqlTable("project_rating_config", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	conditionScaleId: int(),
	priorityScaleId: int(),
	fciScaleId: int(),
	useWeightedAverage: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("project_rating_config_projectId_unique").on(table.projectId),
]);

export const projectScores = mysqlTable("project_scores", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	criteriaId: int().notNull(),
	score: decimal({ precision: 4, scale: 2 }).notNull(),
	justification: text(),
	scoredBy: int().notNull(),
	scoredAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const projectVersions = mysqlTable("project_versions", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	versionNumber: int().notNull(),
	data: text().notNull(),
	changedBy: int().notNull(),
	changeDescription: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_project").on(table.projectId),
]);

export const projects = mysqlTable("projects", {
	id: int().autoincrement().notNull(),
	uniqueId: varchar({ length: 50 }).unique(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	address: text(),
	clientName: varchar({ length: 255 }),
	propertyType: varchar({ length: 100 }),
	constructionType: varchar({ length: 100 }),
	yearBuilt: int(),
	numberOfUnits: int(),
	numberOfStories: int(),
	buildingCode: varchar({ length: 100 }),
	assessmentDate: timestamp({ mode: 'string' }),
	observations: text(),
	status: mysqlEnum(['draft','in_progress','completed','archived','deleted']).default('draft').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	overallConditionScore: int(),
	overallFciScore: int(),
	overallConditionRating: varchar({ length: 50 }),
	ci: decimal({ precision: 5, scale: 2 }),
	fci: decimal({ precision: 5, scale: 4 }),
	deferredMaintenanceCost: decimal({ precision: 15, scale: 2 }),
	currentReplacementValue: decimal({ precision: 15, scale: 2 }),
	lastCalculatedAt: timestamp({ mode: 'string' }),
	designLife: int(),
	endOfLifeDate: timestamp({ mode: 'string' }),
	holdingDepartment: varchar({ length: 255 }),
	propertyManager: varchar({ length: 255 }),
	managerEmail: varchar({ length: 320 }),
	managerPhone: varchar({ length: 50 }),
	facilityType: varchar({ length: 100 }),
	occupancyStatus: mysqlEnum(['occupied','vacant','partial']),
	criticalityLevel: mysqlEnum(['critical','important','standard']),
	company: varchar({ length: 255 }),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	buildingCodeId: int(),
	streetNumber: varchar({ length: 20 }),
	streetAddress: varchar({ length: 255 }),
	unitNumber: varchar({ length: 50 }),
	city: varchar({ length: 255 }),
	postalCode: varchar({ length: 20 }),
	province: varchar({ length: 100 }),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
});

export const ratingScales = mysqlTable("rating_scales", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	type: mysqlEnum(['fci','ci','condition','priority','custom']).notNull(),
	isDefault: tinyint().default(0).notNull(),
	minValue: int().notNull(),
	maxValue: int().notNull(),
	scaleItems: text().notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const renovationCosts = mysqlTable("renovation_costs", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	costType: mysqlEnum(['identified','planned','executed']).notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	status: mysqlEnum(['pending','approved','in_progress','completed','cancelled']).default('pending').notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	fiscalYear: int(),
	dateRecorded: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	dateCompleted: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_projectId").on(table.projectId),
	index("idx_costType").on(table.costType),
	index("idx_status").on(table.status),
]);

export const reportConfigurations = mysqlTable("report_configurations", {
	id: int().autoincrement().notNull(),
	templateId: int().notNull(),
	logoUrl: varchar({ length: 500 }),
	headerText: text(),
	footerText: text(),
	colorScheme: json(),
	fontOptions: json(),
	pageOptions: json(),
	coverPageOptions: json(),
	tableOfContents: tinyint().default(1).notNull(),
	disclaimerText: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("templateId").on(table.templateId),
]);

export const reportHistory = mysqlTable("report_history", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	templateId: int().notNull(),
	userId: int().notNull(),
	format: mysqlEnum(['pdf','excel','word','html']).notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: varchar({ length: 500 }),
	fileSize: int(),
	status: mysqlEnum(['generating','completed','failed']).default('generating').notNull(),
	errorMessage: text(),
	generatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_projectId").on(table.projectId),
	index("idx_userId").on(table.userId),
	index("idx_status").on(table.status),
]);

export const reportSchedules = mysqlTable("report_schedules", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	frequency: mysqlEnum(['daily','weekly','monthly']).notNull(),
	dayOfWeek: int(),
	dayOfMonth: int(),
	recipientEmails: text().notNull(),
	active: int().default(1).notNull(),
	lastRun: timestamp({ mode: 'string' }),
	nextRun: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const reportSections = mysqlTable("report_sections", {
	id: int().autoincrement().notNull(),
	templateId: int().notNull(),
	sectionType: mysqlEnum(['cover_page','executive_summary','condition_summary','cost_tables','deficiencies_list','photo_gallery','risk_assessment','optimization_results','prioritization_rankings','component_details','ci_fci_trends','cash_flow_projections','custom_text']).notNull(),
	title: varchar({ length: 255 }),
	orderIndex: int().notNull(),
	isEnabled: tinyint().default(1).notNull(),
	layoutOptions: json(),
	contentOptions: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_templateId").on(table.templateId),
	index("idx_orderIndex").on(table.orderIndex),
]);

export const reportTemplates = mysqlTable("report_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	type: mysqlEnum(['executive_summary','detailed_assessment','financial_analysis','compliance','risk_assessment','optimization_results','custom']).notNull(),
	stakeholder: varchar({ length: 100 }),
	isGlobal: tinyint().default(0).notNull(),
	userId: int(),
	projectId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_type").on(table.type),
	index("idx_isGlobal").on(table.isGlobal),
	index("idx_projectId").on(table.projectId),
]);

export const riskAssessments = mysqlTable("risk_assessments", {
	id: int().autoincrement().notNull(),
	assessmentId: int().notNull(),
	pof: decimal({ precision: 3, scale: 2 }).notNull(),
	pofJustification: text(),
	cof: decimal({ precision: 3, scale: 2 }).notNull(),
	cofJustification: text(),
	riskScore: decimal({ precision: 5, scale: 2 }).notNull(),
	riskLevel: mysqlEnum(['very_low','low','medium','high','critical']).notNull(),
	assessedBy: int().notNull(),
	assessedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	status: mysqlEnum(['draft','approved','archived']).default('draft').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_assessment").on(table.assessmentId),
	index("idx_risk_level").on(table.riskLevel),
	index("idx_status").on(table.status),
]);

export const riskMitigationActions = mysqlTable("risk_mitigation_actions", {
	id: int().autoincrement().notNull(),
	riskAssessmentId: int().notNull(),
	action: text().notNull(),
	actionType: mysqlEnum(['inspection','maintenance','repair','replacement','monitoring','procedure_change','training']).notNull(),
	priority: mysqlEnum(['immediate','high','medium','low']).notNull(),
	status: mysqlEnum(['planned','in_progress','completed','cancelled']).default('planned').notNull(),
	assignedTo: int(),
	dueDate: timestamp({ mode: 'string' }),
	completedDate: timestamp({ mode: 'string' }),
	estimatedCost: decimal({ precision: 15, scale: 2 }),
	actualCost: decimal({ precision: 15, scale: 2 }),
	expectedRiskReduction: decimal({ precision: 5, scale: 2 }),
	actualRiskReduction: decimal({ precision: 5, scale: 2 }),
	effectiveness: mysqlEnum(['not_effective','partially_effective','effective','highly_effective']),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_risk_assessment").on(table.riskAssessmentId),
	index("idx_status").on(table.status),
	index("idx_priority").on(table.priority),
]);

export const scenarioStrategies = mysqlTable("scenario_strategies", {
	id: int().autoincrement().notNull(),
	scenarioId: int().notNull(),
	componentCode: varchar({ length: 50 }).notNull(),
	strategy: mysqlEnum(['replace','rehabilitate','defer','do_nothing']).notNull(),
	actionYear: int().notNull(),
	deferralYears: int().default(0),
	strategyCost: decimal({ precision: 15, scale: 2 }).notNull(),
	presentValueCost: decimal({ precision: 15, scale: 2 }),
	lifeExtension: int(),
	conditionImprovement: int(),
	riskReduction: decimal({ precision: 5, scale: 2 }),
	failureCostAvoided: decimal({ precision: 15, scale: 2 }),
	maintenanceSavings: decimal({ precision: 15, scale: 2 }),
	priorityScore: decimal({ precision: 10, scale: 4 }),
	selected: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const strategicObjectives = mysqlTable("strategic_objectives", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	targetYear: int(),
	isActive: int().default(1).notNull(),
	displayOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const submissionItems = mysqlTable("submission_items", {
	id: int().autoincrement().notNull(),
	submissionId: int().notNull(),
	projectId: int().notNull(),
	itemType: mysqlEnum(['assessment','deficiency']).notNull(),
	rowNumber: int(),
	data: text().notNull(),
	validationStatus: mysqlEnum(['valid','warning','error']).notNull(),
	validationErrors: text(),
	itemStatus: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	reviewNotes: text(),
	finalizedAssessmentId: int(),
	finalizedDeficiencyId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const submissionPhotos = mysqlTable("submission_photos", {
	id: int().autoincrement().notNull(),
	submissionId: int().notNull(),
	submissionItemId: int(),
	fileName: varchar({ length: 255 }).notNull(),
	fileSize: int(),
	mimeType: varchar({ length: 100 }),
	fileKey: varchar({ length: 500 }).notNull(),
	url: varchar({ length: 1000 }).notNull(),
	thumbnailUrl: varchar({ length: 1000 }),
	componentCode: varchar({ length: 50 }),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	finalizedPhotoId: int(),
	uploadedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const sustainabilityGoals = mysqlTable("sustainability_goals", {
	id: int().autoincrement().notNull(),
	projectId: int(),
	goalType: mysqlEnum(['energy_reduction','water_reduction','waste_reduction','carbon_reduction','renewable_energy']).notNull(),
	baselineValue: decimal({ precision: 15, scale: 4 }).notNull(),
	baselineYear: int().notNull(),
	targetValue: decimal({ precision: 15, scale: 4 }).notNull(),
	targetYear: int().notNull(),
	unit: varchar({ length: 50 }).notNull(),
	status: mysqlEnum(['active','achieved','missed','cancelled']).default('active').notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const trustedDevices = mysqlTable("trusted_devices", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	deviceFingerprint: varchar({ length: 255 }).notNull(),
	deviceName: varchar({ length: 255 }),
	userAgent: text(),
	ipAddress: varchar({ length: 45 }),
	lastUsed: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_device").on(table.userId, table.deviceFingerprint),
	index("idx_expires").on(table.expiresAt),
]);

export const userConsents = mysqlTable("user_consents", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	consentType: mysqlEnum(['privacy_policy','terms_of_service','data_processing','marketing','analytics']).notNull(),
	consentVersion: varchar({ length: 20 }).notNull(),
	consentGiven: int().notNull(),
	consentText: text(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	consentedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	revokedAt: timestamp({ mode: 'string' }),
});

export const userMfaSettings = mysqlTable("user_mfa_settings", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	secret: varchar({ length: 255 }).notNull(),
	enabled: int().default(0).notNull(),
	backupCodes: text(),
	mfaMethod: mysqlEnum(['totp','sms','email']).default('totp'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_id").on(table.userId),
]);

export const mfaTimeRestrictions = mysqlTable("mfa_time_restrictions", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	restrictionType: mysqlEnum(['always','business_hours','after_hours','custom_schedule','never']).default('always').notNull(),
	startTime: varchar({ length: 5 }), // e.g., '09:00'
	endTime: varchar({ length: 5 }), // e.g., '17:00'
	daysOfWeek: text(), // JSON array, e.g., '["monday","tuesday"]'
	timezone: varchar({ length: 50 }).default('UTC'),
	isActive: tinyint().default(1).notNull(),
	description: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_active").on(table.userId, table.isActive),
	index("idx_restriction_type").on(table.restrictionType),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','viewer','editor','project_manager']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	company: varchar({ length: 255 }),
	city: varchar({ length: 255 }),
	accountStatus: mysqlEnum(['pending','active','trial','suspended']).default('pending').notNull(),
	trialEndsAt: timestamp({ mode: 'string' }),
	mfaRequired: tinyint().default(0).notNull(),
	mfaEnforcedAt: timestamp({ mode: 'string' }),
	mfaGracePeriodEnd: timestamp({ mode: 'string' }),
	unitPreference: mysqlEnum(['metric','imperial']).default('metric').notNull(),
	welcomeEmailSent: tinyint().default(0).notNull(),
	welcomeEmailSentAt: timestamp({ mode: 'string' }),
	companyId: int(),
	isSuperAdmin: tinyint().default(0).notNull(),
});

export const utilityConsumption = mysqlTable("utility_consumption", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	recordDate: timestamp({ mode: 'string' }).notNull(),
	utilityType: mysqlEnum(['electricity','natural_gas','water','steam','chilled_water']).notNull(),
	consumption: decimal({ precision: 15, scale: 4 }).notNull(),
	unit: varchar({ length: 50 }).notNull(),
	cost: decimal({ precision: 15, scale: 2 }),
	source: varchar({ length: 100 }),
	isRenewable: tinyint().default(0),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const validationOverrides = mysqlTable("validation_overrides", {
	id: int().autoincrement().notNull(),
	ruleId: int().notNull(),
	assessmentId: int(),
	deficiencyId: int(),
	projectId: int().notNull(),
	fieldName: varchar({ length: 100 }).notNull(),
	originalValue: text(),
	overriddenValue: text(),
	justification: text(),
	overriddenBy: int().notNull(),
	overriddenAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const validationRules = mysqlTable("validation_rules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	ruleType: mysqlEnum(['date_range','numeric_range','required_field','custom_logic','same_year_inspection']).notNull(),
	severity: mysqlEnum(['error','warning','info']).default('warning').notNull(),
	field: varchar({ length: 100 }).notNull(),
	condition: text().notNull(),
	message: text().notNull(),
	isActive: int().default(1).notNull(),
	projectId: int(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const wasteTracking = mysqlTable("waste_tracking", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	recordDate: timestamp({ mode: 'string' }).notNull(),
	wasteType: mysqlEnum(['general','recycling','compost','hazardous','construction']).notNull(),
	weight: decimal({ precision: 15, scale: 4 }).notNull(),
	unit: varchar({ length: 20 }).notNull(),
	disposalMethod: varchar({ length: 100 }),
	cost: decimal({ precision: 15, scale: 2 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const emailDeliveryLog = mysqlTable("email_delivery_log", {
	id: int().autoincrement().notNull(),
	emailType: mysqlEnum(['admin_notification','user_confirmation','user_approved','user_rejected','mfa_code','password_reset','other']).notNull(),
	recipientEmail: varchar({ length: 320 }).notNull(),
	recipientName: varchar({ length: 255 }),
	subject: varchar({ length: 500 }).notNull(),
	status: mysqlEnum(['sent','delivered','failed','pending']).default('pending').notNull(),
	sentAt: timestamp({ mode: 'string' }),
	deliveredAt: timestamp({ mode: 'string' }),
	failureReason: text(),
	metadata: text(), // JSON string with additional context (userId, requestId, etc.)
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_email_status").on(table.status),
	index("idx_email_type").on(table.emailType),
	index("idx_recipient").on(table.recipientEmail),
	index("idx_sent_at").on(table.sentAt),
]);

export type EmailDeliveryLog = typeof emailDeliveryLog.$inferSelect;
export type InsertEmailDeliveryLog = typeof emailDeliveryLog.$inferInsert;

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

/**
 * Project status change history table
 * Tracks all status changes for projects with timestamps and user information
 */
export const projectStatusHistory = mysqlTable("project_status_history", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	userId: int().notNull(),
	previousStatus: mysqlEnum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
	newStatus: mysqlEnum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).notNull(),
	changedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	notes: text(),
},
(table) => [
	index("idx_project_status_history").on(table.projectId, table.changedAt),
	index("idx_user_status_history").on(table.userId),
]);

export type ProjectStatusHistory = typeof projectStatusHistory.$inferSelect;
export type InsertProjectStatusHistory = typeof projectStatusHistory.$inferInsert;

/**
 * Portfolio Metrics History Table
 * Tracks historical portfolio-level metrics for trend analysis
 */
export const portfolioMetricsHistory = mysqlTable("portfolio_metrics_history", {
	id: int().autoincrement().notNull().primaryKey(),
	snapshotDate: timestamp({ mode: 'string' }).notNull(),
	companyId: int(),
	// Financial metrics
	totalReplacementValue: decimal({ precision: 15, scale: 2 }),
	totalDeferredMaintenance: decimal({ precision: 15, scale: 2 }),
	totalRepairCosts: decimal({ precision: 15, scale: 2 }),
	annualCapitalSpend: decimal({ precision: 15, scale: 2 }),
	// Index metrics
	portfolioFci: decimal({ precision: 10, scale: 4 }),
	portfolioCi: decimal({ precision: 10, scale: 4 }),
	// Asset counts
	totalAssets: int(),
	assetsGoodCondition: int(),
	assetsFairCondition: int(),
	assetsPoorCondition: int(),
	// Deficiency metrics
	totalDeficiencies: int(),
	criticalDeficiencies: int(),
	highPriorityDeficiencies: int(),
	// Project metrics
	activeProjects: int(),
	completedProjects: int(),
	// Economic indicators
	inflationRate: decimal({ precision: 5, scale: 2 }),
	discountRate: decimal({ precision: 5, scale: 2 }),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_snapshot_date").on(table.snapshotDate),
	index("idx_company").on(table.companyId),
]);

/**
 * Financial Forecasts Table
 * Stores predictive financial data and scenarios
 */
export const financialForecasts = mysqlTable("financial_forecasts", {
	id: int().autoincrement().notNull().primaryKey(),
	forecastDate: timestamp({ mode: 'string' }).notNull(),
	companyId: int(),
	projectId: int(),
	assetId: int(),
	forecastYear: int().notNull(),
	scenarioType: mysqlEnum(['best_case', 'most_likely', 'worst_case', 'optimized']).default('most_likely').notNull(),
	// Cost forecasts
	predictedMaintenanceCost: decimal({ precision: 15, scale: 2 }),
	predictedRepairCost: decimal({ precision: 15, scale: 2 }),
	predictedReplacementCost: decimal({ precision: 15, scale: 2 }),
	predictedCapitalRequirement: decimal({ precision: 15, scale: 2 }),
	// Confidence metrics
	confidenceLevel: decimal({ precision: 5, scale: 2 }),
	predictionModel: varchar({ length: 100 }),
	// Condition forecasts
	predictedFci: decimal({ precision: 10, scale: 4 }),
	predictedCi: decimal({ precision: 10, scale: 4 }),
	predictedConditionScore: int(),
	// Risk metrics
	failureProbability: decimal({ precision: 5, scale: 2 }),
	riskScore: decimal({ precision: 10, scale: 2 }),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_forecast_year").on(table.forecastYear),
	index("idx_company").on(table.companyId),
	index("idx_project").on(table.projectId),
	index("idx_asset").on(table.assetId),
	index("idx_scenario").on(table.scenarioType),
]);

/**
 * Benchmark Data Table
 * Stores industry benchmarks for comparison
 */
export const benchmarkData = mysqlTable("benchmark_data", {
	id: int().autoincrement().notNull().primaryKey(),
	benchmarkType: mysqlEnum(['industry', 'sector', 'region', 'asset_type', 'custom']).notNull(),
	category: varchar({ length: 100 }).notNull(),
	subcategory: varchar({ length: 100 }),
	// Benchmark metrics
	medianFci: decimal({ precision: 10, scale: 4 }),
	medianCi: decimal({ precision: 10, scale: 4 }),
	medianCostPerSqft: decimal({ precision: 10, scale: 2 }),
	medianMaintenanceRatio: decimal({ precision: 5, scale: 2 }),
	// Percentile ranges
	p25Fci: decimal({ precision: 10, scale: 4 }),
	p75Fci: decimal({ precision: 10, scale: 4 }),
	p25Ci: decimal({ precision: 10, scale: 4 }),
	p75Ci: decimal({ precision: 10, scale: 4 }),
	// Sample data
	sampleSize: int(),
	dataSource: varchar({ length: 255 }),
	effectiveDate: date(),
	expiryDate: date(),
	isActive: int().default(1).notNull(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_benchmark_type").on(table.benchmarkType),
	index("idx_category").on(table.category),
	index("idx_active").on(table.isActive),
]);

/**
 * Economic Indicators Table
 * Stores economic data for financial calculations
 */
export const economicIndicators = mysqlTable("economic_indicators", {
	id: int().autoincrement().notNull().primaryKey(),
	indicatorDate: timestamp({ mode: 'string' }).notNull(),
	region: varchar({ length: 100 }).default('Canada').notNull(),
	// Inflation rates
	cpiInflationRate: decimal({ precision: 5, scale: 2 }),
	constructionInflationRate: decimal({ precision: 5, scale: 2 }),
	materialInflationRate: decimal({ precision: 5, scale: 2 }),
	laborInflationRate: decimal({ precision: 5, scale: 2 }),
	// Interest rates
	primeRate: decimal({ precision: 5, scale: 2 }),
	bondYield10Year: decimal({ precision: 5, scale: 2 }),
	// Discount rates
	recommendedDiscountRate: decimal({ precision: 5, scale: 2 }),
	riskFreeRate: decimal({ precision: 5, scale: 2 }),
	// Economic indicators
	gdpGrowthRate: decimal({ precision: 5, scale: 2 }),
	unemploymentRate: decimal({ precision: 5, scale: 2 }),
	// Currency
	exchangeRateUSD: decimal({ precision: 10, scale: 4 }),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_indicator_date").on(table.indicatorDate),
	index("idx_region").on(table.region),
]);

/**
 * Portfolio Targets Table
 * Stores KPI goals and targets for portfolio management
 */
export const portfolioTargets = mysqlTable("portfolio_targets", {
	id: int().autoincrement().notNull().primaryKey(),
	companyId: int(),
	targetYear: int().notNull(),
	targetType: mysqlEnum(['fci', 'ci', 'budget', 'deficiency_reduction', 'condition_improvement', 'custom']).notNull(),
	metricName: varchar({ length: 100 }).notNull(),
	targetValue: decimal({ precision: 15, scale: 4 }).notNull(),
	currentValue: decimal({ precision: 15, scale: 4 }),
	baselineValue: decimal({ precision: 15, scale: 4 }),
	baselineYear: int(),
	// Progress tracking
	progressPercentage: decimal({ precision: 5, scale: 2 }),
	status: mysqlEnum(['on_track', 'at_risk', 'off_track', 'achieved']).default('on_track').notNull(),
	// Target details
	description: text(),
	strategicAlignment: text(),
	accountableParty: varchar({ length: 255 }),
	reviewFrequency: mysqlEnum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('quarterly').notNull(),
	lastReviewDate: timestamp({ mode: 'string' }),
	nextReviewDate: timestamp({ mode: 'string' }),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_company").on(table.companyId),
	index("idx_target_year").on(table.targetYear),
	index("idx_target_type").on(table.targetType),
	index("idx_status").on(table.status),
]);

/**
 * Investment Analysis Table
 * Stores ROI, NPV, and payback analysis for projects
 */
export const investmentAnalysis = mysqlTable("investment_analysis", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	assetId: int(),
	analysisDate: timestamp({ mode: 'string' }).notNull(),
	analysisType: mysqlEnum(['roi', 'npv', 'payback', 'tco', 'lcca', 'benefit_cost']).notNull(),
	// Investment details
	initialInvestment: decimal({ precision: 15, scale: 2 }).notNull(),
	annualOperatingCost: decimal({ precision: 15, scale: 2 }),
	annualMaintenanceCost: decimal({ precision: 15, scale: 2 }),
	annualEnergySavings: decimal({ precision: 15, scale: 2 }),
	annualCostAvoidance: decimal({ precision: 15, scale: 2 }),
	// Financial metrics
	netPresentValue: decimal({ precision: 15, scale: 2 }),
	internalRateOfReturn: decimal({ precision: 5, scale: 2 }),
	returnOnInvestment: decimal({ precision: 5, scale: 2 }),
	paybackPeriodYears: decimal({ precision: 5, scale: 2 }),
	benefitCostRatio: decimal({ precision: 5, scale: 2 }),
	// Analysis parameters
	discountRate: decimal({ precision: 5, scale: 2 }).notNull(),
	analysisHorizonYears: int().notNull(),
	inflationRate: decimal({ precision: 5, scale: 2 }),
	// Results
	recommendation: mysqlEnum(['proceed', 'defer', 'reject', 'requires_review']),
	confidenceLevel: mysqlEnum(['high', 'medium', 'low']),
	notes: text(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_project").on(table.projectId),
	index("idx_asset").on(table.assetId),
	index("idx_analysis_type").on(table.analysisType),
]);

export type PortfolioMetricsHistory = typeof portfolioMetricsHistory.$inferSelect;
export type InsertPortfolioMetricsHistory = typeof portfolioMetricsHistory.$inferInsert;
export type FinancialForecast = typeof financialForecasts.$inferSelect;
export type InsertFinancialForecast = typeof financialForecasts.$inferInsert;
export type BenchmarkData = typeof benchmarkData.$inferSelect;
export type InsertBenchmarkData = typeof benchmarkData.$inferInsert;
export type EconomicIndicator = typeof economicIndicators.$inferSelect;
export type InsertEconomicIndicator = typeof economicIndicators.$inferInsert;
export type PortfolioTarget = typeof portfolioTargets.$inferSelect;
export type InsertPortfolioTarget = typeof portfolioTargets.$inferInsert;
export type InvestmentAnalysis = typeof investmentAnalysis.$inferSelect;
export type InsertInvestmentAnalysis = typeof investmentAnalysis.$inferInsert;

/**
 * Chatbot conversation sessions
 * Stores chat history for users to continue conversations across sessions
 */
export const chatbotSessions = mysqlTable("chatbot_sessions", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int().notNull(),
	title: varchar({ length: 255 }),
	currentPage: varchar({ length: 255 }), // Current page context (e.g., '/projects', '/dashboard')
	pageContext: text(), // JSON with additional page context (projectId, assetId, etc.)
	messages: text().notNull(), // JSON array of messages
	isActive: int().default(1).notNull(), // 1 = active, 0 = archived
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_chatbot_user").on(table.userId),
	index("idx_chatbot_active").on(table.userId, table.isActive),
]);

/**
 * Chatbot message feedback
 * Stores user feedback (thumbs up/down) for chatbot responses
 */
export const chatbotFeedback = mysqlTable("chatbot_feedback", {
	id: int().autoincrement().notNull().primaryKey(),
	sessionId: int().notNull(),
	messageIndex: int().notNull(), // Index of the message in the session's messages array
	userId: int().notNull(),
	feedback: mysqlEnum(['positive', 'negative']).notNull(),
	comment: text(), // Optional user comment explaining the feedback
	userMessage: text(), // The user's question that led to this response
	assistantMessage: text(), // The assistant's response that was rated
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_feedback_session").on(table.sessionId),
	index("idx_feedback_user").on(table.userId),
	index("idx_feedback_type").on(table.feedback),
]);

export type ChatbotSession = typeof chatbotSessions.$inferSelect;
export type InsertChatbotSession = typeof chatbotSessions.$inferInsert;
export type ChatbotFeedback = typeof chatbotFeedback.$inferSelect;
export type InsertChatbotFeedback = typeof chatbotFeedback.$inferInsert;

/**
 * Rating Scale Configurations
 * Allows companies to define custom rating thresholds for letter grades and zones
 * Supports multiple scale types: FCI, Condition, ESG, Overall
 */
export const ratingScaleConfigs = mysqlTable("rating_scale_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	companyId: int(),
	scaleType: mysqlEnum(['fci', 'condition', 'esg', 'overall', 'custom']).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	// Letter grade thresholds stored as JSON: {"A+": {min: 97, max: 100}, "A": {min: 93, max: 96}, ...}
	letterGradeThresholds: text().notNull(),
	// Zone thresholds stored as JSON: {"green": {min: 80, max: 100}, "yellow": {min: 60, max: 79}, ...}
	zoneThresholds: text().notNull(),
	isDefault: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_rating_scale_company").on(table.companyId),
	index("idx_rating_scale_type").on(table.scaleType),
	index("idx_rating_scale_default").on(table.isDefault),
]);

/**
 * Asset Ratings
 * Stores calculated ratings for each asset including letter grades and zone ratings
 */
export const assetRatings = mysqlTable("asset_ratings", {
	id: int().autoincrement().notNull().primaryKey(),
	assetId: int().notNull(),
	projectId: int().notNull(),
	// Overall ratings
	overallScore: decimal({ precision: 5, scale: 2 }),
	overallGrade: varchar({ length: 5 }), // A+, A, A-, B+, etc.
	overallZone: mysqlEnum(['green', 'yellow', 'orange', 'red']),
	// FCI (Facility Condition Index) ratings
	fciScore: decimal({ precision: 5, scale: 2 }),
	fciGrade: varchar({ length: 5 }),
	fciZone: mysqlEnum(['green', 'yellow', 'orange', 'red']),
	// Condition ratings
	conditionScore: decimal({ precision: 5, scale: 2 }),
	conditionGrade: varchar({ length: 5 }),
	conditionZone: mysqlEnum(['green', 'yellow', 'orange', 'red']),
	// ESG ratings
	esgScore: decimal({ precision: 5, scale: 2 }),
	esgGrade: varchar({ length: 5 }),
	esgZone: mysqlEnum(['green', 'yellow', 'orange', 'red']),
	// Component breakdown stored as JSON
	componentBreakdown: text(),
	// Metadata
	lastCalculatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	calculatedBy: int(),
	scaleConfigId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_asset_rating_asset").on(table.assetId),
	index("idx_asset_rating_project").on(table.projectId),
	index("idx_asset_rating_zone").on(table.overallZone),
]);

/**
 * Project Ratings
 * Aggregated ratings for entire projects/portfolios
 */
export const projectRatings = mysqlTable("project_ratings", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	// Portfolio-level ratings
	portfolioScore: decimal({ precision: 5, scale: 2 }),
	portfolioGrade: varchar({ length: 5 }),
	portfolioZone: mysqlEnum(['green', 'yellow', 'orange', 'red']),
	// Average metrics
	avgFciScore: decimal({ precision: 5, scale: 2 }),
	avgConditionScore: decimal({ precision: 5, scale: 2 }),
	avgEsgScore: decimal({ precision: 5, scale: 2 }),
	// Zone distribution stored as JSON: {"green": 5, "yellow": 3, "orange": 2, "red": 1}
	zoneDistribution: text(),
	// Grade distribution stored as JSON: {"A": 3, "B": 4, "C": 2, "D": 1, "F": 0}
	gradeDistribution: text(),
	// Asset count
	totalAssets: int().default(0),
	assessedAssets: int().default(0),
	// Metadata
	lastCalculatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_project_rating_project").on(table.projectId),
	index("idx_project_rating_zone").on(table.portfolioZone),
]);

/**
 * Rating History
 * Tracks rating changes over time for trend analysis
 */
export const ratingHistory = mysqlTable("rating_history", {
	id: int().autoincrement().notNull().primaryKey(),
	entityType: mysqlEnum(['asset', 'project']).notNull(),
	entityId: int().notNull(),
	ratingType: mysqlEnum(['overall', 'fci', 'condition', 'esg']).notNull(),
	score: decimal({ precision: 5, scale: 2 }).notNull(),
	letterGrade: varchar({ length: 5 }),
	zone: mysqlEnum(['green', 'yellow', 'orange', 'red']),
	previousScore: decimal({ precision: 5, scale: 2 }),
	previousGrade: varchar({ length: 5 }),
	changeReason: text(),
	recordedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	recordedBy: int(),
},
(table) => [
	index("idx_rating_history_entity").on(table.entityType, table.entityId),
	index("idx_rating_history_type").on(table.ratingType),
	index("idx_rating_history_date").on(table.recordedAt),
]);

export type RatingScaleConfig = typeof ratingScaleConfigs.$inferSelect;
export type InsertRatingScaleConfig = typeof ratingScaleConfigs.$inferInsert;
export type AssetRating = typeof assetRatings.$inferSelect;
export type InsertAssetRating = typeof assetRatings.$inferInsert;
export type ProjectRating = typeof projectRatings.$inferSelect;
export type InsertProjectRating = typeof projectRatings.$inferInsert;
export type RatingHistory = typeof ratingHistory.$inferSelect;
export type InsertRatingHistory = typeof ratingHistory.$inferInsert;

// Type exports for all tables
export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;
export type SmsVerificationCode = typeof smsVerificationCodes.$inferSelect;
export type InsertSmsVerificationCode = typeof smsVerificationCodes.$inferInsert;
export type ProjectPermission = typeof projectPermissions.$inferSelect;
export type InsertProjectPermission = typeof projectPermissions.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type CompanyUser = typeof companyUsers.$inferSelect;
export type InsertCompanyUser = typeof companyUsers.$inferInsert;
export type CompanyAccessCode = typeof companyAccessCodes.$inferSelect;
export type InsertCompanyAccessCode = typeof companyAccessCodes.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;
export type AssessmentVersion = typeof assessmentVersions.$inferSelect;
export type InsertAssessmentVersion = typeof assessmentVersions.$inferInsert;
export type AssessmentDocument = typeof assessmentDocuments.$inferSelect;
export type InsertAssessmentDocument = typeof assessmentDocuments.$inferInsert;
export type AssetTimelineEvent = typeof assetTimelineEvents.$inferSelect;
export type InsertAssetTimelineEvent = typeof assetTimelineEvents.$inferInsert;
export type AssetDocument = typeof assetDocuments.$inferSelect;
export type InsertAssetDocument = typeof assetDocuments.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type InsertBudgetAllocation = typeof budgetAllocations.$inferInsert;
export type BuildingCode = typeof buildingCodes.$inferSelect;
export type InsertBuildingCode = typeof buildingCodes.$inferInsert;
export type BuildingComponent = typeof buildingComponents.$inferSelect;
export type InsertBuildingComponent = typeof buildingComponents.$inferInsert;
export type BuildingSection = typeof buildingSections.$inferSelect;
export type InsertBuildingSection = typeof buildingSections.$inferInsert;
export type CapitalBudgetCycle = typeof capitalBudgetCycles.$inferSelect;
export type InsertCapitalBudgetCycle = typeof capitalBudgetCycles.$inferInsert;
export type CashFlowProjection = typeof cashFlowProjections.$inferSelect;
export type InsertCashFlowProjection = typeof cashFlowProjections.$inferInsert;
export type CiFciSnapshot = typeof ciFciSnapshots.$inferSelect;
export type InsertCiFciSnapshot = typeof ciFciSnapshots.$inferInsert;
export type CofFactor = typeof cofFactors.$inferSelect;
export type InsertCofFactor = typeof cofFactors.$inferInsert;
export type ComponentDeteriorationConfig = typeof componentDeteriorationConfig.$inferSelect;
export type InsertComponentDeteriorationConfig = typeof componentDeteriorationConfig.$inferInsert;
export type ComponentHistory = typeof componentHistory.$inferSelect;
export type InsertComponentHistory = typeof componentHistory.$inferInsert;
export type ConsultantSubmission = typeof consultantSubmissions.$inferSelect;
export type InsertConsultantSubmission = typeof consultantSubmissions.$inferInsert;
export type CostEstimate = typeof costEstimates.$inferSelect;
export type InsertCostEstimate = typeof costEstimates.$inferInsert;
export type CriteriaObjectiveLink = typeof criteriaObjectiveLinks.$inferSelect;
export type InsertCriteriaObjectiveLink = typeof criteriaObjectiveLinks.$inferInsert;
export type CriteriaPreset = typeof criteriaPresets.$inferSelect;
export type InsertCriteriaPreset = typeof criteriaPresets.$inferInsert;
export type CriticalEquipment = typeof criticalEquipment.$inferSelect;
export type InsertCriticalEquipment = typeof criticalEquipment.$inferInsert;
export type CustomComponent = typeof customComponents.$inferSelect;
export type InsertCustomComponent = typeof customComponents.$inferInsert;
export type CustomVocabulary = typeof customVocabulary.$inferSelect;
export type InsertCustomVocabulary = typeof customVocabulary.$inferInsert;
export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type InsertDashboardConfig = typeof dashboardConfigs.$inferInsert;
export type DataAccessRequest = typeof dataAccessRequests.$inferSelect;
export type InsertDataAccessRequest = typeof dataAccessRequests.$inferInsert;
export type DataDisposalRequest = typeof dataDisposalRequests.$inferSelect;
export type InsertDataDisposalRequest = typeof dataDisposalRequests.$inferInsert;
export type DataResidencySetting = typeof dataResidencySettings.$inferSelect;
export type InsertDataResidencySetting = typeof dataResidencySettings.$inferInsert;
export type DataRetentionPolicy = typeof dataRetentionPolicies.$inferSelect;
export type InsertDataRetentionPolicy = typeof dataRetentionPolicies.$inferInsert;
export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = typeof databaseBackups.$inferInsert;
export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = typeof backupSchedules.$inferInsert;
export type Deficiency = typeof deficiencies.$inferSelect;
export type InsertDeficiency = typeof deficiencies.$inferInsert;
export type DeficiencyVersion = typeof deficiencyVersions.$inferSelect;
export type InsertDeficiencyVersion = typeof deficiencyVersions.$inferInsert;
export type DeteriorationCurve = typeof deteriorationCurves.$inferSelect;
export type InsertDeteriorationCurve = typeof deteriorationCurves.$inferInsert;
export type EmissionsData = typeof emissionsData.$inferSelect;
export type InsertEmissionsData = typeof emissionsData.$inferInsert;
export type EncryptionKeyMetadata = typeof encryptionKeyMetadata.$inferSelect;
export type InsertEncryptionKeyMetadata = typeof encryptionKeyMetadata.$inferInsert;
export type EsgScore = typeof esgScores.$inferSelect;
export type InsertEsgScore = typeof esgScores.$inferInsert;
export type EsgMetric = typeof esgMetrics.$inferSelect;
export type InsertEsgMetric = typeof esgMetrics.$inferInsert;
export type EsgBenchmark = typeof esgBenchmarks.$inferSelect;
export type InsertEsgBenchmark = typeof esgBenchmarks.$inferInsert;
export type EsgReport = typeof esgReports.$inferSelect;
export type InsertEsgReport = typeof esgReports.$inferInsert;
export type EsgCertification = typeof esgCertifications.$inferSelect;
export type InsertEsgCertification = typeof esgCertifications.$inferInsert;
export type EsgImprovementAction = typeof esgImprovementActions.$inferSelect;
export type InsertEsgImprovementAction = typeof esgImprovementActions.$inferInsert;
export type FacilityModel = typeof facilityModels.$inferSelect;
export type InsertFacilityModel = typeof facilityModels.$inferInsert;
export type FloorPlan = typeof floorPlans.$inferSelect;
export type InsertFloorPlan = typeof floorPlans.$inferInsert;
export type GreenUpgrade = typeof greenUpgrades.$inferSelect;
export type InsertGreenUpgrade = typeof greenUpgrades.$inferInsert;
export type HierarchyTemplate = typeof hierarchyTemplates.$inferSelect;
export type InsertHierarchyTemplate = typeof hierarchyTemplates.$inferInsert;
export type IntegrationRun = typeof integrationRuns.$inferSelect;
export type InsertIntegrationRun = typeof integrationRuns.$inferInsert;
export type KpiSnapshot = typeof kpiSnapshots.$inferSelect;
export type InsertKpiSnapshot = typeof kpiSnapshots.$inferInsert;
export type MaintenanceEntry = typeof maintenanceEntries.$inferSelect;
export type InsertMaintenanceEntry = typeof maintenanceEntries.$inferInsert;
export type MfaAuditLog = typeof mfaAuditLog.$inferSelect;
export type InsertMfaAuditLog = typeof mfaAuditLog.$inferInsert;
export type MfaMethodSwitchRequest = typeof mfaMethodSwitchRequests.$inferSelect;
export type InsertMfaMethodSwitchRequest = typeof mfaMethodSwitchRequests.$inferInsert;
export type MfaRecoveryRequest = typeof mfaRecoveryRequests.$inferSelect;
export type InsertMfaRecoveryRequest = typeof mfaRecoveryRequests.$inferInsert;
export type MfaTimeRestriction = typeof mfaTimeRestrictions.$inferSelect;
export type InsertMfaTimeRestriction = typeof mfaTimeRestrictions.$inferInsert;
export type ModelAnnotation = typeof modelAnnotations.$inferSelect;
export type InsertModelAnnotation = typeof modelAnnotations.$inferInsert;
export type ModelViewpoint = typeof modelViewpoints.$inferSelect;
export type InsertModelViewpoint = typeof modelViewpoints.$inferInsert;
export type OptimizationScenario = typeof optimizationScenarios.$inferSelect;
export type InsertOptimizationScenario = typeof optimizationScenarios.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;
export type PofFactor = typeof pofFactors.$inferSelect;
export type InsertPofFactor = typeof pofFactors.$inferInsert;
export type PredictionHistory = typeof predictionHistory.$inferSelect;
export type InsertPredictionHistory = typeof predictionHistory.$inferInsert;
export type PrioritizationCriteria = typeof prioritizationCriteria.$inferSelect;
export type InsertPrioritizationCriteria = typeof prioritizationCriteria.$inferInsert;
export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type InsertProjectDocument = typeof projectDocuments.$inferInsert;
export type ProjectHierarchyConfig = typeof projectHierarchyConfig.$inferSelect;
export type InsertProjectHierarchyConfig = typeof projectHierarchyConfig.$inferInsert;
export type ProjectPriorityScore = typeof projectPriorityScores.$inferSelect;
export type InsertProjectPriorityScore = typeof projectPriorityScores.$inferInsert;
export type ProjectRatingConfig = typeof projectRatingConfig.$inferSelect;
export type InsertProjectRatingConfig = typeof projectRatingConfig.$inferInsert;
export type ProjectScore = typeof projectScores.$inferSelect;
export type InsertProjectScore = typeof projectScores.$inferInsert;
export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type RatingScale = typeof ratingScales.$inferSelect;
export type InsertRatingScale = typeof ratingScales.$inferInsert;
export type RenovationCost = typeof renovationCosts.$inferSelect;
export type InsertRenovationCost = typeof renovationCosts.$inferInsert;
export type ReportConfiguration = typeof reportConfigurations.$inferSelect;
export type InsertReportConfiguration = typeof reportConfigurations.$inferInsert;
export type ReportHistory = typeof reportHistory.$inferSelect;
export type InsertReportHistory = typeof reportHistory.$inferInsert;
export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type InsertReportSchedule = typeof reportSchedules.$inferInsert;
export type ReportSection = typeof reportSections.$inferSelect;
export type InsertReportSection = typeof reportSections.$inferInsert;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = typeof riskAssessments.$inferInsert;
export type RiskMitigationAction = typeof riskMitigationActions.$inferSelect;
export type InsertRiskMitigationAction = typeof riskMitigationActions.$inferInsert;
export type ScenarioStrategy = typeof scenarioStrategies.$inferSelect;
export type InsertScenarioStrategy = typeof scenarioStrategies.$inferInsert;
export type StrategicObjective = typeof strategicObjectives.$inferSelect;
export type InsertStrategicObjective = typeof strategicObjectives.$inferInsert;
export type SubmissionItem = typeof submissionItems.$inferSelect;
export type InsertSubmissionItem = typeof submissionItems.$inferInsert;
export type SubmissionPhoto = typeof submissionPhotos.$inferSelect;
export type InsertSubmissionPhoto = typeof submissionPhotos.$inferInsert;
export type SustainabilityGoal = typeof sustainabilityGoals.$inferSelect;
export type InsertSustainabilityGoal = typeof sustainabilityGoals.$inferInsert;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type InsertTrustedDevice = typeof trustedDevices.$inferInsert;
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = typeof userConsents.$inferInsert;
export type UserMfaSetting = typeof userMfaSettings.$inferSelect;
export type InsertUserMfaSetting = typeof userMfaSettings.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UtilityConsumption = typeof utilityConsumption.$inferSelect;
export type InsertUtilityConsumption = typeof utilityConsumption.$inferInsert;
export type ValidationOverride = typeof validationOverrides.$inferSelect;
export type InsertValidationOverride = typeof validationOverrides.$inferInsert;
export type ValidationRule = typeof validationRules.$inferSelect;
export type InsertValidationRule = typeof validationRules.$inferInsert;
export type WasteTracking = typeof wasteTracking.$inferSelect;
export type InsertWasteTracking = typeof wasteTracking.$inferInsert;


/**
 * Building Type Templates
 * Pre-defined templates for different building types (e.g., Office, School, Hospital)
 * that include standard systems and components with default service life values
 */
export const buildingTypeTemplates = mysqlTable("building_type_templates", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	buildingClass: mysqlEnum(['class_a', 'class_b', 'class_c']).default('class_b').notNull(),
	propertyType: varchar({ length: 100 }).notNull(), // Office, School, Hospital, Residential, Industrial, etc.
	constructionType: varchar({ length: 100 }), // Steel Frame, Concrete, Wood Frame, etc.
	typicalYearBuiltRange: varchar({ length: 50 }), // e.g., "1980-2000"
	typicalGrossFloorArea: int(), // in sq ft
	typicalNumberOfStories: int(),
	isActive: int().default(1).notNull(),
	isDefault: int().default(0).notNull(),
	companyId: int(), // null = global template, otherwise company-specific
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_template_property_type").on(table.propertyType),
	index("idx_template_building_class").on(table.buildingClass),
	index("idx_template_company").on(table.companyId),
	index("idx_template_active").on(table.isActive),
]);

/**
 * Template Systems
 * Systems/components that are included in each building type template
 * Links templates to UNIFORMAT II component codes with default values
 */
export const templateSystems = mysqlTable("template_systems", {
	id: int().autoincrement().notNull().primaryKey(),
	templateId: int().notNull(),
	componentCode: varchar({ length: 20 }).notNull(), // UNIFORMAT II code (e.g., B2010)
	componentName: varchar({ length: 255 }).notNull(),
	defaultServiceLife: int().notNull(), // Design service life in years
	defaultReplacementCost: decimal({ precision: 15, scale: 2 }), // Per unit cost
	defaultCostUnit: varchar({ length: 50 }), // e.g., "per sq ft", "each", "linear ft"
	defaultQuantityFormula: varchar({ length: 255 }), // e.g., "grossFloorArea * 1.1"
	typicalCondition: mysqlEnum(['good', 'fair', 'poor']).default('good'),
	priority: int().default(1), // Display order
	isRequired: int().default(0).notNull(), // Whether this system is always included
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_template_system_template").on(table.templateId),
	index("idx_template_system_component").on(table.componentCode),
]);

/**
 * Design Service Life Values
 * Standard service life values by asset type and building class
 * Used as reference data for assessments and projections
 */
export const designServiceLifeValues = mysqlTable("design_service_life_values", {
	id: int().autoincrement().notNull().primaryKey(),
	componentCode: varchar({ length: 20 }).notNull(), // UNIFORMAT II code
	componentName: varchar({ length: 255 }).notNull(),
	buildingClass: mysqlEnum(['class_a', 'class_b', 'class_c', 'all']).default('all').notNull(),
	propertyType: varchar({ length: 100 }), // null = applies to all property types
	designServiceLife: int().notNull(), // Standard service life in years
	minServiceLife: int(), // Minimum expected life
	maxServiceLife: int(), // Maximum expected life
	bestCaseServiceLife: int(), // Optimistic scenario
	worstCaseServiceLife: int(), // Pessimistic scenario
	dataSource: varchar({ length: 255 }), // e.g., "BOMA", "ASHRAE", "Industry Standard"
	notes: text(),
	isActive: int().default(1).notNull(),
	companyId: int(), // null = global values, otherwise company-specific overrides
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_dsl_component").on(table.componentCode),
	index("idx_dsl_building_class").on(table.buildingClass),
	index("idx_dsl_property_type").on(table.propertyType),
	index("idx_dsl_company").on(table.companyId),
]);

/**
 * Bulk Service Life Updates
 * Tracks bulk updates to service life values across portfolios
 * Provides audit trail for portfolio-wide changes
 */
export const bulkServiceLifeUpdates = mysqlTable("bulk_service_life_updates", {
	id: int().autoincrement().notNull().primaryKey(),
	companyId: int(),
	updateType: mysqlEnum(['component', 'building_class', 'property_type', 'all']).notNull(),
	componentCode: varchar({ length: 20 }), // null if updating all components
	buildingClass: mysqlEnum(['class_a', 'class_b', 'class_c', 'all']),
	propertyType: varchar({ length: 100 }),
	previousServiceLife: int(),
	newServiceLife: int().notNull(),
	percentageChange: decimal({ precision: 5, scale: 2 }), // e.g., +10% or -5%
	affectedProjectsCount: int().default(0),
	affectedAssessmentsCount: int().default(0),
	reason: text(),
	status: mysqlEnum(['pending', 'in_progress', 'completed', 'failed', 'rolled_back']).default('pending').notNull(),
	appliedAt: timestamp({ mode: 'string' }),
	appliedBy: int(),
	rolledBackAt: timestamp({ mode: 'string' }),
	rolledBackBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_bulk_update_company").on(table.companyId),
	index("idx_bulk_update_status").on(table.status),
	index("idx_bulk_update_component").on(table.componentCode),
]);

/**
 * Bulk Update Affected Items
 * Detailed record of which assessments were affected by a bulk update
 * Enables rollback functionality
 */
export const bulkUpdateAffectedItems = mysqlTable("bulk_update_affected_items", {
	id: int().autoincrement().notNull().primaryKey(),
	bulkUpdateId: int().notNull(),
	assessmentId: int().notNull(),
	projectId: int().notNull(),
	componentCode: varchar({ length: 20 }).notNull(),
	previousServiceLife: int(),
	newServiceLife: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_affected_bulk_update").on(table.bulkUpdateId),
	index("idx_affected_assessment").on(table.assessmentId),
	index("idx_affected_project").on(table.projectId),
]);

// Type exports for new tables
export type BuildingTypeTemplate = typeof buildingTypeTemplates.$inferSelect;
export type InsertBuildingTypeTemplate = typeof buildingTypeTemplates.$inferInsert;
export type TemplateSystem = typeof templateSystems.$inferSelect;
export type InsertTemplateSystem = typeof templateSystems.$inferInsert;
export type DesignServiceLifeValue = typeof designServiceLifeValues.$inferSelect;
export type InsertDesignServiceLifeValue = typeof designServiceLifeValues.$inferInsert;
export type BulkServiceLifeUpdate = typeof bulkServiceLifeUpdates.$inferSelect;
export type InsertBulkServiceLifeUpdate = typeof bulkServiceLifeUpdates.$inferInsert;
export type BulkUpdateAffectedItem = typeof bulkUpdateAffectedItems.$inferSelect;
export type InsertBulkUpdateAffectedItem = typeof bulkUpdateAffectedItems.$inferInsert;

// ============================================
// LEED v5 ESG Enhancement Tables
// ============================================

/**
 * Grid Carbon Intensity - Province/region-specific emission factors
 * Based on Canadian electricity grid data
 */
export const gridCarbonIntensity = mysqlTable("grid_carbon_intensity", {
	id: int().autoincrement().notNull().primaryKey(),
	region: varchar({ length: 100 }).notNull(), // Province or grid region
	country: varchar({ length: 100 }).default('Canada').notNull(),
	year: int().notNull(),
	// Average emission factors (g CO2e/kWh)
	avgEmissionFactor: decimal({ precision: 10, scale: 4 }).notNull(),
	marginalEmissionFactor: decimal({ precision: 10, scale: 4 }), // For time-of-use calculations
	// Time-of-use factors (optional)
	peakEmissionFactor: decimal({ precision: 10, scale: 4 }),
	offPeakEmissionFactor: decimal({ precision: 10, scale: 4 }),
	// Grid composition percentages
	renewablePercent: decimal({ precision: 5, scale: 2 }),
	nuclearPercent: decimal({ precision: 5, scale: 2 }),
	naturalGasPercent: decimal({ precision: 5, scale: 2 }),
	coalPercent: decimal({ precision: 5, scale: 2 }),
	hydroPercent: decimal({ precision: 5, scale: 2 }),
	windPercent: decimal({ precision: 5, scale: 2 }),
	solarPercent: decimal({ precision: 5, scale: 2 }),
	otherPercent: decimal({ precision: 5, scale: 2 }),
	// Future projections
	projectedEmissionFactor2030: decimal({ precision: 10, scale: 4 }),
	projectedEmissionFactor2040: decimal({ precision: 10, scale: 4 }),
	projectedEmissionFactor2050: decimal({ precision: 10, scale: 4 }),
	dataSource: varchar({ length: 255 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_grid_region_year").on(table.region, table.year),
	index("idx_grid_country").on(table.country),
]);

/**
 * Embodied Carbon Materials - Material-level GWP tracking for WBLCA
 */
export const embodiedCarbonMaterials = mysqlTable("embodied_carbon_materials", {
	id: int().autoincrement().notNull().primaryKey(),
	materialCategory: varchar({ length: 100 }).notNull(), // concrete, steel, wood, insulation, etc.
	materialName: varchar({ length: 255 }).notNull(),
	materialDescription: text(),
	// GWP values (kg CO2e per unit)
	gwpPerUnit: decimal({ precision: 15, scale: 4 }).notNull(),
	unit: varchar({ length: 50 }).notNull(), // kg, m3, m2, etc.
	// LCA module coverage
	lcaModulesIncluded: varchar({ length: 50 }).default('A1-A3'), // A1-A3, A1-A5, A-C, etc.
	// EPD information
	epdNumber: varchar({ length: 100 }),
	epdSource: varchar({ length: 255 }),
	epdExpiryDate: timestamp({ mode: 'string' }),
	// Industry benchmarks
	industryAvgGwp: decimal({ precision: 15, scale: 4 }),
	industryBestGwp: decimal({ precision: 15, scale: 4 }),
	// Regional factors
	region: varchar({ length: 100 }),
	transportDistance: decimal({ precision: 10, scale: 2 }), // km
	// Biogenic carbon (for wood products)
	biogenicCarbon: decimal({ precision: 15, scale: 4 }),
	dataSource: varchar({ length: 255 }),
	validFrom: timestamp({ mode: 'string' }),
	validTo: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_material_category").on(table.materialCategory),
	index("idx_material_name").on(table.materialName),
]);

/**
 * Project Embodied Carbon - Whole-building embodied carbon tracking
 */
export const projectEmbodiedCarbon = mysqlTable("project_embodied_carbon", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	assetId: int(), // Optional - if null, applies to entire project
	assessmentDate: timestamp({ mode: 'string' }).notNull(),
	assessmentType: mysqlEnum(['baseline', 'design', 'as_built', 'renovation']).default('design').notNull(),
	// Total GWP by LCA module (kg CO2e)
	gwpModuleA1A3: decimal({ precision: 15, scale: 2 }), // Product stage
	gwpModuleA4: decimal({ precision: 15, scale: 2 }), // Transport to site
	gwpModuleA5: decimal({ precision: 15, scale: 2 }), // Construction
	gwpModuleB1B5: decimal({ precision: 15, scale: 2 }), // Use stage (maintenance, repair, replacement)
	gwpModuleC1C4: decimal({ precision: 15, scale: 2 }), // End of life
	gwpModuleD: decimal({ precision: 15, scale: 2 }), // Beyond system boundary (recycling benefits)
	gwpTotal: decimal({ precision: 15, scale: 2 }).notNull(), // Total A-C
	// Intensity metrics
	gwpPerSqm: decimal({ precision: 10, scale: 4 }), // kg CO2e per m²
	gwpPerSqft: decimal({ precision: 10, scale: 4 }), // kg CO2e per sq ft
	// Breakdown by material category (JSON)
	materialBreakdown: json(), // { concrete: 45000, steel: 12000, ... }
	// Comparison to baseline
	baselineGwp: decimal({ precision: 15, scale: 2 }),
	reductionPercent: decimal({ precision: 5, scale: 2 }),
	// LEED v5 points calculation
	leedPointsEarned: int(),
	leedPathway: mysqlEnum(['wblca', 'epd_project_avg', 'epd_materials', 'construction_tracking']),
	// Other impact categories (WBLCA)
	ozoneDepletion: decimal({ precision: 15, scale: 6 }), // kg CFC-11e
	acidification: decimal({ precision: 15, scale: 4 }), // kg SO2e
	eutrophication: decimal({ precision: 15, scale: 4 }), // kg N eq
	smogFormation: decimal({ precision: 15, scale: 4 }), // kg O3e
	nonRenewableEnergy: decimal({ precision: 15, scale: 2 }), // MJ
	// Metadata
	lcaSoftware: varchar({ length: 100 }),
	lcaMethodology: varchar({ length: 255 }),
	dataQualityScore: decimal({ precision: 3, scale: 2 }), // 1-5 scale
	notes: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_embodied_project").on(table.projectId),
	index("idx_embodied_asset").on(table.assetId),
	index("idx_embodied_date").on(table.assessmentDate),
]);

/**
 * Project Material Quantities - Detailed material tracking for embodied carbon
 */
export const projectMaterialQuantities = mysqlTable("project_material_quantities", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	assetId: int(),
	embodiedCarbonId: int(), // Link to project_embodied_carbon assessment
	materialId: int(), // Link to embodied_carbon_materials
	// Material details
	materialCategory: varchar({ length: 100 }).notNull(),
	materialName: varchar({ length: 255 }).notNull(),
	quantity: decimal({ precision: 15, scale: 4 }).notNull(),
	unit: varchar({ length: 50 }).notNull(),
	// GWP calculation
	gwpPerUnit: decimal({ precision: 15, scale: 4 }).notNull(),
	totalGwp: decimal({ precision: 15, scale: 2 }).notNull(),
	// EPD reference
	epdNumber: varchar({ length: 100 }),
	isProductSpecificEpd: tinyint().default(0),
	// Building element (UNIFORMAT)
	uniformatCode: varchar({ length: 20 }),
	uniformatDescription: varchar({ length: 255 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_material_qty_project").on(table.projectId),
	index("idx_material_qty_embodied").on(table.embodiedCarbonId),
	index("idx_material_qty_category").on(table.materialCategory),
]);

/**
 * LEED v5 Credits - Credit tracking and compliance
 */
export const leedCredits = mysqlTable("leed_credits", {
	id: int().autoincrement().notNull().primaryKey(),
	creditCode: varchar({ length: 20 }).notNull(), // EAp1, EAc1, MRc2, etc.
	creditName: varchar({ length: 255 }).notNull(),
	category: mysqlEnum(['IP', 'LT', 'SS', 'WE', 'EA', 'MR', 'EQ', 'IN', 'RP']).notNull(),
	creditType: mysqlEnum(['prerequisite', 'credit']).notNull(),
	maxPoints: int().notNull(),
	// Applicability
	applicableToNewConstruction: tinyint().default(1),
	applicableToCoreShell: tinyint().default(1),
	// Impact areas
	impactDecarbonization: tinyint().default(0),
	impactQualityOfLife: tinyint().default(0),
	impactEcologicalConservation: tinyint().default(0),
	description: text(),
	requirements: text(),
	documentationRequired: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_leed_credit_code").on(table.creditCode),
	index("idx_leed_category").on(table.category),
]);

/**
 * Project LEED Tracking - Track LEED credits for projects
 */
export const projectLeedTracking = mysqlTable("project_leed_tracking", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	leedVersion: varchar({ length: 20 }).default('v5').notNull(),
	registrationDate: timestamp({ mode: 'string' }),
	targetCertification: mysqlEnum(['certified', 'silver', 'gold', 'platinum']),
	// Credit tracking
	creditId: int().notNull(), // Link to leed_credits
	status: mysqlEnum(['not_started', 'in_progress', 'submitted', 'achieved', 'denied', 'not_pursuing']).default('not_started').notNull(),
	pointsTargeted: int(),
	pointsAchieved: int(),
	// Pathway selection (for credits with multiple options)
	selectedPathway: varchar({ length: 100 }),
	// Documentation
	documentationStatus: mysqlEnum(['not_started', 'in_progress', 'complete', 'submitted']).default('not_started'),
	documentationNotes: text(),
	// Review
	reviewStatus: mysqlEnum(['pending', 'under_review', 'approved', 'denied', 'appealed']),
	reviewComments: text(),
	reviewDate: timestamp({ mode: 'string' }),
	// Metadata
	assignedTo: int(),
	dueDate: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_leed_tracking_project").on(table.projectId),
	index("idx_leed_tracking_credit").on(table.creditId),
	index("idx_leed_tracking_status").on(table.status),
]);

/**
 * Building Performance Factors - ASHRAE climate zone BPFs from LEED v5
 */
export const buildingPerformanceFactors = mysqlTable("building_performance_factors", {
	id: int().autoincrement().notNull().primaryKey(),
	buildingType: varchar({ length: 100 }).notNull(), // multifamily, healthcare, hotel, office, etc.
	ashraeStandard: varchar({ length: 20 }).notNull(), // 90.1-2019, 90.1-2022
	climateZone: varchar({ length: 5 }).notNull(), // 0A, 0B, 1A, 1B, 2A, 2B, 3A, 3B, 3C, 4A, 4B, 4C, 5A, 5B, 5C, 6A, 6B, 7, 8
	bpf: decimal({ precision: 4, scale: 2 }).notNull(), // Building Performance Factor
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_bpf_building_type").on(table.buildingType),
	index("idx_bpf_climate_zone").on(table.climateZone),
	index("idx_bpf_standard").on(table.ashraeStandard),
]);

/**
 * Refrigerant Inventory - Track refrigerants for GWP compliance
 */
export const refrigerantInventory = mysqlTable("refrigerant_inventory", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	assetId: int(),
	equipmentName: varchar({ length: 255 }).notNull(),
	equipmentType: mysqlEnum(['hvac', 'heat_pump', 'chiller', 'refrigeration', 'data_center', 'other']).notNull(),
	refrigerantType: varchar({ length: 50 }).notNull(), // R-410A, R-32, R-134a, etc.
	refrigerantGwp: int().notNull(), // 100-year GWP relative to CO2
	chargeAmount: decimal({ precision: 10, scale: 2 }).notNull(), // kg
	totalGwpCharge: decimal({ precision: 15, scale: 2 }), // kg * GWP = tCO2e
	// LEED v5 benchmarks
	gwpBenchmark: int(), // 1400, 700, or 300 depending on equipment
	meetsLeedBenchmark: tinyint(),
	// Leakage tracking
	annualLeakageRate: decimal({ precision: 5, scale: 2 }), // percentage
	lastLeakCheck: timestamp({ mode: 'string' }),
	leakDetectionSystem: tinyint().default(0),
	// Maintenance
	installDate: timestamp({ mode: 'string' }),
	expectedLifespan: int(), // years
	maintenanceSchedule: varchar({ length: 100 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_refrigerant_project").on(table.projectId),
	index("idx_refrigerant_asset").on(table.assetId),
	index("idx_refrigerant_type").on(table.refrigerantType),
]);

/**
 * Operational Carbon Tracking - Detailed GHG emissions tracking
 */
export const operationalCarbonTracking = mysqlTable("operational_carbon_tracking", {
	id: int().autoincrement().notNull().primaryKey(),
	projectId: int().notNull(),
	assetId: int(),
	recordDate: timestamp({ mode: 'string' }).notNull(),
	recordPeriod: mysqlEnum(['monthly', 'quarterly', 'annual']).default('monthly').notNull(),
	// Scope 1 - Direct emissions
	scope1Natural_gas: decimal({ precision: 15, scale: 4 }), // tCO2e
	scope1Propane: decimal({ precision: 15, scale: 4 }),
	scope1Diesel: decimal({ precision: 15, scale: 4 }),
	scope1Refrigerants: decimal({ precision: 15, scale: 4 }),
	scope1Other: decimal({ precision: 15, scale: 4 }),
	scope1Total: decimal({ precision: 15, scale: 4 }),
	// Scope 2 - Indirect emissions (purchased energy)
	scope2Electricity: decimal({ precision: 15, scale: 4 }), // tCO2e
	scope2DistrictHeating: decimal({ precision: 15, scale: 4 }),
	scope2DistrictCooling: decimal({ precision: 15, scale: 4 }),
	scope2Steam: decimal({ precision: 15, scale: 4 }),
	scope2Total: decimal({ precision: 15, scale: 4 }),
	// Scope 2 calculation method
	scope2Method: mysqlEnum(['location_based', 'market_based']).default('location_based'),
	gridEmissionFactor: decimal({ precision: 10, scale: 4 }), // g CO2e/kWh used
	// Scope 3 - Other indirect (optional)
	scope3Commuting: decimal({ precision: 15, scale: 4 }),
	scope3Waste: decimal({ precision: 15, scale: 4 }),
	scope3WaterSupply: decimal({ precision: 15, scale: 4 }),
	scope3Other: decimal({ precision: 15, scale: 4 }),
	scope3Total: decimal({ precision: 15, scale: 4 }),
	// Totals
	totalEmissions: decimal({ precision: 15, scale: 4 }).notNull(),
	emissionsIntensity: decimal({ precision: 10, scale: 4 }), // kg CO2e per sqft
	// Energy consumption (for reference)
	electricityKwh: decimal({ precision: 15, scale: 2 }),
	naturalGasM3: decimal({ precision: 15, scale: 2 }),
	// Verification
	verificationStatus: mysqlEnum(['unverified', 'self_verified', 'third_party_verified']).default('unverified'),
	verifiedBy: varchar({ length: 255 }),
	verificationDate: timestamp({ mode: 'string' }),
	notes: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_op_carbon_project").on(table.projectId),
	index("idx_op_carbon_asset").on(table.assetId),
	index("idx_op_carbon_date").on(table.recordDate),
]);

// Type exports for LEED v5 ESG tables
export type GridCarbonIntensity = typeof gridCarbonIntensity.$inferSelect;
export type InsertGridCarbonIntensity = typeof gridCarbonIntensity.$inferInsert;
export type EmbodiedCarbonMaterial = typeof embodiedCarbonMaterials.$inferSelect;
export type InsertEmbodiedCarbonMaterial = typeof embodiedCarbonMaterials.$inferInsert;
export type ProjectEmbodiedCarbon = typeof projectEmbodiedCarbon.$inferSelect;
export type InsertProjectEmbodiedCarbon = typeof projectEmbodiedCarbon.$inferInsert;
export type ProjectMaterialQuantity = typeof projectMaterialQuantities.$inferSelect;
export type InsertProjectMaterialQuantity = typeof projectMaterialQuantities.$inferInsert;
export type LeedCredit = typeof leedCredits.$inferSelect;
export type InsertLeedCredit = typeof leedCredits.$inferInsert;
export type ProjectLeedTracking = typeof projectLeedTracking.$inferSelect;
export type InsertProjectLeedTracking = typeof projectLeedTracking.$inferInsert;
export type BuildingPerformanceFactor = typeof buildingPerformanceFactors.$inferSelect;
export type InsertBuildingPerformanceFactor = typeof buildingPerformanceFactors.$inferInsert;
export type RefrigerantInventory = typeof refrigerantInventory.$inferSelect;
export type InsertRefrigerantInventory = typeof refrigerantInventory.$inferInsert;
export type OperationalCarbonTracking = typeof operationalCarbonTracking.$inferSelect;
export type InsertOperationalCarbonTracking = typeof operationalCarbonTracking.$inferInsert;
