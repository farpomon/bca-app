# BCA App TODO

## Current Bug Fixes

- [x] Fix "Start Assessment" button navigation on project detail page (not working on mobile)

## Document Upload in Assessment List (Completed)
- [x] Add document upload button/icon to each assessment item in the list
- [x] Implement inline document upload without opening edit dialog
- [x] Add quick document preview/download from assessment list
- [x] Test document upload from main dashboard

## Document Management Enhancements (Completed)
- [x] Add backend endpoint to download all assessment documents as ZIP
- [x] Add bulk download button to assessment document section
- [x] Add document type filter dropdown (All, PDFs, Images, Word, Excel)
- [x] Implement client-side filtering by document type
- [x] Test bulk download and filtering features

## Google Maps Integration with Structured Addresses (Completed)
- [x] Update assets table with structured address fields (street address, street number, apt/unit, postal code, province)
- [x] Update projects table with structured address fields
- [x] Update asset creation/edit forms with new address fields
- [x] Create Google Maps component for asset visualization
- [x] Add geocoding to convert addresses to coordinates
- [x] Display all project assets on interactive map
- [x] Make asset markers clickable to navigate to asset details
- [x] Add map view tab to project detail page

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

## MFA Method Switching and Recovery (Completed)

### Feature 1: MFA Method Switching
- [x] Create mfa_method_switch_requests database table
- [x] Implement backend service (mfaMethodSwitch.ts) for switching between TOTP and email
- [x] Create tRPC router (mfaMethodSwitchRouter.ts) with endpoints
- [x] Build MFAMethodSwitch UI component with step-by-step wizard
- [x] Integrate method switching button into SecuritySettings page
- [x] Add verification step for new method before completing switch
- [x] Implement 30-minute expiration for switch requests

### Feature 2: MFA Recovery Flow
- [x] Create mfa_recovery_requests database table
- [x] Implement backend service (mfaRecovery.ts) for recovery request management
- [x] Create tRPC router (mfaRecoveryRouter.ts) with user and admin endpoints
- [x] Build MFARecoveryRequest UI component for users to submit requests
- [x] Build AdminMFARecovery dashboard component for admin review
- [x] Add MFA Recovery tab to Admin page
- [x] Implement admin approval/rejection workflow
- [x] Generate 24-hour temporary recovery codes
- [x] Add email notifications for recovery events
- [x] Comprehensive audit logging for all recovery actions

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
- [x] Document encryption standards (TLS 1.3 in transit, AES-256-GCM at rest)
- [x] Create data ownership documentation (City retains sole ownership)
- [x] Add encryption information to compliance documentation

### Phase 2: Data Retention Policies
- [x] Define 7-year retention policy for all data types
- [x] Create retention_policies table
- [x] Add retention policy management UI (admin only)
- [x] Document retention policies in compliance section

### Phase 3: Secure Data Disposal
- [x] Create data disposal workflow
- [x] Add secure deletion endpoints (projects, users, assessments)
- [x] Implement backup purging for deleted data
- [x] Add disposal audit logging
- [x] Create Data Security admin dashboard

### Phase 4: Testing & Documentation
- [x] Test all data security features
- [x] Update compliance documentation with security details
- [x] Create admin guide for data security management
- [x] Save checkpoint

## Enterprise Authentication & Comprehensive Audit Trail

### Phase 1: SAML 2.0 Authentication
- [x] Install and configure @node-saml/passport-saml package
- [x] Create SAML configuration module (saml.ts)
- [x] Add SAML environment variables (SAML_ENABLED, SAML_ENTRY_POINT, SAML_ISSUER, etc.)
- [x] Generate Service Provider metadata for City IT department
- [x] Support Active Directory integration
- [ ] Create SAML authentication routes (/api/saml/login, /api/saml/callback)
- [ ] Test SAML authentication flow
- [ ] Document SAML setup for City IT

