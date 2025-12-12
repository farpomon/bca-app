# BCA App TODO

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
- [x] Log successful login attempts (user, timestamp, IP, method: SAML/OAuth)
- [x] Log unsuccessful login attempts (failed credentials, account locked)
- [x] Log SAML authentication events (SSO login, IdP errors)
- [x] Log logout events (user-initiated, session timeout)
- [x] Log session timeout events
- [x] Log account lockout events (too many failed attempts)
- [x] Add IP address and user agent tracking

### System Configuration Change Logging
- [x] Create configAudit.ts service for configuration change logging
- [x] Log role changes (user promoted/demoted)
- [x] Log permission changes (access granted/revoked)
- [x] Log system settings changes (retention policy, security settings)
- [x] Log SAML configuration changes (IdP URL, certificate updates)
- [x] Log data retention policy changes
- [x] Log encryption key rotation events
- [x] Log backup and restore operations

### Audit Trail API Enhancements
- [x] Add audit.getAuthLogs endpoint (retrieve authentication events)
- [x] Add audit.getConfigLogs endpoint (retrieve configuration changes)
- [x] Add audit.exportLogs endpoint (CSV export for security audits)
- [x] Add filtering by date range, user, event type
- [x] Add pagination for large audit logs
- [x] Add search functionality

### Audit Trail UI (Pending)
- [ ] Create authentication audit log viewer page
- [ ] Create configuration audit log viewer page
- [ ] Add filtering and search controls
- [ ] Add export button for CSV download
- [ ] Add real-time log updates (WebSocket or polling)
- [ ] Add log retention policy display

### Testing
- [ ] Write tests for authentication audit logging
- [ ] Write tests for configuration audit logging
- [ ] Write tests for audit log retrieval and filtering
- [ ] Write tests for audit log export
- [ ] Verify audit logs are immutable (no deletion/modification)


## Security Architecture & Vulnerability Management (City Requirements)

### Security Documentation
- [x] Create SECURITY_ARCHITECTURE.md document
  - [x] Infrastructure security (DDoS protection, firewalls, IDS/IPS)
  - [x] Multi-tenancy & data isolation architecture
  - [x] Application security controls (authentication, RBAC, input validation)
  - [x] Data protection & encryption (TLS 1.3, AES-256 at rest)
  - [x] Audit logging & security monitoring
  - [x] Vulnerability management processes
  - [x] Incident response & business continuity
  - [x] Compliance with NIST, OWASP, CIS standards

- [x] Create VULNERABILITY_ASSESSMENT.md document
  - [x] City vulnerability assessment rights and procedures
  - [x] Vendor penetration testing methodology
  - [x] Vulnerability scanning processes
  - [x] Remediation timelines by severity (Critical: 7 days, High: 30 days)
  - [x] Patch management procedures
  - [x] Security testing tools and configuration
  - [x] Vulnerability disclosure policy

### Application-Level Security Implementation
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

### Security Monitoring
- [x] Failed authentication attempt logging
- [x] Rate limit violation logging
- [x] SQL injection attempt detection and logging
- [x] XSS attempt detection and logging
- [x] Authorization failure logging (403 errors)
- [x] IP-based access monitoring

### Testing
- [x] Create comprehensive security test suite (security.test.ts)
- [x] SQL injection blocking tests
- [x] XSS blocking tests
- [x] Legitimate content allowed tests
- [x] Input validation accuracy tests
- [x] All tests passing

### Next Steps for City Deployment
- [ ] Review security documentation with City IT security team
- [ ] Coordinate City-conducted vulnerability assessment (2 weeks notice)
- [ ] Configure SAML SSO with City Active Directory
- [ ] Establish security contacts and incident response procedures
- [ ] Schedule quarterly security reviews and annual penetration testing


## Business Continuity & Disaster Recovery (City Requirements)

### Documentation
- [x] Create BUSINESS_CONTINUITY_DISASTER_RECOVERY.md document
  - [x] Recovery objectives (RTO: 4 hours, RPO: 24 hours, 99.5% uptime)
  - [x] High availability architecture (redundancy, failover, load balancing)
  - [x] Backup strategy (full, incremental, transaction logs, snapshots)
  - [x] Backup security (encryption, key management, geographic separation)
  - [x] Disaster recovery procedures (database, system, failover)
  - [x] Business continuity (incident response, communication, alternate procedures)
  - [x] Testing & validation (monthly, quarterly, annual DR exercises)
  - [x] Preventive measures (monitoring, capacity planning, change management)
  - [x] Compliance (ISO 22301, NIST SP 800-34, 7-year retention)

### Implementation (Pending)
- [ ] Implement automated backup verification
- [ ] Create DR runbook for operations team
- [ ] Schedule monthly recovery tests
- [ ] Set up monitoring and alerting
- [ ] Create stakeholder communication templates


## Incident Management & Notification Procedures (City Requirements)

### Documentation
- [x] Create INCIDENT_MANAGEMENT.md document
  - [x] Incident classification (Security, Service Degradation, Data, Compliance)
  - [x] Severity levels (Critical, High, Medium, Low)
  - [x] Security breach notification (triggers, timelines, content)
  - [x] Service degradation notification (SLA definitions, thresholds, timelines)
  - [x] Incident response procedures (breach, degradation, escalation)
  - [x] Liability and financial penalties (SLA penalties, data breach penalties)
  - [x] Insurance requirements (cyber, professional, general liability)
  - [x] Compliance and legal (PIPEDA, data protection, dispute resolution)
  - [x] Continuous improvement (trend analysis, lessons learned)

