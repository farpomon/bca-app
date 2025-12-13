# BCA App TODO

## MFA Enhancements (Completed)

### Feature 1: Admin MFA Reset Capability
- [x] Add admin.resetUserMfa endpoint with audit logging
- [x] Enhanced resetUserMfa to accept optional reason parameter
- [x] Log MFA reset events to mfa_audit_log table with full context
- [x] Added logMfaAuditEvent function to mfaDb.ts
- [x] Audit log includes admin details (who reset, target user, reason)
- [x] Show success message after reset with audit confirmation
- [x] Create comprehensive test suite (mfa.enhancements.test.ts)

### Feature 2: 7-Day Grace Period
- [x] Add mfaGracePeriodEnd timestamp field to users table
- [x] Update admin.enforceMfaForRole to set grace period (7 days from enforcement)
- [x] Update admin.requireMfaForUser to set grace period (7 days from enforcement)
- [x] Update mfa.checkMfaRequirement to check grace period expiry
- [x] Calculate days remaining in grace period
- [x] Add inGracePeriod, gracePeriodExpired, mustSetupNow flags
- [x] Create MFAGracePeriodBanner component
- [x] Show days remaining with color-coded urgency (orange for ≤2 days)
- [x] Show critical warning when grace period expired
- [x] Add banner to DashboardLayout for all authenticated pages
- [x] Test grace period countdown and expiry logic

### Feature 3: MFA Compliance Reports
- [x] Create getMfaComplianceReport function in admin router
- [x] Calculate adoption rates by role (admin, project_manager, editor, viewer)
- [x] Calculate adoption rates by time period (last 7 days, 30 days, 90 days, all)
- [x] Generate user details with MFA status for CSV export
- [x] Create MFAComplianceReport component with download functionality
- [x] Add MFA Compliance tab in Admin section
- [x] Build compliance report UI with time period filters
- [x] Show summary stats cards (total users, MFA enabled, adoption rate)
- [x] Show adoption breakdown by role in table format
- [x] Show detailed user list with MFA and grace period status
- [x] Implement CSV download with all user details
- [x] Add color-coded badges for adoption rates (green ≥80%, yellow ≥50%, red <50%)
- [x] Test report generation and CSV export

## SaaS Registration Approval & Multi-Tenant Isolation

### Phase 1: Access Requests Backend
- [x] Create access_requests table in schema
  - [x] Columns: id, openId, fullName, email, companyName, city, phoneNumber, useCase, status, submittedAt, reviewedAt, reviewedBy, adminNotes, rejectionReason
- [x] Create accessRequests router with endpoints:
  - [x] submit - New user submits access request
  - [x] list - Admin views all pending requests
  - [x] approve - Admin approves and assigns company/role
  - [x] reject - Admin rejects with reason
  - [x] getMyRequest - User checks their request status
  - [x] getPendingCount - Get count of pending requests
- [x] Register accessRequests router in main router

### Phase 2: New User Request Access Flow
- [x] Create RequestAccessForm component
  - [x] Form fields: Full Name, Email, Company, City, Phone, Reason
  - [x] Validation and submission
  - [x] Show on first login for unapproved users
- [x] Create PendingApproval page
  - [x] Show "Request submitted" message
  - [x] Display request status and submission date
  - [x] Show estimated review time (24-48 hours)
  - [x] Refresh button to check status
  - [x] Auto-refresh every 30 seconds
- [x] Add PendingApproval route to App.tsx
- [ ] Update useAuth hook to check approval status (pending)
  - [ ] Check if user has company assigned
  - [ ] Redirect unapproved users to request/pending page
  - [ ] Allow approved users to proceed normally

### Phase 3: Admin Approval Dashboard
- [x] Add "Access Requests" tab to Admin section
- [x] Create pending requests table
  - [x] Display: Name, Email, Company, City, Status, Submitted Date
  - [x] Actions: Approve, Reject buttons for pending requests
