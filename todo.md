# BCA App TODO

## 🔥 CURRENT PRIORITY: Offline-First Functionality

### Phase 1: Offline Storage Infrastructure
- [x] Create IndexedDB schema for offline assessments (offlineAssessments store)
- [x] Create IndexedDB schema for offline photos (offlinePhotos store)
- [x] Create IndexedDB schema for offline deficiencies (offlineDeficiencies store)
- [x] Create IndexedDB schema for sync queue (syncQueue store)
- [x] Build sync queue manager with priority system
- [x] Implement conflict resolution strategy (server-wins vs last-write-wins)

### Phase 2: Offline Assessment Data Entry
- [x] Enable assessment form to save locally when offline
- [x] Store assessment drafts in IndexedDB with timestamps
- [x] Add offline indicator badge to assessment form
- [x] Queue assessments for sync when connection returns
- [x] Handle partial assessment saves (auto-save every 30 seconds)
- [x] Link offline assessments to offline photos

### Phase 3: Offline Photo Management
- [x] Implement photo compression for offline storage (reduce file size 50-70%)
- [x] Queue photos with metadata in IndexedDB
- [x] Add photo preview from local IndexedDB storage
- [x] Link photos to offline assessments via temporary IDs
- [x] Batch upload photos when connection returns
- [x] Show upload progress for queued photos

### Phase 4: Background Sync Service
- [x] Implement automatic sync on connection restore (listen to online event)
- [x] Add retry logic with exponential backoff (1s, 2s, 4s, 8s, 16s)
- [x] Handle sync failures gracefully with user notifications
- [x] Implement conflict resolution (server wins for now, add merge later)
- [x] Add sync progress tracking with percentage
- [x] Process sync queue in order: assessments first, then photos, then deficiencies

### Phase 5: Offline UI/UX
- [x] Create offline status banner (persistent at top of screen)
- [x] Add sync progress indicator (circular progress with percentage)
- [x] Show pending items count badge (e.g., "5 items pending sync")
- [x] Build sync queue viewer dialog (list all pending items)
- [x] Add manual sync trigger button
- [x] Display last sync timestamp
- [x] Show sync errors with retry button

### Phase 6: Data Caching for Offline Viewing
- [x] Cache project list for offline viewing (last 50 projects)
- [x] Cache building components (UNIFORMAT II - static data)
- [ ] Cache user settings and preferences (future enhancement)
- [x] Implement cache invalidation strategy (TTL: 24 hours)
- [x] Add cache size management (max 50MB)
- [ ] Show cached data indicator in UI (future enhancement)

### Phase 7: Testing & Documentation
- [ ] Test offline assessment creation and sync (ready for testing)
- [ ] Test offline photo upload and sync (ready for testing)
- [ ] Test conflict resolution scenarios (ready for testing)
- [ ] Test sync retry on network failures (ready for testing)
- [x] Create user documentation for offline mode
- [ ] Create checkpoint (pending testing)

## Current Bug Fixes

- [x] Fix "Start Assessment" button navigation on project detail page (not working on mobile)
- [x] Fix AI Import Asset error: "Cannot read properties of undefined (reading '0')" - Fixed JSON schema nullable format

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

## Offline Capabilities (Voice Recording Only - Expanding to Full Offline-First)
- [x] Save voice recordings locally when offline (using IndexedDB)
- [x] Auto-transcribe saved recordings when connection is restored
- [x] Show offline recording queue status to user (OfflineQueueWidget)

## Critical Bugs
- [x] Fix logout error - Added redirect to home page after logout to prevent accessing protected pages
- [x] Fix projects not showing up - Updated projects.list router to pass company and isAdmin parameters to getUserProjects function
- [x] Verified 1,695 projects now visible for admin user