### Implementation (Pending)
- [ ] Create incident notification system
- [ ] Set up automated alerting for SLA violations
- [ ] Create incident response playbooks
- [ ] Establish City contact list for notifications
- [ ] Configure multi-channel communication (email, phone, portal)


## Multi-Tenant Data Isolation Implementation ✅ COMPLETED

### Phase 1: Core Project Isolation ✅ COMPLETED
- [x] Create verifyProjectAccess helper function in db.ts
- [x] Update getProjectById to accept company and isAdmin parameters
- [x] Add company ownership validation in getProjectById
- [x] Return null for unauthorized access (different company)
- [x] Allow admins to access all companies
- [x] Update all 52 getProjectById calls across routers:
  - [x] projects router (create, update, delete, get, fci, financialPlanning, etc.)
  - [x] assessments router (list, upsert, delete, getByComponent)
  - [x] deficiencies router (list, create, update, delete)
  - [x] buildingComponents router (listForProject, getByCode)
  - [x] photos router (upload, byProject, byAssessment, delete)
  - [x] costEstimates router (create, list, update, delete)
  - [x] assets router (list, create, update, delete)
  - [x] buildingSections router (list, create, update, delete)
  - [x] reports router (generate)
  - [x] export (getProjectById)
  - [x] exportCSV (getProjectById)
  - [x] exportExcel (getProjectById)

### Phase 2: Assessment & Asset Isolation ✅ COMPLETED
- [x] Update assessment queries to filter by project's company (52 router calls updated)
- [x] Update deficiency queries to filter by project's company
- [x] Update building component queries to filter by project's company
- [x] Update photo queries to filter by project's company
- [x] Update cost estimate queries to filter by project's company
- [x] All routers now call getProjectById with company and isAdmin parameters

### Phase 3: Bulk Operations ✅ COMPLETED
- [x] Update bulkDelete to verify company ownership for each project
- [x] Update bulkArchive to verify company ownership
- [x] Update bulkRestore to verify company ownership
- [x] All bulk operations now use updated getProjectById with multi-tenant checks



## Document Upload Investigation

### Findings
- [x] Document upload field is NOT present in New Project form
- [x] Document upload field is NOT present in Add Asset form
- [x] Could not verify assessment forms due to React hooks error when navigating to asset pages
- [x] Current workflow: Users must use "AI Import from Document" button on Projects page to import entire BCA reports

### Conclusion
**The application does NOT have document upload fields in individual forms (Project/Asset creation).**

The only way to upload documents is through the **"AI Import from Document"** button on the main Projects page, which:
- Imports complete BCA reports
- Extracts project info, assessments, and deficiencies using AI
- Creates a new project with all data in one operation

This is by design - the AI Import feature is meant for bulk import of complete BCA reports, not for attaching individual documents to projects or assessments.


## Document Attachment System Implementation (NEW FEATURE)

### Database Schema
- [ ] Create project_documents table (id, projectId, filename, fileUrl, fileSize, fileType, uploadedBy, uploadedAt, description)
- [ ] Create assessment_documents table (id, assessmentId, filename, fileUrl, fileSize, fileType, uploadedBy, uploadedAt, description)
- [ ] Add indexes for foreign keys (projectId, assessmentId, uploadedBy)
- [ ] Push schema changes to database

### Backend API
- [ ] Create documents router with tRPC procedures
- [ ] Implement uploadProjectDocument endpoint (S3 upload + database record)
- [ ] Implement uploadAssessmentDocument endpoint
- [ ] Implement listProjectDocuments endpoint
- [ ] Implement listAssessmentDocuments endpoint
- [ ] Implement deleteProjectDocument endpoint (S3 + database)
- [ ] Implement deleteAssessmentDocument endpoint
- [ ] Add authorization checks (user must own project/assessment)
- [ ] Write comprehensive tests for all document endpoints

### Frontend Components ✅ COMPLETED
- [x] Create DocumentUploadZone component (drag-and-drop, file validation)
- [x] Create ProjectDocumentList component (display uploaded documents with download/delete)
- [x] Add file type icons for different document types (PDF, Word, Excel, images)
- [x] Add file size display and formatting
- [x] Add upload progress indicators
- [x] Add error handling and validation messages

### Integration ✅ COMPLETED
- [x] Add document upload section to ProjectDetail page
- [x] Add Documents tab with upload zone and document list
- [x] Wire up tRPC queries and mutations
- [ ] Add document upload section to AssessmentDialog (optional - can be done later)
- [ ] Add document count badges to UI (optional enhancement)

### Testing ✅ COMPLETED
- [x] Write comprehensive test suite for documents router
- [x] Test authentication requirements for all endpoints
- [x] Test multi-tenant isolation (users can only see their company's documents)
- [x] Test admin access to all projects
- [x] Test project ownership validation
- [x] All 16 tests passing
- [x] Create checkpoint after testing


## Document Attachment System - Progress Update

### Database Schema ✅ COMPLETED
- [x] Create project_documents table (id, projectId, filename, fileUrl, fileSize, fileType, uploadedBy, uploadedAt, description)
- [x] Create assessment_documents table (already existed)
- [x] Add indexes for foreign keys (projectId, assessmentId, uploadedBy)
- [x] Push schema changes to database

### Backend API ✅ COMPLETED
- [x] Create documents router with tRPC procedures
- [x] Implement uploadProjectDocument endpoint (S3 upload + database record)
- [x] Implement uploadAssessmentDocument endpoint
- [x] Implement listProjectDocuments endpoint
- [x] Implement listAssessmentDocuments endpoint
- [x] Implement deleteProjectDocument endpoint (S3 + database)
- [x] Implement deleteAssessmentDocument endpoint
- [x] Add authorization checks (user must own project/assessment)
- [x] Register documents router in main routers.ts