- [x] Create ApproveRequestDialog
  - [x] Editable: Company Name, City, Role, Account Status
  - [x] Trial days field (if trial status)
  - [x] Admin notes field
  - [x] Confirm button
- [x] Create RejectRequestDialog
  - [x] Rejection reason field (shown to user)
  - [x] Admin notes field (internal)
- [x] Show pending count badge on Admin nav with auto-refresh

### Phase 4: Multi-Tenant Data Isolation
- [x] Update project queries to filter by company
  - [x] getUserProjects - only show user's company projects (admin sees all)
  - [x] getDeletedProjects - filter by company (admin sees all)
  - [ ] getProjectById - verify company ownership
  - [ ] Update tRPC endpoints to pass company and isAdmin flags
- [ ] Update all assessment queries to filter by project's company
- [ ] Update all asset queries to filter by project's company
- [ ] Add company validation to all mutations
  - [ ] Create: auto-assign user's company
  - [ ] Update/Delete: verify company ownership

### Phase 5: Company Filters in UI
- [ ] Update Projects page
  - [ ] Auto-filter by user's company (non-admins)
  - [ ] Show company filter dropdown (admins only)
- [ ] Update user profile to show company name
- [ ] Add company name to project cards
- [ ] Ensure no cross-company data leaks in:
  - [ ] Search results
  - [ ] Shared links
  - [ ] Export functions
  - [ ] Reports

### Phase 6: Testing & Security
- [ ] Test registration flow end-to-end
- [ ] Test company data isolation
  - [ ] User A cannot see User B's projects (different companies)
  - [ ] User A cannot access User B's project by URL
  - [ ] Admin can see all companies
- [ ] Test approval/rejection flow
- [ ] Create checkpoint

## Completed Features

### Soft Delete with 90-Day Recovery
- [x] Add "deleted" status to projects status enum
- [x] Add deletedAt timestamp column to projects table
- [x] Add deletedBy column to track who deleted the project
- [x] Update projects.delete mutation to soft delete
- [x] Create projects.restore mutation
- [x] Update projects.list to exclude deleted projects by default
- [x] Create projects.listDeleted to show deleted projects
- [x] Create "Deleted Projects" view/tab
- [x] Create cleanup function for projects > 90 days old
- [x] Add admin endpoint to trigger cleanup manually

### Admin User Management
- [x] Create users.list tRPC query (admin only)
- [x] Create users.updateRole tRPC mutation (admin only)
- [x] Create users.updateAccountStatus tRPC mutation (admin only)
- [x] Add "User Management" tab to Admin page
- [x] Create user list table with all user details
- [x] Add role dropdown for each user
- [x] Add account status dropdown for each user
- [x] Disable dropdown for current user (prevent self-demotion)
- [x] Show success/error toasts

### User Management Enhancements (In Progress)
- [x] Add updateAccountStatus mutation to users router
- [x] Add account status dropdown next to role dropdown
- [x] Add search input above user table
- [x] Implement client-side search by name, email, company
- [x] Add filter dropdowns for Role, Account Status, Company
- [x] Show active filter count badge
- [x] Add "Clear Filters" button
- [ ] Create activity_logs table (pending)
- [ ] Create user activity log UI (pending)


## UI Improvements
- [x] Remove info icons from Create New Project form
- [x] Restore expandable accordion functionality for UNIFORMAT II component groups in Assessment page
- [x] Users can click on major groups (A, B, C, D, E, F, G) to expand and see sub-components (Level 2 and Level 3)
- [x] Make Component Assessment form optional - removed right-side form, now only shows in dialog when component is clicked

## Bug Fixes
- [x] Fix voice-to-text transcription not saving to the corresponding field in assessment form (fixed stale closure issue by using functional state updates)

## Feature Enhancements
- [x] Add voice input to Component Name field
- [x] Add voice input to Component Location field

## Offline Capabilities
- [x] Save voice recordings locally when offline (using IndexedDB)
- [x] Auto-transcribe saved recordings when connection is restored
- [x] Show offline recording queue status to user (OfflineQueueWidget)

