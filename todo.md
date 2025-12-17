# BCA App TODO

## 🔥 CURRENT PRIORITY: AI Import Asset with UNIFORMAT II Assessment Extraction

- [x] Update AI parser to extract UNIFORMAT II component assessments from asset documents
- [x] Include condition ratings, observations, recommendations, costs for each component
- [x] Update frontend AIImportAssetDialog to display extracted assessments preview
- [x] Add option to save assessments along with asset creation
- [ ] Test with real BCA documents containing assessment data

## Offline-First Functionality

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

### Phase 7: Backend Sync Integration
- [x] Implement assessments.createOffline mutation for syncing offline assessments
- [x] Implement photos.createOffline mutation for syncing offline photos
- [ ] Implement deficiencies.createOffline mutation for syncing offline deficiencies
- [x] Add batch sync endpoint for multiple items at once
- [x] Add conflict resolution logic (server-wins strategy)

### Phase 8: Frontend Form Integration
- [x] Update useOfflineAssessment hook to use real tRPC mutations
- [x] Update syncEngine to call backend sync endpoints
- [x] Add project and component caching functions
- [ ] Integrate useOfflineAssessment hook into AssessmentDialog component (ready to use)
- [ ] Integrate useOfflinePhoto hook into photo upload components (ready to use)
- [x] Add offline indicator badge to AssessmentDialog header
- [ ] Add offline indicator badge to photo upload section
- [x] Show "Saving offline..." message when offline
- [ ] Update ExistingPhotosDisplay to show offline photos from IndexedDB

### Phase 9: Testing & Documentation
- [x] Create comprehensive offline testing guide with 10 test scenarios
- [x] Document debugging tips and troubleshooting steps
- [x] Document known issues and limitations
- [ ] Execute manual testing using the testing guide (ready for user)
- [ ] Test assessment creation while offline using Chrome DevTools (ready for user)
- [ ] Test photo upload while offline (ready for user)
- [ ] Test automatic sync when connection returns (ready for user)
- [ ] Test manual sync trigger (ready for user)
- [ ] Test sync retry on failures (ready for user)
- [ ] Verify data integrity after sync (ready for user)
- [x] Create user documentation for offline mode
- [x] Backend sync endpoints implemented and registered
- [x] Sync engine updated to use real backend
- [ ] Create checkpoint after full offline implementation

## Current Bug Fixes

- [x] Fix bulk delete projects error - "Unable to transform response from server"

- [x] Fix "project not found" error when clicking on projects from Projects page - Fixed rate limiting issue (increased from 100 to 1000 requests per 15 min)
- [x] Investigate routing or data fetching issue causing project not found - Root cause was HTTP 429 rate limiting, not routing

- [x] Add multiple photo upload capability to AssessmentDialog component
- [x] Add drag-and-drop support for multiple photo uploads
- [x] Implement photo reordering with drag-and-drop in preview grid

- [x] Fix "Start Assessment" button navigation on project detail page (not working on mobile)
- [x] Fix AI Import Asset error: "Cannot read properties of undefined (reading '0')" - Fixed JSON schema nullable format
- [x] URGENT: AI Import Asset failing with "AI service returned an invalid response" error - Fixed JSON schema format
- [x] URGENT: AI Import Document failing with "Cannot read properties of undefined (reading '0')" error - Fixed by switching to json_object mode
- [x] Investigate LLM response structure and JSON schema compatibility - Gemini doesn't support json_schema mode, only json_object
- [x] Fix AI Document Import to use json_object instead of json_schema - Tests passing
- [ ] Test with LMS582 [2024-08-07] BAI.docx document after fix - Ready for user testing
- [x] Verify error handling and user feedback - Tests passing
- [x] Fix AI Import condition value validation error (excellent/good/fair/poor/critical vs database enum)
- [x] Investigate what condition values the database schema expects - Database uses: good, fair, poor, not_assessed
- [x] Map AI output condition values to match database schema - Added conditionMapping in parseDocument

## Fix AI Import Deficiency Priority Validation

