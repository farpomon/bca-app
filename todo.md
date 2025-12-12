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
- [ ] Log successful login attempts (user, timestamp, IP, method: SAML/OAuth)
- [ ] Log unsuccessful login attempts (username, timestamp, IP, reason)
- [ ] Log SAML authentication events (assertion received, user mapped, errors)
- [ ] Log logout events (user, timestamp, session duration)
- [ ] Log session timeout events
- [ ] Log password reset attempts (if applicable)
- [ ] Log account lockout events (after failed attempts)

### System Configuration Change Logging
- [ ] Log user role changes (who changed, target user, old role, new role)
- [ ] Log permission changes (resource, action, granted/revoked)
- [ ] Log system settings changes (setting name, old value, new value)
- [ ] Log SAML configuration changes
- [ ] Log data retention policy changes
- [ ] Log encryption key rotation events
- [ ] Log backup/restore operations

### Data Modification Logging (Already Exists - Enhance)
- [x] Log project create/update/delete operations
- [x] Log assessment create/update/delete operations
- [x] Log data export operations
- [ ] Add IP address to existing audit logs
- [ ] Add session ID to existing audit logs
- [ ] Add user agent to existing audit logs

### Audit Log Retrieval & Reporting
- [ ] Create audit log search API with filters (user, action, date range, resource type)
- [ ] Add audit log export to CSV/Excel for security audits
- [ ] Create audit log retention policy (7 years minimum)
- [ ] Add audit log integrity verification (hash chain)
- [ ] Create security audit report generator
- [ ] Add real-time audit log monitoring dashboard

### Testing & Compliance
- [ ] Test all authentication event logging
- [ ] Test system configuration change logging
- [ ] Verify audit logs are immutable (append-only)
- [ ] Test audit log retrieval and filtering
- [ ] Verify audit logs meet compliance requirements
- [ ] Create audit log documentation for security team


## Photo Upload Display Bug (URGENT)
- [x] Investigate why uploaded photos don't display after saving assessment
- [x] Check if photos are being saved to S3 correctly
- [x] Check if photo URLs are being saved to database
- [x] Check if photo display component is loading saved photos
- [x] Fix photo persistence and display issue - Added byAssessment endpoint and ExistingPhotosDisplay component
- [x] Test photo upload and display flow end-to-end


## Security Architecture & Threat Protection (City Requirements)

### Security Documentation
- [x] Create comprehensive security architecture document
- [x] Document threat protection mechanisms (DDoS, intrusion detection)
- [x] Document multi-tenancy data isolation architecture
- [x] Document encryption in transit and at rest
- [x] Document vulnerability management process
- [x] Create security incident response plan
- [x] Document backup and disaster recovery procedures

### Application-Level Security Hardening
- [x] Implement rate limiting on all API endpoints
- [x] Add request validation and sanitization
- [x] Implement SQL injection prevention (already using Drizzle ORM)
- [x] Add XSS protection headers
- [x] Implement CSRF protection
- [x] Add security headers (HSTS, CSP, X-Frame-Options)
- [x] Implement input validation on all user inputs
- [x] Add file upload security (type validation, size limits, malware scanning)

### Security Monitoring & Intrusion Detection
- [x] Log all failed authentication attempts
- [x] Log suspicious activity patterns (multiple failed logins, unusual access)
- [x] Implement rate limit violation logging
- [x] Add IP-based access monitoring
- [ ] Create security alert system for administrators
- [x] Log all privilege escalation attempts
- [x] Monitor for SQL injection attempts

### Vulnerability Management
- [x] Document vulnerability scanning process
- [x] Create penetration testing procedures
- [x] Document patch management process
- [x] Create security update notification system
- [x] Document third-party dependency security monitoring
- [x] Create vulnerability disclosure policy
- [x] Document security assessment rights for City

### Multi-Tenancy Security
- [ ] Document company-based data isolation
- [ ] Verify all queries filter by company
- [ ] Add company ownership validation to all mutations
- [ ] Document network traffic isolation (platform level)
- [ ] Create multi-tenant security testing procedures
- [ ] Document tenant data separation guarantees


## Business Continuity & Disaster Recovery (City Requirements)

### Documentation
- [x] Create comprehensive Business Continuity Plan (BCP)
- [x] Create Disaster Recovery Plan (DRP)
- [x] Document redundancy and high availability architecture
- [x] Define Recovery Time Objectives (RTO) - 4 hours
- [x] Define Recovery Point Objectives (RPO) - 24 hours
- [x] Document backup strategies and schedules
- [x] Document backup retention policies
- [x] Document data recovery procedures
- [x] Create disaster recovery testing procedures
- [x] Document failover and failback procedures

### Infrastructure Redundancy
- [x] Document clustering architecture
- [x] Document database replication and mirroring
- [x] Document load balancing configuration
- [x] Document geographic redundancy
- [x] Document single point of failure elimination
- [x] Document automatic failover mechanisms

### Backup & Recovery
- [x] Document backup encryption standards
- [x] Document backup storage locations
- [x] Document backup verification procedures
- [x] Document restore testing procedures
- [x] Document backup monitoring and alerting
- [x] Create backup failure response procedures


## Incident Management (City Requirements)

### Notification Procedures
- [x] Document security breach notification procedures
- [x] Document service degradation notification procedures
- [x] Define notification timelines by incident severity
- [x] Document communication channels and escalation paths
- [x] Create incident notification templates
- [x] Document 24/7 incident hotline procedures
- [x] Define incident severity classification criteria

### Liability & Financial Penalties
- [x] Document vendor liability for data breaches
- [x] Define financial penalties for SLA violations
- [x] Document liability for wrongful data disclosure
- [x] Create liability limitation framework
- [x] Document insurance coverage requirements
- [x] Define indemnification obligations
- [x] Document dispute resolution procedures

### Incident Response
- [x] Create security breach response playbook
- [x] Create service degradation response playbook
- [x] Document incident investigation procedures
- [x] Create post-incident reporting templates
- [x] Document root cause analysis procedures
- [x] Create remediation tracking procedures


## Data Integration with SAP and TRIRIGA (City Requirements)

### Integration Architecture
- [x] Document unidirectional data flow architecture
- [x] Define data mapping from SAP to BCA system
- [x] Define data mapping from TRIRIGA to BCA system
- [x] Document integration security and authentication
- [x] Create integration error handling procedures
- [x] Document data validation and transformation rules

### SAP Integration
- [ ] Implement SAP data import connector
- [ ] Map SAP master data fields to BCA database
- [ ] Import asset details from SAP
- [ ] Import maintenance history from SAP
- [ ] Implement incremental data sync
- [ ] Create SAP integration monitoring and logging

### TRIRIGA Integration
- [ ] Implement TRIRIGA data import connector
- [ ] Map TRIRIGA asset data to BCA database
- [ ] Import building/facility data from TRIRIGA
- [ ] Import maintenance records from TRIRIGA
- [ ] Implement incremental data sync
- [ ] Create TRIRIGA integration monitoring and logging

### Bulk Export Functionality
- [ ] Implement annual condition ratings export
- [ ] Support CSV export format
- [ ] Support Excel export format
- [ ] Include all portfolio buildings in export
- [ ] Include physical condition ratings
- [ ] Include assessment metadata (date, assessor, etc.)
- [ ] Create export scheduling functionality

### Admin UI
- [ ] Create data import management page
- [ ] Create manual import trigger interface
- [ ] Create import history and status tracking
- [ ] Create bulk export interface
- [ ] Create export download functionality
- [ ] Create integration monitoring dashboard