## Critical Bugs
- [x] Fix logout error - Added redirect to home page after logout to prevent accessing protected pages

## Data Issues
- [x] Fixed projects not showing up - Updated projects.list router to pass company and isAdmin parameters to getUserProjects function
- [x] Verified 1,695 projects now visible for admin user

## Current Tasks

### AI Document Parsing Error Handling
- [x] Add comprehensive error handling to AI document parser
  - [x] Add try-catch blocks with specific error types (PDF parsing, AI extraction, network errors)
  - [x] Return detailed error messages for different failure scenarios
  - [x] Add file size validation (max 10MB)
  - [x] Add file type validation (PDF/Word only)
  - [x] Update frontend to display parsing errors to users
  - [x] Add error logging for debugging

## Current Issues
- [x] Projects showing in Admin Dashboard but not in main Projects page (Admin Dashboard works as workaround)
- [x] Make project names clickable in Admin Dashboard to navigate to project details

## AI Enhancement Features
- [x] Create backend tRPC procedure for AI text enhancement using BCA industry best practices
- [x] Update VoiceRecorder to show original vs enhanced transcription
- [x] Add user choice between original and enhanced version ("Use Enhanced" or "Use Original" buttons)
- [x] Track transcription history to preserve all versions (original + enhanced) via IndexedDB

## AI Import Enhancements
- [x] Change AI import to save entire PDF/Word pages as images instead of extracting individual photos
- [x] Associate each page image with the appropriate UNIFORMAT II sub-section using AI classification
- [x] Preserve full page context (text, tables, diagrams around photos)
- [x] Fix AI classification prompt to correctly parse pages with photos
- [x] Improve prompt with better instructions for photo captions and visual content
- [x] Add examples of how to extract component codes from photo descriptions
- [x] Increased context from 300 to 800 characters for better classification
- [x] Added comprehensive keyword lists for each building system
- [x] Added reasoning field to AI response for transparency

## Landing Page Updates
- [x] Remove code edition references (e.g., ASTM E2018-15 → ASTM E2018)
- [x] Update all standard references to show only base code without edition year suffix

## AI Import Error Fixes
- [x] Investigate "failed to parse" error in AI import (canvas rendering issue)
- [x] Replace broken canvas-based PDF rendering with pdf-poppler
- [x] Use Google Gemini Vision API to analyze page images directly
- [x] Implement multimodal classification (image + text) for better accuracy
- [x] Upload page images to S3 for vision analysis
- [x] Process pages in batches of 5 to avoid token limits
- [x] Add structured JSON schema for classification results

## Mobile Assessment Page Enhancements
- [x] Show assessment summary in UNIFORMAT section headers (e.g., "3 Good, 2 Fair, 1 Poor")
- [x] Make Assessment Progress section expandable
- [x] Show list of components when clicking on condition boxes (Good/Fair/Poor)
- [x] Make components in the list clickable to open assessment dialog
- [x] Add hover effects to condition boxes for better UX

## Asset Document Management
- [ ] Create database schema for asset documents (assetDocuments table)
- [ ] Add document upload API endpoint (accepts PDF/Word files)
- [ ] Store documents in S3 with proper file keys
- [ ] Create UI for uploading documents to assets
- [ ] Display list of uploaded documents for each asset
- [ ] Add download/view functionality for uploaded documents
- [ ] Add delete document functionality

## Voice Input Bug Fix
- [x] Investigate why voice transcriptions don't appear in form fields
- [x] Fix VoiceRecorder callback integration
- [x] Fix RichTextEditor to sync with external content changes
- [x] Test voice input on all fields (observations, recommendations, component name, location)
- [x] Verify transcription text is properly inserted into fields