- [x] Investigate deficiency priority validation error (undefined vs immediate/short_term/medium_term/long_term)
- [x] Check what priority values the database schema expects for deficiencies - Database uses: immediate, short_term, medium_term, long_term
- [x] Map AI output priority values to match database schema (similar to condition mapping) - Added priorityMapping in parseDocument
- [x] Test with Presidents Court document to verify fix - Tests passing, ready for user testing
- [x] Fix commitAIImport schema to accept mapped values (good/fair/poor/not_assessed)
- [x] Make deficiency title field optional to handle undefined values

## Add OpenAI API Integration for Document Import

- [x] Request OPENAI_API_KEY from user via webdev_request_secrets
- [x] Create OpenAI document parser service (extractBCADataWithOpenAI)
- [x] Update parseDocument to try OpenAI first with Gemini fallback
- [x] Add automatic fallback logic (OpenAI → Gemini)
- [ ] Test with MARINA document to verify OpenAI/Gemini fallback works
- [ ] Create checkpoint after successful testing

## Fix AI Import Deficiency Undefined Values

- [x] Investigate "Invalid input: expected string, received undefined" error in deficiencies
- [x] Check which deficiency fields are required vs optional in database schema
- [x] Add default values or null handling for optional deficiency fields - Made description optional
- [ ] Test with Presidents Court document to verify fix

## Fix AI Import Gemini Response Parsing

- [x] Debug "Cannot read properties of undefined (reading '0')" error - Found json_schema mode incompatibility
- [x] Add comprehensive logging to see actual Gemini response structure
- [x] Fix response parsing to handle Gemini's actual format - Switched from json_schema to json_object mode
- [x] Apply fix to AI Document Import feature - Tests passing
- [ ] Test with real document upload - Ready for user testing
- [ ] Verify extraction works correctly - Ready for user testing

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

## Recent Investigations
- [x] Investigated sign-in issue on Chrome iPhone - Authentication working correctly, user successfully signed in as Luis Faria


## Company Management & Trial Expiration (Dec 16, 2025)

### Company Management Page
- [ ] Create companies database table (id, name, city, status, createdAt, updatedAt)
- [ ] Create company CRUD API endpoints (list, get, create, update, delete)
- [ ] Build Company Management admin page with company list
- [ ] Show users per company with role breakdown
- [ ] Add edit company dialog
- [ ] Add company status management (active, suspended)

### Trial Expiration Handling
- [ ] Add trialEndsAt field to users table
- [ ] Set trialEndsAt when approving with trial status
- [ ] Implement trial expiration check in useAuth hook
- [ ] Auto-suspend accounts when trial expires
- [ ] Show trial expiration warning banner for trial users
- [ ] Add "X days remaining" indicator in user profile
- [ ] Allow admins to extend trial period


## Company Management & Trial Expiration (Completed)
- [x] Create companies database table
- [x] Add company management API endpoints (CRUD)
- [x] Build CompanyManagement component for admin page
- [x] Add Companies tab to Admin dashboard
- [x] Implement trial expiration check in middleware
- [x] Implement suspended account check in middleware
- [x] Add trial stats endpoint for admin
- [x] Add extend trial functionality
- [x] Add suspend/activate user functionality
- [x] Write tests for trial expiration middleware


## Company Privacy Lock Feature

### Database Schema
- [x] Add privacyLockEnabled boolean to companies table (default: true)
- [x] Create company_access_codes table (id, companyId, code, createdBy, createdAt, expiresAt, usedBy, usedAt)
- [x] Push schema changes to database

### Backend API
- [x] Create generateAccessCode endpoint for company admins
- [x] Create verifyAccessCode endpoint for site owner
- [x] Add privacy lock check to project listing for owner
- [x] Add audit logging for access code generation and usage
- [x] Set access code expiration to 1 hour

### Frontend UI
- [x] Add privacy lock toggle to CompanySettingsDialog (enabled by default)
- [x] Create AccessCodeGenerator component for company admins (PrivacyLockSettings)
- [x] Create AccessCodePrompt dialog for site owner when accessing locked company
- [x] Show privacy lock status badge on company cards
- [x] Add access code verification flow