### Phase 2: Authentication Audit Logging
- [x] Create authAudit.ts service
- [x] Log successful login attempts (SAML and standard)
- [x] Log unsuccessful login attempts
- [x] Log logout events
- [x] Log session timeout events
- [x] Log account lockout events
- [x] Add IP address and user agent tracking

### Phase 3: System Configuration Audit Logging
- [x] Create configAudit.ts service
- [x] Log role changes
- [x] Log permission changes
- [x] Log system settings changes
- [x] Log SAML configuration changes
- [x] Log retention policy changes
- [x] Log encryption key rotation
- [x] Log backup and restore operations

### Phase 4: Enhanced Audit Router
- [x] Add getAuthLogs endpoint (authentication events)
- [x] Add getConfigLogs endpoint (configuration changes)
- [x] Add exportLogs endpoint (CSV export for security audits)
- [x] Add filtering by event type, user, date range
- [x] Add pagination for large audit logs

### Phase 5: Granular RBAC Implementation
- [ ] Extend role system beyond 4 basic roles
- [ ] Create permissions table (granular permissions)
- [ ] Create role_permissions mapping table
- [ ] Implement permission checking middleware
- [ ] Add permission management UI (admin only)
- [ ] Test permission enforcement across all endpoints

### Phase 6: Audit Trail Viewer UI
- [ ] Create AuthAuditLog component (authentication events)
- [ ] Create ConfigAuditLog component (configuration changes)
- [ ] Add audit log viewer to Admin section
- [ ] Implement filtering and search
- [ ] Add CSV export button
- [ ] Test audit log viewer

## Security Architecture & Vulnerability Assessment

### Phase 1: Security Documentation
- [x] Create SECURITY_ARCHITECTURE.md
  - [x] Infrastructure security (DDoS, firewalls, IDS/IPS)
  - [x] Multi-tenancy & data isolation
  - [x] Application security (authentication, RBAC, input validation)
  - [x] Data protection & encryption
  - [x] Audit logging & monitoring
  - [x] Vulnerability management
  - [x] Incident response & business continuity
  - [x] Compliance (NIST, OWASP, CIS)

- [x] Create VULNERABILITY_ASSESSMENT.md
  - [x] City vulnerability assessment rights
  - [x] Vendor penetration testing methodology
  - [x] Vulnerability scanning processes
  - [x] Remediation timelines (Critical: 7 days, High: 30 days)
  - [x] Patch management procedures
  - [x] Security testing tools
  - [x] Vulnerability disclosure policy

### Phase 2: Application Security Implementation
- [x] Create security middleware (security.ts)
- [x] Implement Helmet security headers (HSTS, CSP, X-Frame-Options)
- [x] Implement rate limiting (API, Auth, Upload endpoints)
- [x] Implement input validation & sanitization
- [x] Implement request size limiting
- [x] Implement CORS configuration
- [x] Add security event logging

- [x] Apply security middleware to Express server
- [x] Protect all API endpoints with rate limiting
- [x] Protect authentication endpoints with strict rate limiting
- [x] Protect upload endpoints with dedicated rate limiting
- [x] Add input validation to all requests
- [x] Add security headers to all responses

### Phase 3: Security Monitoring
- [x] Log failed authentication attempts
- [x] Log rate limit violations
- [x] Log SQL injection attempts
- [x] Log XSS attempts
- [x] Log authorization failures (403 errors)
- [x] Log IP-based access patterns

### Phase 4: Security Testing
- [x] Create security test suite (security.test.ts)
- [x] Test SQL injection blocking
- [x] Test XSS blocking
- [x] Test legitimate content allowed
- [x] Verify input validation accuracy
- [x] Test false positive handling

## Business Continuity & Disaster Recovery

### Phase 1: BC/DR Documentation
- [x] Create BUSINESS_CONTINUITY_DISASTER_RECOVERY.md
  - [x] Recovery objectives (RTO: 4 hours, RPO: 24 hours)
  - [x] High availability architecture
  - [x] Backup strategy (full, incremental, transaction logs)
  - [x] Backup security (encryption, geographic separation)
  - [x] Disaster recovery procedures
  - [x] Business continuity procedures
  - [x] Testing & validation schedule
  - [x] Preventive measures