## Assessment Document Upload Feature
- [x] Create assessment_documents table in database schema
- [x] Add backend API endpoints for document upload/list/delete
- [ ] Build DocumentUpload component with drag-and-drop support
- [ ] Integrate document upload into AssessmentDialog
- [ ] Add document list display in assessment view
- [ ] Add download/view functionality for uploaded documents
- [ ] Test with PDF and Word documents

## Deployment Fixes
- [x] Remove pdf-poppler dependency causing node-gyp errors
- [x] Remove canvas package completely from dependencies
- [x] Remove canvas from onlyBuiltDependencies in package.json
- [x] Disable AI import temporarily to fix deployment
- [x] Server compiles and runs successfully without native dependencies
- [x] Verified no canvas dependencies remain
- [ ] Re-implement AI import using cloud-based PDF processing service (future enhancement)

## Compliance & Certifications Features

### Phase 1: Enhanced Audit Logging
- [x] Extend audit_log table with compliance fields (data_classification, retention_policy, compliance_tags)
- [x] Add audit logging for all sensitive operations (data access, modifications, exports, deletions)
- [x] Create audit log viewer with filtering and search
- [x] Add audit log export functionality for compliance reviews

### Phase 2: Data Residency & Consent Management
- [x] Create data_residency_settings table
- [x] Create user_consents table for tracking privacy agreements
- [x] Build consent management UI (user consent forms, consent history)
- [x] Add data residency display in admin settings
- [x] Create privacy policy acceptance workflow

### Phase 3: Compliance Dashboard
- [x] Create compliance dashboard page (admin only)
- [x] Add compliance metrics (audit coverage, consent rates, data retention)
- [x] Build compliance report generator (PDF/CSV exports)
- [x] Add data classification summary view
- [x] Create compliance checklist tracker

### Phase 4: User Privacy Controls
- [x] Add "Export My Data" feature (FOIP data portability)
- [x] Add "Delete My Account" feature (right to deletion)
- [x] Create data access request workflow
- [x] Add privacy settings page for users
- [ ] Implement data anonymization for deleted users (backend logic pending)

### Phase 5: Documentation & Testing
- [ ] Create compliance documentation page
- [ ] Add system security information display
- [ ] Test all compliance features
- [ ] Create compliance admin guide
- [ ] Save checkpoint

## Bug Fixes - Assessment Progress & Voice Input
- [x] Fix assessment progress to display actual component names instead of "Unknown Component"
- [x] Fix voice transcription not working for component name field (Input field issue)
- [x] Test both fixes thoroughly

## Bug Fixes - Building Codes Dropdown
- [x] Fix building codes dropdown not working in project creation form
- [x] Verify building codes are loading from database
- [x] Fix NaN validation error when no building code is selected
- [x] Test project creation with and without building code selection

## Data Security & Encryption Requirements

### Phase 1: Encryption Documentation & Data Ownership
- [x] Document encryption in transit (TLS 1.3)
- [x] Document encryption at rest (database and S3)
- [x] Document encryption key management (Manus platform)
- [x] Add data ownership declaration in system settings
- [x] Create data ownership documentation page
- [x] Add "City data ownership" banner/notice in admin

### Phase 2: Data Retention Policies
- [x] Create data_retention_policies table
- [x] Implement 7-year default retention policy
- [x] Add retention policy configuration UI (admin)
- [x] Add retention policy enforcement logic
- [x] Display retention policy in compliance dashboard
- [x] Add retention policy to audit logs

### Phase 3: Secure Data Disposal
- [x] Create data_disposal_requests table
- [x] Build secure data purge API endpoints
- [x] Implement backup purge tracking
- [x] Add data disposal request workflow (admin)
- [x] Create data disposal audit trail
- [x] Add "Request Data Deletion" feature for projects

### Phase 4: Security Documentation
- [x] Update compliance documentation with encryption details
- [x] Add data security information page
- [x] Document key management and ownership
- [x] Create admin guide for data retention and disposal
- [x] Add security settings page


## Enterprise Authentication & Access Control (City Requirements)