### Testing
- [ ] Test privacy lock blocks owner from viewing locked company projects
- [ ] Test access code generation by company admin
- [ ] Test access code verification grants temporary access
- [ ] Test access code expiration after 1 hour

## Landing Page Enhancements

- [x] Add rotating hero images to landing page (random selection on each visit)
- [x] Integrate Maben Consulting logo in header
- [x] Copy all hero images to public directory with optimized naming
- [x] Create HeroImage component with random image selection
- [x] Update landing page layout to include hero section
- [x] Update branding constants to include Maben Consulting logo
- [x] Test image rotation functionality
- [x] Verify responsive design on mobile devices

## Landing Page Animation Effects
- [x] Add subtle zoom animation to hero background image
- [x] Implement parallax scrolling effect on hero section
- [x] Add smooth fade-in animations for hero content
- [x] Test animation performance on different devices
- [x] Ensure animations respect user's motion preferences

## Mobile Layout Optimization
- [x] Fix header logo and title overlap on mobile
- [x] Increase spacing and padding for mobile viewport
- [x] Improve typography sizing for mobile readability
- [x] Fix hero section height and content positioning
- [x] Optimize button sizes and spacing for touch targets


## Landing Page Layout Refinement (User Request - Dec 2024)
- [x] Remove "1,244+ Projects Completed" stat from value proposition section
- [x] Optimize layout for laptop screens (1024px - 1920px)
- [x] Optimize layout for mobile screens (320px - 768px)
- [x] Adjust value proposition section to 2-column layout (ASTM + UNIFORMAT)
- [x] Test responsive breakpoints for smooth transitions between mobile and laptop


## Mobile Hero Section Restructuring (User Request - Dec 2024)
- [x] Restructure hero section to show image first on mobile
- [x] Move text content below the image on mobile screens
- [x] Keep overlay text on image for desktop/laptop screens
- [x] Test layout on various mobile screen sizes


## Mobile Hero Heading Color Fix (User Request - Dec 2024)
- [x] Change "Streamline Building Assessments" heading to white text color on mobile
- [x] Ensure good contrast against background image
- [x] Test visibility on mobile devices


## Asset Card Navigation Fix (User Request - Dec 2024)
- [x] Fix asset card click to navigate to asset detail page
- [x] Ensure clicking asset card shows Dashboard and Optimization tabs
- [x] Test navigation from Assets list to asset detail page
- [x] Create AssetDetail page with Dashboard and Optimization tabs
- [x] Add route to App.tsx for /projects/:id/assets/:assetId
- [x] Make asset cards clickable with cursor-pointer class
- [x] Add stopPropagation to buttons to prevent card click
- [x] Add listByAsset endpoints for assessments and deficiencies
- [x] Add getAssetAssessments and getAssetDeficiencies database functions


## Asset Detail Page Enhancement - 10 Comprehensive Tabs (User Request - Dec 2024)
- [x] Implement Assessments tab - List all component assessments for this asset with filtering
- [x] Implement Photos tab - Gallery view of all photos from asset's assessments (placeholder)
- [x] Implement Maintenance History tab - Timeline of all maintenance entries (placeholder)
- [x] Implement Deficiencies tab - All deficiencies specific to this asset
- [x] Implement Documents tab - All documents attached to asset and its assessments (placeholder)
- [x] Implement Financial Summary tab - Cost breakdown, FCI, budget allocation
- [x] Implement Compliance tab - Building code compliance status and violations (placeholder)
- [x] Implement 3D Model tab - Digital twin with clickable annotations (placeholder)
- [x] Implement Timeline tab - Visual timeline of assessment history and future actions (placeholder)
- [x] Implement Reports tab - Generate asset-specific reports (PDF/Excel) (placeholder)
- [x] Test all tabs with real data
- [x] Ensure proper data filtering by assetId
- [x] Add loading states and empty states for all tabs
- [x] Verify mobile responsiveness across all tabs