### Phase 2: Incident Management & Notification
- [x] Create INCIDENT_MANAGEMENT.md
  - [x] Incident classification (Security, Service, Data, Compliance)
  - [x] Severity levels (Critical, High, Medium, Low)
  - [x] Security breach notification timelines
  - [x] Service degradation notification timelines
  - [x] Incident response procedures
  - [x] Escalation procedures
  - [x] Post-incident reviews

### Phase 3: Liability & Financial Penalties
- [x] Document SLA penalties
  - [x] Availability violations (5-50% monthly fee)
  - [x] Performance violations (3-15% monthly fee)
  - [x] Support response violations ($50-$500 per incident)
  - [x] Penalty caps (100% monthly fee)

- [x] Document data breach penalties
  - [x] Minor breach (<100 records): $5K-$25K
  - [x] Moderate breach (100-1K): $25K-$100K
  - [x] Major breach (1K-10K): $100K-$500K
  - [x] Critical breach (>10K): $500K-$2M
  - [x] Liability caps and exceptions

- [x] Document insurance requirements
  - [x] Cyber liability: $5M minimum
  - [x] Professional liability: $2M minimum
  - [x] General liability: $2M minimum
  - [x] City as additional insured

### Phase 4: Compliance & Legal
- [x] Document PIPEDA compliance
- [x] Document regulatory reporting
- [x] Document data protection obligations
- [x] Document dispute resolution process

## Project Sorting Feature
- [x] Add sort dropdown with 7 criteria (name, client, status, created, updated, address, building code)
- [x] Add ascending/descending toggle
- [x] Implement sorting logic with useMemo
- [x] Add localStorage persistence for user preferences
- [x] Add visual indicators (arrow icons)
- [x] Test sorting with all criteria

## TypeScript Error Fixes
- [x] Fix role enum expansion (viewer, editor, project_manager, admin)
- [x] Fix boolean-to-number conversions for tinyint fields
- [x] Fix Date-to-ISO string conversions across routers
- [x] Reduce TypeScript errors from 99 to 61

## Multi-Tenant Data Isolation (Phase 4 Continuation)
- [x] Update getProjectById with company ownership validation
- [x] Update createProject with company assignment
- [x] Update updateProject with company validation
- [x] Update deleteProject with company validation
- [x] Add verifyProjectAccess helper function
- [x] Update all 52 getProjectById calls across routers
- [x] Enforce company-based access control for admins and non-admins
- [x] Prevent cross-company data access

## Document Attachment System
- [x] Create project_documents table
- [x] Create assessment_documents table
- [x] Add S3 upload/download for documents
- [x] Add multi-tenant isolation (users can only access their company's documents)
- [x] Add admin access (admins can access all companies' documents)
- [x] Create DocumentUploadZone component with drag-and-drop
- [x] Create ProjectDocumentList component with download/delete
- [x] Add Documents tab to ProjectDetail page
- [x] Create comprehensive test suite (16 tests)
- [x] Test authentication, authorization, and multi-tenant isolation

## Document Attachment Enhancements
- [x] Add document upload to AssessmentDialog (edit mode only)
- [x] Integrate DocumentUploadZone and DocumentList components
- [x] Add document count to project stats query
- [x] Display document count badge on project cards
- [x] Display document count badge on Documents tab
- [x] Test document upload and display

## AI Import for Assets
- [x] Add "AI Import" button to Assets page
- [x] Create AIImportAssetDialog component
- [x] Implement assets.aiImport endpoint using LLM
- [x] Extract asset information from PDF/Word documents
- [x] Add file validation (PDF/Word only, max 10MB)
- [x] Create assetDocuments router for future document management
- [x] Create asset_documents table
- [x] Add unit tests for AI import validation