### SAML 2.0 / Active Directory Integration
- [ ] Install passport-saml package for SAML 2.0 authentication
- [ ] Create SAML configuration endpoint for City's Identity Provider metadata
- [ ] Implement SAML authentication strategy with Active Directory integration
- [ ] Add SAML callback route for SSO login flow
- [ ] Create SAML metadata endpoint for Service Provider configuration
- [ ] Add environment variables for SAML configuration (IdP URL, certificate, entity ID)
- [ ] Test SAML login flow with mock IdP
- [ ] Add fallback to Manus OAuth for non-City users

### Granular RBAC Enhancement (Read-Only vs Read-Write)
- [ ] Add granular permissions table (resource, action, role mapping)
- [ ] Define permission constants (read, write, delete, approve, admin)
- [ ] Create permission checking middleware for tRPC procedures
- [ ] Update existing procedures with permission enforcement
- [ ] Add read-only mode for viewer role (no create/update/delete)
- [ ] Add read-write mode for editor role (create/update own resources)
- [ ] Add project manager permissions (manage team projects)
- [ ] Add admin permissions (full system access)
- [ ] Add permission inheritance (roles inherit lower permissions)

### Permission Management UI
- [ ] Create permission management page in Admin section
- [ ] Add role permission matrix UI (grid showing role vs permissions)
- [ ] Add user permission override UI (grant specific permissions to users)
- [ ] Add audit log for permission changes
- [ ] Add permission testing tool for admins
- [ ] Show user's effective permissions in profile

### Testing & Documentation
- [ ] Write tests for SAML authentication flow
- [ ] Write tests for permission enforcement
- [ ] Write tests for role-based access control
- [ ] Create SAML integration documentation for IT department
- [ ] Document permission model and role capabilities
- [ ] Create user guide for access control


## Comprehensive Audit Trail System (City Requirements)

### Authentication Event Logging
- [x] Create authAudit.ts service for authentication event logging
- [x] Log successful login attempts with timestamp, IP, user agent
- [x] Log unsuccessful login attempts with failure reason
- [x] Log SAML authentication events
- [x] Log logout events
- [x] Log session timeout events
- [x] Log account lockout events
- [x] Create audit.getAuthLogs tRPC endpoint

### System Configuration Audit Logging
- [x] Create configAudit.ts service for configuration change logging
- [x] Log role changes with old/new values
- [x] Log permission changes
- [x] Log system settings changes
- [x] Log SAML configuration changes
- [x] Log retention policy changes
- [x] Log encryption key rotation
- [x] Log backup and restore operations
- [x] Create audit.getConfigLogs tRPC endpoint

### Audit Log Export & Reporting
- [x] Create audit.exportLogs endpoint for CSV export
- [x] Add date range filtering for audit logs
- [x] Add event type filtering
- [x] Add user filtering
- [x] Add IP address filtering
- [x] Create audit log viewer UI (admin only)
- [ ] Add real-time audit log monitoring dashboard
- [ ] Add audit log retention policy (7 years)

### Testing
- [ ] Write tests for authentication audit logging
- [ ] Write tests for configuration audit logging
- [ ] Write tests for audit log export
- [ ] Test audit log viewer UI
- [ ] Verify audit logs are immutable


## Security Architecture & Vulnerability Management (City Requirements)

### Phase 1: Security Documentation
- [x] Create comprehensive Security Architecture document (SECURITY_ARCHITECTURE.md)
  - [x] Infrastructure security & threat protection
  - [x] Multi-tenancy & data isolation architecture
  - [x] Application security controls
  - [x] Data protection & encryption
  - [x] Audit logging & security monitoring
  - [x] Vulnerability management processes
  - [x] Incident response & business continuity
  - [x] Compliance with NIST, OWASP, CIS standards

- [x] Create Vulnerability Assessment Procedures document (VULNERABILITY_ASSESSMENT.md)
  - [x] City vulnerability assessment rights and procedures
  - [x] Vendor penetration testing methodology
  - [x] Vulnerability scanning processes
  - [x] Remediation timelines by severity
  - [x] Patch management procedures
  - [x] Security testing tools and configuration
  - [x] Vulnerability disclosure policy

