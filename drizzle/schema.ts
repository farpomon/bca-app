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
	permission: mysqlEnum(['view','edit']).default('view').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

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
});

export const assets = mysqlTable("assets", {
	id: int().autoincrement().notNull(),
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
},
(table) => [
	index("idx_status").on(table.status),
	index("idx_created").on(table.createdAt),
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
	scoreDate: timestamp({ mode: 'string' }).notNull(),
	energyScore: decimal({ precision: 5, scale: 2 }),
	waterScore: decimal({ precision: 5, scale: 2 }),
	wasteScore: decimal({ precision: 5, scale: 2 }),
	emissionsScore: decimal({ precision: 5, scale: 2 }),
	compositeScore: decimal({ precision: 5, scale: 2 }),
	benchmarkPercentile: int(),
	certifications: json(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const facilityModels = mysqlTable("facility_models", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	fileUrl: varchar({ length: 1024 }).notNull(),
	fileKey: varchar({ length: 512 }).notNull(),
	fileSize: int(),
	format: mysqlEnum(['glb','gltf','fbx','obj']).notNull(),
	version: int().default(1).notNull(),
	isActive: tinyint().default(1).notNull(),
	metadata: json(),
	uploadedBy: int().notNull(),
	uploadedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
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