### Phase 2: Application-Level Security Implementation
- [x] Implement comprehensive security middleware (security.ts)
  - [x] Helmet security headers (HSTS, CSP, X-Frame-Options, etc.)
  - [x] Rate limiting (API: 100 req/15min, Auth: 5 attempts/15min, Upload: 20/hour)
  - [x] Input validation & sanitization (SQL injection, XSS prevention)
  - [x] Request size limiting (50MB max)
  - [x] CORS configuration
  - [x] Security event logging

- [x] Apply security middleware to Express server
  - [x] All API endpoints protected with rate limiting
  - [x] Authentication endpoints with strict rate limiting
  - [x] Upload endpoints with dedicated rate limiting
  - [x] Input validation on all requests
  - [x] Security headers on all responses

### Phase 3: Security Monitoring
- [x] Failed authentication attempt logging
- [x] Rate limit violation logging
- [x] SQL injection attempt detection and logging
- [x] XSS attempt detection and logging
- [x] Authorization failure logging (403 errors)
- [x] IP-based access monitoring

### Phase 4: Testing
- [x] Create comprehensive security test suite (security.test.ts)
- [x] Test SQL injection blocking
- [x] Test XSS blocking
- [x] Test legitimate content allowed
- [x] Verify input validation accuracy
- [x] Test false positive handling

### Phase 5: Deployment Preparation
- [ ] Review security documentation with City IT security team
- [ ] Coordinate City-conducted vulnerability assessment (2 weeks notice)
- [ ] Configure SAML SSO with City Active Directory
- [ ] Establish security contacts and incident response procedures
- [ ] Schedule quarterly security reviews and annual penetration testing


## Business Continuity & Disaster Recovery (City Requirements)

### Phase 1: BC/DR Documentation
- [x] Create comprehensive Business Continuity and Disaster Recovery Plan (BUSINESS_CONTINUITY_DISASTER_RECOVERY.md)
  - [x] Recovery objectives (RTO: 4 hours, RPO: 24 hours, SLA: 99.5% uptime)
  - [x] High availability architecture (redundancy, failover, load balancing)
  - [x] Backup strategy (full, incremental, transaction logs, snapshots)
  - [x] Backup security (encryption, key management, geographic separation)
  - [x] Disaster recovery procedures (database, full system, automated failover)
  - [x] Business continuity (incident response, communication, alternate procedures)
  - [x] Testing & validation (monthly, quarterly, annual DR exercises)
  - [x] Preventive measures (monitoring, capacity planning, change management)
  - [x] Compliance (ISO 22301, NIST SP 800-34, 7-year retention)

### Phase 2: Implementation (Manus Platform)
- [ ] Verify Manus platform meets RTO/RPO requirements
- [ ] Verify backup frequency and retention policies
- [ ] Verify geographic distribution and redundancy
- [ ] Verify encryption at rest and in transit
- [ ] Verify automated failover capabilities
- [ ] Document Manus platform BC/DR capabilities

### Phase 3: Testing & Validation
- [ ] Schedule monthly recovery tests (small-scale)
- [ ] Schedule quarterly full recovery tests
- [ ] Schedule annual comprehensive DR exercise
- [ ] Document test results and improvements
- [ ] Create test report template
- [ ] Establish test success criteria

### Phase 4: Incident Response
- [ ] Create incident response team contact list
- [ ] Create incident severity classification guide
- [ ] Create incident escalation procedures
- [ ] Create stakeholder communication templates
- [ ] Create post-incident review template
- [ ] Test incident response procedures


## Incident Management & Notification (City Requirements)

### Phase 1: Incident Management Documentation
- [x] Create comprehensive Incident Management & Notification Procedures (INCIDENT_MANAGEMENT.md)
  - [x] Incident classification (Security, Service Degradation, Data, Compliance)
  - [x] Severity levels (Critical, High, Medium, Low)
  - [x] Security breach notification timelines (1 hour to 24 hours)
  - [x] Service degradation notification timelines (15 minutes to 4 hours)
  - [x] Multi-channel communication (Email, phone, secure portal)
  - [x] Incident response procedures (Detection → Resolution)
  - [x] Escalation procedures (Technical and management paths)
  - [x] Post-incident reviews and lessons learned

### Phase 2: Liability & Financial Penalties
- [x] Document SLA penalties (5-50% of monthly fee)
  - [x] Availability violations (uptime-based)
  - [x] Performance violations (response time-based)
  - [x] Support response violations ($50-$500 per incident)
  - [x] Penalties capped at 100% monthly fee

- [x] Document data breach penalties ($5K-$2M)
  - [x] Minor breach (<100 records): $5K-$25K, cap $100K
  - [x] Moderate breach (100-1K records): $25K-$100K, cap $500K
  - [x] Major breach (1K-10K records): $100K-$500K, cap $2M
  - [x] Critical breach (>10K records): $500K-$2M, no cap for gross negligence
  - [x] Aggravating/mitigating factors (25-100% adjustment)

- [x] Document liability framework
  - [x] Data breach liability for vendor negligence
  - [x] Data loss liability for backup failures
  - [x] Service unavailability penalties per SLA
  - [x] Wrongful disclosure liability
  - [x] Total liability cap: $5M annually (exceptions for gross negligence)

- [x] Document insurance requirements
  - [x] Cyber liability: $5M minimum
  - [x] Professional liability: $2M minimum
  - [x] General liability: $2M minimum
  - [x] City named as additional insured

### Phase 3: Compliance and Legal
- [x] Document PIPEDA and provincial privacy law compliance
- [x] Document regulatory reporting assistance
- [x] Document data protection obligations (minimization, purpose limitation, retention, portability)
- [x] Document dispute resolution process (Operational → Arbitration)

### Phase 4: Implementation
- [ ] Create incident notification system (email, SMS, portal)
- [ ] Create incident tracking database
- [ ] Create incident escalation workflow
- [ ] Create stakeholder contact list
- [ ] Create incident response playbooks
- [ ] Test incident notification system

### Phase 5: Continuous Improvement
- [ ] Schedule quarterly incident trend analysis
- [ ] Create lessons learned documentation process
- [ ] Update procedures based on incidents
- [ ] Update procedures based on industry best practices
- [ ] Review insurance coverage annually


## Photo Upload Display Bug Fix
- [x] Fix photos not displaying after saving assessment
- [x] Create byAssessment tRPC endpoint to retrieve photos for specific assessments
- [x] Create ExistingPhotosDisplay component with grid view and delete functionality
- [x] Integrate ExistingPhotosDisplay into AssessmentDialog
- [x] Test photo display after saving assessment

## Enterprise Authentication Foundation
- [x] Install @node-saml/passport-saml package
- [x] Create SAML configuration module (server/_core/saml.ts)
- [x] Add SAML environment variables (SAML_ENABLED, SAML_ENTRY_POINT, SAML_ISSUER, etc.)
- [x] Generate Service Provider metadata for IT department
- [ ] Implement SAML authentication routes (pending)
- [ ] Test SAML login flow (pending)

## Project Sorting Feature
- [x] Add sort dropdown with 7 criteria (name, client name, status, created date, updated date, address, building code)
- [x] Add ascending/descending toggle button
- [x] Implement sorting logic with useMemo optimization
- [x] Add visual indicators with arrow icons
- [x] Persist sort preferences in localStorage
- [x] Add smooth transitions for better UX

## TypeScript Error Fixes
- [x] Fix role enum expansion for new roles (viewer, editor, project_manager, admin)
- [x] Fix boolean-to-number conversions for tinyint fields (isDefault, isActive, isShared, isRecurring)
- [x] Fix Date-to-ISO string conversions across all routers
- [x] Reduce TypeScript errors from 99 to 61

## Multi-Tenant Data Isolation Enhancement
- [x] Update getProjectById with company ownership validation
- [x] Update createProject with company assignment
- [x] Update updateProject with company ownership validation
- [x] Update deleteProject with company ownership validation
- [x] Add verifyProjectAccess helper function
- [x] Update all 52 getProjectById calls across routers to enforce company-based access control
- [x] Admins can see all companies, non-admins restricted to their own company
- [x] Prevent cross-company data access for projects, assessments, deficiencies, photos, cost estimates

## AI Import Re-enablement
- [x] Fix all 61 TypeScript errors
- [x] Re-enable AI Import feature with text-only extraction
- [x] Remove canvas dependencies completely
- [x] Use text extraction only (no image rendering)
- [x] Test AI import with real BCA documents

## AI Import Error Handling Enhancement
- [x] Create custom error types (ValidationError, DocumentParsingError, AIExtractionError)
- [x] Add detailed error messages for each failure scenario
- [x] Add file size validation (max 10MB)
- [x] Add file type validation (PDF/Word only)
- [x] Add text length validation (min 100 characters)
- [x] Add page-level error handling for PDFs
- [x] Add network error handling for file downloads
- [x] Update frontend to display specific error messages
- [x] Add comprehensive error logging with context
- [x] Create AI_IMPORT_ERROR_HANDLING.md documentation

## Document Attachment System
- [x] Create project_documents table in database schema
- [x] Create assessment_documents table in database schema
- [x] Add backend API endpoints for document upload/list/delete
- [x] Implement S3 storage for documents
- [x] Add multi-tenant isolation (users can only access their company's documents)
- [x] Add admin access (admins can access all companies' documents)
- [x] Create DocumentUploadZone component with drag-and-drop
- [x] Create ProjectDocumentList component with download/delete
- [x] Add Documents tab to ProjectDetail page
- [x] Write 16 comprehensive tests for authentication, authorization, and multi-tenant isolation
- [x] All tests passing

## Document Attachment Enhancements
- [x] Add document upload section to AssessmentDialog
- [x] Integrate DocumentUploadZone and DocumentList components
- [x] Documents only available in edit mode (after assessment is saved)
- [x] Add document count to project stats query
- [x] Display document count badge on project cards (only when documents > 0)
- [x] Display document count badge on Documents tab in ProjectDetail
- [x] Test all features with proper multi-tenant isolation

## Multi-Factor Authentication (MFA) Implementation
- [x] Create database schema (user_mfa_settings, trusted_devices, mfa_audit_log)
- [x] Implement MFA service (TOTP generation/verification, QR codes, backup codes, encryption)
- [x] Create tRPC API endpoints (setup, enable, disable, verify, device trust management)
- [x] Build MFASetupWizard component (step-by-step enrollment with QR code scanning)
- [x] Build MFAVerification component (login verification with backup code support)
- [x] Build MFASettings component (user management of MFA, backup codes, trusted devices)
- [x] Create SecuritySettings page (dedicated security settings interface)
- [x] Implement TOTP authentication (Google Authenticator, Microsoft Authenticator, Authy)
- [x] Implement 10 single-use backup codes with regeneration
- [x] Implement device trust (30-day remember me)
- [x] Add comprehensive audit logging
- [x] Add rate limiting and security controls
- [x] Write 14 vitest tests (all passing)

## AI Import for Assets
- [x] Add AI Import button on Assets page with sparkle icon
- [x] Create AIImportAssetDialog component for uploading PDF/Word documents
- [x] Implement AI-powered extraction of asset information (name, type, address, year built, floor area, stories, construction type, description)
- [x] Create assets.aiImport endpoint using LLM for document parsing
- [x] Create assetDocuments router for future document management (upload, list, delete)
- [x] Create asset_documents table in database schema
- [x] Add unit tests for AI import validation (file type and size checks)
- [x] Test end-to-end AI import flow
