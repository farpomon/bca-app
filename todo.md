# BCA App TODO

## 🎨 Branding Update

- [x] Update app logo and title to match presentation branding

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
- [x] Implement deficiencies.createOffline mutation for syncing offline deficiencies
- [x] Add batch sync endpoint for multiple items at once
- [x] Add conflict resolution logic (server-wins strategy)

### Phase 8: Frontend Form Integration
- [x] Update useOfflineAssessment hook to use real tRPC mutations
- [x] Update syncEngine to call backend sync endpoints
- [x] Add project and component caching functions
- [x] Integrate useOfflineAssessment hook into AssessmentDialog component
- [x] Integrate useOfflinePhoto hook into AssessmentDialog component
- [x] Add offline indicator badge to AssessmentDialog header
- [x] Add offline indicator badge to photo upload section
- [x] Show "Saving offline..." message when offline
- [x] Update ExistingPhotosDisplay to show offline photos from IndexedDB

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

## New Features

### Unique ID Search Functionality
- [x] Add search functionality to find projects by unique ID (PROJ-YYYYMMDD-XXXX)
- [x] Add search functionality to find assets by unique ID (ASSET-YYYYMMDD-XXXX)
- [x] Implement search bar in Projects page header
- [x] Implement search bar in Assets page header
- [x] Add search results highlighting

### Canadian Building Codes Expansion
- [x] Add Ontario Building Code (OBC) with multiple years
- [x] Add Quebec Construction Code (CCQ) with multiple years
- [x] Add Alberta Building Code (ABC) with multiple years
- [x] Add Saskatchewan Building Code (SBC)
- [x] Add Manitoba Building Code (MBC)
- [x] Add National Energy Code for Buildings (NECB)
- [x] Verify all codes have proper documentUrl references
- [ ] Test building code dropdown with expanded database

## Current Bug Fixes

- [x] Fix: 3D model loading stops working when switching browser tabs
- [x] Fix: 3D model loading crash during upload and initial load phase
- [x] Fix 3D model viewer failing to load Revit (.rvt) files with JSON parsing error

- [x] Fix B³NMA logo not loading on homepage

### Building Code Dropdown Deduplication
- [x] Update getAllBuildingCodes query to return only one version per jurisdiction+year
- [x] Prefer entries with documentUrl over those without
- [x] Add legal disclaimer back to compliance section
- [x] Test dropdown displays unique building codes only

- [x] Fix address autocomplete - clicking suggestions doesn't populate fields (rewrote with custom dropdown)

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

## Repair Cost Display

- [x] Add repair cost display to assessment results

## AI Parse Cost Capture Enhancement

- [x] Add replacement cost capture to AI parse feature
- [x] Add repair cost capture to AI parse feature
- [x] Update UI to display replacement and repair costs in AI import preview

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

- [x] Add "Require MFA" button to Admin → Users page for individual user MFA enforcement


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

## Asset Detail Page Enhancements - Phase 2 (User Request - Jan 2025)

### Photos Tab
- [x] Add camera capture functionality using browser MediaDevices API
- [x] Add file upload with drag-and-drop support
- [x] Display photo gallery with thumbnails
- [x] Add photo preview and delete functionality
- [x] Link photos to specific asset (not just assessments)
- [x] Add photo metadata (date, location, description)

### Maintenance Tab
- [x] Add document upload for maintenance records
- [ ] Display maintenance history timeline
- [x] Allow document attachment to maintenance entries
- [x] Add document preview and download

### Deficiencies Tab
- [x] Add document upload for deficiency evidence
- [x] Link documents to specific deficiencies
- [x] Add document preview and download

### Documents Tab
- [x] Implement general document upload for asset
- [x] Add document categorization (reports, plans, permits, etc.)
- [x] Add bulk upload support
- [x] Add document search and filtering
- [x] Add document preview and download

### Optimization Tab
- [x] Implement budget allocation feature
  - [x] Show total estimated costs
  - [x] Allow budget distribution across components
  - [x] Show budget vs actual comparison
- [x] Implement priority scheduling
  - [x] Rank components by urgency/condition
  - [x] Create maintenance schedule
  - [x] Show timeline visualization
- [x] Implement lifecycle cost analysis
  - [x] Calculate total cost of ownership
  - [x] Show replacement vs repair analysis
  - [x] Display cost projections over time
  - [x] Add NPV calculations

## Timeline Tab Implementation (User Request - Jan 2025)

### Database Schema
- [x] Create asset_timeline_events table for custom events
- [x] Add fields: eventType, eventDate, title, description, relatedId, metadata

### Backend API
- [x] Create timeline aggregation function to collect all events
- [x] Aggregate assessments with creation dates
- [x] Aggregate deficiencies with discovery dates
- [x] Aggregate maintenance entries (identified and executed)
- [x] Aggregate document uploads
- [x] Include future scheduled maintenance
- [x] Add tRPC endpoint for timeline data retrieval
- [x] Implement filtering by event type and date range

### Frontend Timeline Component
- [x] Create TimelineView component with vertical timeline layout
- [x] Add event type icons (assessment, deficiency, maintenance, document, schedule)
- [x] Implement chronological sorting (past to future)
- [x] Add visual distinction between past events and future schedules
- [x] Create event cards with title, date, description, and quick actions
- [x] Add "View Details" link to navigate to related item

### Filtering and Interaction
- [x] Add event type filter (All, Assessments, Deficiencies, Maintenance, Documents, Scheduled)
- [x] Add date range filter (Last 30 days, Last 90 days, Last year, All time, Custom range)
- [x] Implement search functionality for event titles/descriptions
- [x] Add event detail modal/drawer for expanded information
- [x] Show related photos and documents in event details

### Testing
- [x] Test timeline data aggregation with real data
- [x] Verify chronological ordering
- [x] Test filtering functionality
- [x] Test event detail views
- [ ] Verify mobile responsiv## Current Bug Fixes

- [x] Fix division by zero error in AssetOptimization component when totalEstimatedCost is 0

## Optimization Tab Enhancements
- [x] Add empty state messaging in Budget Allocation section when no costs to allocate
- [x] Add data validation for deficiency estimated costs (ensure valid numbers)
- [x] Create comprehensive edge case tests for Optimization tab

## Signup/Registration Page

- [x] Create SignUp page component with registration form
- [x] Add form fields: full name, email, company name, city, phone, use case
- [x] Integrate with existing accessRequests.submit API endpoint
- [x] Add route /signup to App.tsx
- [x] Add "Sign Up" link to login page/home page
- [x] Display success message after submission
- [x] Show pending approval status
- [x] Test complete signup → admin approval → login workflow

## Email Delivery Tracking and Audit Logging

- [x] Create email_delivery_log database table
- [x] Add fields: id, emailType, recipientEmail, recipientName, subject, status, sentAt, deliveredAt, failureReason, metadata
- [x] Create email tracking service with logging functions
- [x] Integrate tracking into accessRequestEmail service
- [x] Create tRPC router for email logs (admin-only access)
- [x] Build EmailDeliveryLogs admin component
- [x] Add Email Logs tab to Admin section
- [x] Implement filtering by status, type, date range
- [x] Add email statistics dashboard (sent, delivered, failed counts)
- [x] Test email tracking with real notifications

## Fix Email Notifications for Access Requests

- [x] Issue: Currently using notifyOwner() which sends Manus platform notifications, not emails
- [x] Create proper email service to send actual emails to lfaria@mabenconsulting.ca
- [x] Installed SendGrid package (@sendgrid/mail) for reliable email delivery
- [x] Created emailService.ts with SendGrid integration
- [x] Update accessRequests.submit to send email notification to admin
- [x] Update accessRequests.approve to send email notification to user
- [x] Update accessRequests.reject to send email notification to user
- [x] Configure SendGrid API key and verified sender email
- [x] Test email delivery with real registration submission
- [x] Verify email tracking logs all deliveries correctly
- [x] All tests passing - emails sent successfully to lfaria@mabenconsulting.ca

## Fix Desktop Landing Page Formatting Issues

- [x] Fix logo overlap - "MABEN" and "CONSULTING" text colliding
- [x] Fix hero heading line breaks - "Streamline Building Assessments" breaking awkwardly
- [x] Improve desktop spacing and layout
- [x] Ensure responsive design works properly on large screens (1920px, 1440px, 1280px)
- [x] Test on various desktop screen sizes

## Landing Page Redesign - Simple & Modern

- [x] Simplify landing page layout while keeping modern aesthetics
- [x] Ensure proper mobile vs desktop responsive detection
- [x] Fix logo display issues with cleaner header design
- [x] Fix hero heading to display properly on all screen sizes
- [x] Test on mobile viewport (375px-768px)
- [x] Test on desktop viewport (1920px+)
- [x] Verify all elements adapt correctly between mobile and desktop

## Mobile Landing Page Fixes

- [x] Fix text overlap with Sign In button in mobile header
- [x] Remove large white space between hero image and blue content section
- [x] Ensure all header elements fit properly on mobile screens
- [x] Test on various mobile screen sizes (375px, 414px, 428px)

## Add Signup Link to Landing Page

- [x] Add "Request Access" or "Sign Up" button to header next to "Sign In"
- [x] Update hero section CTA buttons to include signup option
- [x] Ensure signup button navigates to /signup page
- [ ] Test signup flow from landing page

## UI Improvements

- [x] Improve signup page UI design with modern, simple aesthetic
- [x] Add better spacing and visual hierarchy to signup form
- [x] Enhance form styling with modern input fields
- [x] Add visual elements or background styling to signup page


## Signup Page UI Improvements (Round 2 - Mobile-First Simplification)

- [x] Simplify header design - remove duplicate title text on mobile
- [x] Reduce visual clutter in form layout
- [x] Improve mobile spacing and padding (better touch targets)
- [x] Simplify color scheme for cleaner, more minimal look
- [x] Reduce form field sizes for better mobile UX
- [x] Improve button styling for mobile (full-width, better sizing)
- [x] Add better visual separation between sections
- [x] Remove unnecessary gradient backgrounds for simpler look
- [x] Test on mobile viewport (375px-428px)

## AI Import File Type Restriction (PDF Only)

- [x] Update AIImportDialog component - change accept to PDF only (.pdf)
- [x] Update AIImportAssetDialog component - change accept to PDF only (.pdf)
- [x] Update description text to say "PDF documents" instead of "PDF or Word documents"
- [x] Update file validation error messages to mention PDF only
- [ ] Update backend validation to only accept PDF files
- [ ] Test file picker shows only PDF files on mobile/desktop

## Landing Page Updates (Dec 17, 2024)

- [x] Update footer copyright year from 2024 to 2025
- [x] Add Privacy Policy and Terms of Service links to footer
- [x] Create Privacy Policy page with industry-standard content
- [x] Create Terms of Service page with industry-standard content
- [x] Create Contact page with form
- [x] Implement contact form backend endpoint to send emails to lfaria@mabenconsulting.ca
- [x] Add form validation and success/error states
- [x] Test contact form email delivery

## Date Updates (Dec 17, 2024)

- [x] Update Privacy Policy "Last updated" date from December 17, 2024 to December 17, 2025
- [x] Update Terms of Service "Last updated" date from December 17, 2024 to December 17, 2025

## Landing Page Feature Detail Pages
- [x] Create UNIFORMAT II Classification feature page with detailed content
- [x] Create Voice Recording feature page with detailed content
- [x] Create Automated Reports feature page with detailed content
- [x] Create ASTM E2018 Compliant feature page with detailed content
- [x] Create Offline Mode feature page with detailed content
- [x] Create Analytics & Insights feature page with detailed content
- [x] Add routes for all feature pages in App.tsx
- [x] Make landing page feature cards clickable with navigation to detail pages

## Canadian Branding
- [x] Add maple leaf icon to landing page header
- [x] Add "Proudly Canadian" badge/text to landing page
- [x] Add Canadian flag or maple leaf to footer
- [ ] Consider adding to other pages (feature pages, about section)

## Analytics & Insights Feature Page - Graph Visualizations
- [x] Create sample graph components for Portfolio Health Score (gauge chart, heat map, condition distribution)
- [x] Create sample graph components for Capital Planning Dashboard (stacked bar chart, timeline, pie chart)
- [x] Create sample graph components for Deficiency Management (priority matrix, aging report, trend lines)
- [x] Replace text-only visualization descriptions with actual graph components
- [x] Ensure graphs are responsive and mobile-friendly


## Landing Page Enhancement - Dashboard Visualizations

- [x] Move key dashboard visualizations from analytics page to landing page as marketing feature
- [x] Create compelling hero section showcasing app capabilities
- [x] Add interactive dashboard preview section with real-time data visualization
- [x] Ensure responsive design for dashboard preview on mobile devices
- [x] Test landing page with dashboard visualizations

## Project Detail Page Error Fix (Dec 17, 2024)
- [x] Fix "unexpected error occurred" on project detail page
- [x] Investigate missing procedure or component causing the error
- [x] Test fix on both desktop and mobile

## Camera Photo Capture Bug Fix (Dec 18, 2024)
- [x] Investigate why camera view doesn't appear when clicking "Take Photo" button
- [x] Fix camera stream display implementation (added muted attribute, explicit play() call, resolution constraints)
- [x] Test camera functionality on Photos tab (desktop - confirmed fix works, mobile testing by user)
- [x] Verify camera permissions are working correctly

## Mobile JavaScript Error (Dec 18, 2024)
- [ ] Investigate "An unexpected error occurred" on mobile assessment page
- [ ] Analyze error stack trace from screenshot (DRJFVckH.js:917:253929)
- [ ] Identify root cause of the error
- [ ] Implement fix for mobile compatibility
- [ ] Test fix on mobile device

## 🔥 URGENT: Hide Timeline Tab

- [x] Hide Timeline tab from Asset Detail page (causing runtime errors)
- [x] Remove from secondary tabs list in TabsWithDropdown
- [x] Test asset detail page loads without errors

## MFA Testing - Force Logout and Test Authentication
- [ ] Log out luisrubiofaria@gmail.com from the application
- [ ] Enable MFA requirement for the user account
- [ ] Test login flow with MFA enforcement
- [ ] Verify email-based MFA code delivery
- [ ] Verify authenticator app (TOTP) code requirement
- [ ] Document test results

## Database Cleanup
- [x] Delete all users except luisrubiof@gmail.com (29,198 users to clean up)
- [x] Verify only one user remains in database


## Admin Page Bulk Actions (New Feature Request - Dec 18, 2024)

- [x] Analyze current Admin page structure (Users tab, Companies tab, Access Requests tab)
- [x] Add checkbox selection to user list in Admin page
- [x] Add bulk user actions toolbar (extend trial, suspend, activate, change role, delete)
- [x] Add checkbox selection to company list in Admin page  
- [x] Add bulk company actions toolbar (suspend, activate, extend trials, delete)
- [x] Add checkbox selection to access requests list
- [x] Add bulk access request actions (approve, reject)
- [x] Implement bulk operations with confirmation dialogs
- [x] Add select all/deselect all functionality for all tabs
- [x] Show selected count badge in bulk action toolbar
- [x] Protect current user from self-destructive bulk actions
- [x] Test bulk actions with multiple selections across all tabs
- [x] Create checkpoint after implementation


## 🔥 URGENT: Fix User Approval Error (Dec 18, 2024)

- [x] Fix database insertion error when approving access requests
- [x] Investigate "Failed query: insert into users" error with too many parameters
- [x] Check accessRequests.approve mutation and upsertUser function
- [x] Verify user table schema matches the insertion parameters
- [x] Updated users table role enum to include viewer, editor, project_manager
- [x] Test user approval flow after fix


## 🗑️ Reduce Project Count (Dec 19, 2024)

- [x] Query database to get total project count
- [x] Delete excess projects keeping only the 100 most recent
- [x] Verify final project count is 100
- [x] Test that application still works correctly

## ⏮️ Undo Capability for Bulk Operations (Dec 19, 2024)

Database Schema:
- [x] Create bulk_operation_history table (operation type, affected records, timestamp, user)
- [x] Create bulk_operation_snapshots table (store original data before changes)
- [x] Add expiration mechanism (30-minute time window)

Backend API:
- [x] Create undo service to capture bulk operation snapshots
- [x] Implement undo logic for each bulk operation type (delete, suspend, role change, etc.)
- [x] Add tRPC endpoints: captureSnapshot, undoOperation, listUndoableOperations
- [x] Add automatic cleanup of expired undo records

Frontend UI:
- [x] Add "Undo" notification toast after bulk operations
- [x] Create UndoHistory component showing recent bulk operations
- [x] Add countdown timer showing time remaining to undo
- [x] Add confirmation dialog for undo action
- [x] Integrate into Admin page

Testing:
- [x] Test undo for bulk user delete
- [x] Test undo for bulk suspend/activate
- [ ] Test undo for bulk role changes
- [ ] Test expiration of undo capability after 30 minutes
- [x] Verify data integrity after undo operations


## 🐛 Bug Fix: Bulk Delete Limit (Dec 19, 2024)

- [x] Remove 100-item limit on bulk delete operations
- [x] Update validation schema to allow larger batches
- [x] Test bulk delete with 458 users (limit increased to 1000)

## Email MFA Bug Fix

- [x] Debug email MFA verification code sending failure
- [x] Create proper email service using SendGrid
- [x] Replace notifyOwner() with sendVerificationEmail() in emailMfa.ts
- [x] Fix email sending to send to user's email instead of project owner
- [ ] Test email MFA setup flow end-to-end in browser

## Email MFA Bug Fix

- [x] Debug email MFA verification code sending failure
- [x] Create proper email service using SendGrid
- [x] Replace notifyOwner() with sendVerificationEmail() in emailMfa.ts
- [x] Fix email sending to send to user's email instead of project owner
- [x] Check server logs to see actual error when sending email
- [x] Debug SendGrid API call to see why it's failing
- [x] Fix Email MFA setup error - 'Failed to send verification code' despite backend working
  - Fixed corrupted MFA data handling in getMfaSettings (returns null instead of throwing)
  - Updated sms_verification_codes.code column from VARCHAR(10) to VARCHAR(64) for hashed codes
  - Updated mfa_audit_log.action enum to include email actions (email_sent, email_verified, etc.)
  - Fixed timestamp handling in createVerificationCode and logMfaAudit (use Date objects)
  - Updated tests to clean up data and use valid encrypted secrets
- [ ] Test email MFA setup flow end-to-end in browser

## Email MFA Random Code Generation

- [x] Investigate why verification code shows "123456" instead of random numbers
- [x] Fix code generation to use crypto.randomInt() or similar for proper randomization
- [x] Test that each email sends a different random 6-digit code
- [x] Verify codes are properly hashed before storage in database


## MFA Time-Based Restrictions Feature

### Database Schema
- [x] Create mfa_time_restrictions table with fields: userId, restrictionType, startTime, endTime, daysOfWeek, timezone, isActive
- [x] Add indexes for efficient querying by userId and isActive status
- [x] Support multiple restriction rules per user (e.g., business hours + weekend restrictions)

### Backend API
- [x] Create MFA time restriction service (mfaTimeRestrictions.ts)
- [x] Implement checkMfaTimeRestriction() function to evaluate if MFA is required at current time
- [x] Create tRPC endpoints: setTimeRestriction, getTimeRestrictions, updateTimeRestriction, deleteTimeRestriction
- [x] Add time zone support for global users
- [x] Integrate time checks into MFA verification flow

### Admin UI
- [x] Create MFATimeRestrictionDialog component for configuring time rules
- [x] Add time restriction controls to Admin → Users page
- [x] Support restriction types: always, business_hours, after_hours, custom_schedule, never
- [x] Add day-of-week selector (Monday-Sunday checkboxes)
- [x] Add time range pickers (start time - end time)
- [x] Add timezone selector dropdown
- [ ] Display active time restrictions in user list (optional enhancement)

### Authentication Integration
- [x] Update MFA verification flow to check time restrictions
- [x] Show appropriate messages when MFA is/isn't required based on time
- [ ] Add bypass option for emergency access (admin override) (future enhancement)
- [ ] Log all time-based MFA decisions in audit trail (future enhancement)

### Testing
- [x] Write unit tests for time restriction logic
- [x] Test timezone conversions
- [x] Test day-of-week filtering
- [x] Test time range validation
- [x] Test multiple overlapping restrictions

## Asset Location Tab with Google Maps (Completed)

- [x] Create AssetLocation component with Google Maps integration
- [x] Add geocoding service to convert asset addresses to coordinates
- [x] Display interactive map centered on asset location with marker
- [x] Add Street View integration
- [x] Add satellite/terrain view toggle
- [x] Add "Get Directions" button
- [x] Show all assets from same project on map with different colored markers
- [x] Make markers clickable to navigate to asset details
- [x] Add Location tab to Asset Detail page TabsWithDropdown
- [x] Test with valid and incomplete addresses
- [x] Test responsive design on mobile and desktop
- [x] Fix CSP headers to allow Google Maps scripts
- [x] Fix multiple script loading issue
- [x] Add city field to database schema (assets and projects)
- [x] Add City field to asset edit form
- [x] Fix circular dependency preventing map from rendering


## Location Tab Address Fallback Fix

- [x] Investigate why asset shows "No address information available"
- [x] Implement fallback to use project address when asset has no address
- [x] Update AssetLocation component to fetch project data
- [x] Display map using project address if asset address is missing
- [x] Test with assets that have and don't have addresses

## Address Autocomplete Feature (Completed)
- [x] Create AddressAutocomplete component using Google Places API
- [x] Integrate autocomplete into AssetDialog for address fields
- [x] Auto-fill street address, city, province, postal code from selected place
- [x] Add validation to ensure selected addresses are geocodable
- [x] Test autocomplete functionality with various address types

## Project Address Autocomplete (Completed)
- [x] Integrate AddressAutocomplete component into ProjectDialog
- [x] Update project creation form to use autocomplete for address fields
- [x] Test autocomplete functionality in project creation workflow

- [x] Fix address autocomplete click handler - clicking suggestions doesn't populate fields

## Project Status Management Enhancement (Completed)
- [x] Verified 'completed' status already exists in database schema
- [x] Verified status filter dropdown already includes 'completed' option
- [x] Added status dropdown to project edit dialog
- [x] Updated projectForm state to include status field
- [x] Updated handleEditProject to initialize status from project data
- [x] Updated handleSaveProject to save status changes
- [x] Tested status change functionality

## Bulk Status Updates and Status Change History

### Backend - Status Change History
- [x] Create project_status_history database table
- [x] Add database helper functions for status history
- [x] Create tRPC endpoint to log status changes
- [x] Create tRPC endpoint to retrieve status history
- [x] Update projects.update to automatically log status changes
- [x] Write tests for status history tracking

### Backend - Bulk Status Updates
- [x] Create tRPC endpoint for bulk status update
- [x] Add authorization checks (users can only update their own projects)
- [x] Log status changes for each project in bulk operation
- [x] Write tests for bulk status updates

### Frontend - Status Change History
- [x] Create StatusHistoryTimeline component
- [x] Add Status History tab/section to project detail page
- [x] Display timeline with status changes, timestamps, and users
- [x] Add visual indicators for status transitions

### Frontend - Bulk Status Updates
- [x] Add status change option to bulk actions toolbar
- [x] Create status selection dialog for bulk operations
- [x] Add confirmation dialog showing affected projects
- [x] Show success/error notifications
- [x] Refresh project list after bulk update

## Add Assessment Creation Button to Assessments Tab

- [x] Add "Start Assessment" or "Add Assessment" button to Assessments tab
- [x] Wire button to open AssessmentDialog for creating new assessments
- [x] Ensure button is visible when no assessments exist
- [x] Test assessment creation flow from Assessments tab
- [x] Make assessment cards clickable in the Assessments tab to open assessment dialog for viewing/editing

## Compliance Tab Enhancements

- [x] Add building code selection dropdown to Compliance tab in Asset Detail page
- [x] Display list of asset components with compliance check buttons
- [x] Integrate AI compliance checking for each component against selected building code
- [x] Create database table for building codes
- [x] Create scheduled task to search and update building codes monthly
- [x] Implement building code search and update logic

## Logo Update
- [x] Create new B³NMA logo with 3D cube design (navy blue to teal gradient)
- [x] Replace maben-logo.png in client/public directory
- [x] Update APP_LOGO constant if needed
- [x] Verify logo displays correctly in sidebar and header

## Add National Fire Code and Plumbing Code

### Database Updates
- [x] Add National Fire Code of Canada (current edition) to building_codes table
- [x] Add National Plumbing Code of Canada (current edition) to building_codes table
- [x] Verify codes are properly seeded with correct metadata

### Compliance Checking Enhancement
- [x] Update compliance check prompt to require explanations for all results
- [x] Modify response schema to include explanation field for each issue
- [x] Update ComplianceCheckDialog to display explanations
- [x] Update NonComplianceList to show explanations for each issue
- [x] Test compliance checking with new codes and verify explanations appear

## Add Unique Identifiers to Projects and Assets

### Database Schema Updates
- [x] Add unique_id field to projects table (varchar, unique, auto-generated)
- [x] Add unique_id field to assets table (varchar, unique, auto-generated)
- [x] Create migration script to generate unique IDs for existing records
- [x] Push schema changes to database

### Backend Implementation
- [x] Create utility function to generate unique IDs (format: PROJ-YYYYMMDD-XXXX or ASSET-YYYYMMDD-XXXX)
- [x] Update createProject to auto-generate unique_id
- [x] Update createAsset to auto-generate unique_id
- [x] Add unique_id to project and asset queries/responses
- [x] Add validation to ensure unique_id uniqueness

### Frontend Display
- [x] Display project unique_id in project detail page header
- [x] Display asset unique_id in asset detail page header
- [ ] Add unique_id column to projects table
- [ ] Add unique_id column to assets table
- [ ] Make unique_id searchable in project/asset lists
- [ ] Add unique_id to export reports and PDFs

- [x] Add 'Back to Dashboard' button to all pages for easier navigation

- [x] Fix report generation function not working for assets (PDF and Excel buttons inactive)

## UI Fixes

- [x] Fix landing page logo size - make smaller to fit white ribbon header

## AI Insights Tab Restoration

- [x] Check if AIInsightsChat component exists
- [x] Verify AI chat backend router exists
- [x] Add AI Insights tab to ProjectDetail page
- [x] Add AI Insights tab to AssetDetail page
- [x] Test AI chat functionality on both pages

## AI Insights Conversation Persistence

- [x] Implement conversation persistence for AI Insights chat so users can resume conversations when returning to projects/assets

## AI Chatbot Suggested Questions

- [x] Display suggested questions in AI chat interface
- [x] Make suggested questions clickable to auto-populate chat input
- [x] Show loading state when fetching suggested questions
- [x] Test suggested questions on project and asset pages

## Bug Fixes

- [x] Fix jsPDF2 is not a constructor error in asset report generation

## Financial Metrics in BCA Reports

### Presentation Updates
- [x] Add financial metrics slides to BCA presentation
- [x] Include cost estimation methodology
- [x] Add budget projection charts
- [x] Include ROI analysis for repairs
- [x] Add lifecycle cost analysis

### Web App Financial Features
- [ ] Add cost summary dashboard widget
- [ ] Implement financial report generation
- [ ] Add budget vs actual tracking
- [ ] Include cost per square foot metrics
- [ ] Add financial export to PDF/Excel


## UI and Report Updates (Dec 23, 2025)

### Tab Navigation
- [x] Move AI Insights tab next to Dashboard tab in Asset Detail page

### Financial KPIs in PDF Reports
- [x] Add financial KPIs section to asset PDF report generator (assetReportGenerator.ts)
- [x] Add financial KPIs section to project PDF report generator (reportGenerator.ts)
- [x] Include: Total deferred maintenance, cost by priority, FCI metrics, budget projections

## Compliance Tab Updates (Dec 23, 2025)

- [x] Add legal disclaimer under AI compliance check tab in Asset Detail page
- [x] Eliminate building code duplicates by deduplicating by jurisdiction + year in getActiveBuildingCodes
- [x] Add checkbox requiring users to acknowledge legal disclaimer before running compliance checks
- [x] Disable "Check Compliance" buttons until checkbox is checked


## AI Compliance Check Enhancement (Dec 23, 2025)

- [x] Enhance AI compliance check to provide detailed reasons for non-compliant components
- [x] Display non-compliance reasons in the compliance check results UI

- [x] Make component assessment items clickable to access assessment details

## Filter Persistence (Dec 23, 2024)

- [ ] Implement filter persistence when navigating back to assets list
- [ ] Implement filter persistence when navigating back to projects list


## Compliance Disclaimer Update (Dec 23, 2024)

- [ ] Remove checkbox/acknowledgment button from compliance disclaimer
- [ ] Replace with passive statement "By using this feature, I understand that AI-assisted compliance check is for informational purposes only..."


## Compliance Disclaimer Update (Dec 23, 2024)

- [x] Remove checkbox acknowledgment button from compliance check section
- [x] Replace with passive acknowledgment statement
- [x] Remove disabled state dependency on checkbox for Check Compliance button

## Landing Page Enhancement

- [x] Add B³NMA acronym explanation to landing page (Building Better Baselines for Needs, Modernization & Assets)


## 3D BIM Viewer Integration (Autodesk Forge)

### Phase 1: Forge Infrastructure Setup
- [ ] Create Autodesk Forge account and obtain API credentials
- [ ] Set up Forge Model Derivative API for file conversion
- [ ] Configure environment variables for Forge authentication
- [ ] Create backend service for Forge token management
- [ ] Implement model upload and conversion endpoints

### Phase 2: Database Schema
- [ ] Add forge_model_urn and forge_model_url to assets table
- [ ] Add x_coordinate, y_coordinate, z_coordinate to deficiencies table
- [ ] Add bim_element_guid to deficiencies table
- [ ] Create bim_elements table for element mapping
- [ ] Add model_viewpoints table for saved camera positions

### Phase 3: Forge Viewer Component
- [ ] Install Forge Viewer npm packages
- [ ] Create ForgeViewer React component
- [ ] Implement basic viewer initialization and model loading
- [ ] Add navigation controls (orbit, pan, zoom, section)
- [ ] Implement model tree/hierarchy view
- [ ] Add measurement tools

### Phase 4: Deficiency Hotspots
- [ ] Create deficiency marker overlay system
- [ ] Implement 3D coordinate capture on model click
- [ ] Add color-coded markers by priority level
- [ ] Create hotspot info panel component
- [ ] Implement filter controls (priority, status, system)
- [ ] Add click handlers to view deficiency details

### Phase 5: Upload Interface
- [ ] Create BIM model upload dialog component
- [ ] Add file type validation (RVT, IFC, NWD, DWG)
- [ ] Implement upload progress tracking
- [ ] Add conversion status monitoring
- [ ] Update Asset Detail 3D Model tab with viewer
- [ ] Add model management UI (delete, re-upload)

### Phase 6: Testing & Polish
- [ ] Test with sample BIM models
- [ ] Verify deficiency hotspot accuracy
- [ ] Test on mobile devices
- [ ] Add loading states and error handling
- [ ] Write comprehensive tests
- [ ] Update documentation


## Offline Capabilities Optimization

### Performance Optimizations
- [ ] Implement lazy loading for IndexedDB data (load on demand vs all at once)
- [ ] Add database indexing for faster offline queries
- [ ] Optimize photo compression algorithm (better quality/size ratio)
- [ ] Implement chunked file uploads for large photos (resume on failure)
- [ ] Add memory management for large offline datasets
- [ ] Implement virtual scrolling for offline data lists

### Sync Engine Improvements
- [ ] Add delta sync (only sync changed fields, not entire records)
- [ ] Implement smart conflict resolution (field-level merge vs record-level)
- [ ] Add sync prioritization (critical data first, photos last)
- [ ] Implement background sync using Service Worker
- [ ] Add sync batching to reduce API calls
- [ ] Implement sync queue persistence across browser restarts

### Storage Optimizations
- [ ] Implement automatic storage cleanup for old cached data
- [ ] Add storage quota monitoring and warnings
- [ ] Implement tiered storage (hot/warm/cold data)
- [ ] Add data compression for text content in IndexedDB
- [ ] Implement selective caching (user-defined priorities)

### Reliability Improvements
- [ ] Add comprehensive error recovery for failed syncs
- [ ] Implement data integrity checks (checksums)
- [ ] Add automatic retry with smarter backoff strategy
- [ ] Implement offline data validation before sync
- [ ] Add sync transaction rollback on partial failures

### User Experience Enhancements
- [ ] Add offline mode indicator in all pages (not just dashboard)
- [ ] Implement offline search functionality
- [ ] Add offline data freshness indicators (last updated timestamps)
- [ ] Implement offline-first form validation
- [ ] Add sync conflict resolution UI for users
- [ ] Implement offline notifications queue

### Testing & Monitoring
- [ ] Add offline performance metrics collection
- [ ] Create automated offline scenario tests
- [ ] Implement sync health monitoring dashboard
- [ ] Add offline usage analytics
- [ ] Create stress tests for large offline datasets

## Offline Optimization - Comprehensive Enhancement

### Phase 1: IndexedDB Storage Optimization
- [ ] Implement lazy loading for large datasets (pagination with cursor-based iteration)
- [ ] Add database versioning with migration support for schema changes
- [ ] Implement storage quota management with automatic cleanup
- [ ] Add compound indexes for complex queries (projectId + syncStatus)
- [ ] Implement transaction batching for bulk operations

### Phase 2: Enhanced Sync Engine
- [ ] Implement delta sync (only sync changed fields, not entire records)
- [ ] Add smart conflict resolution with merge strategies
- [ ] Implement chunked photo uploads for large files
- [ ] Add sync priority queue with dependency tracking
- [ ] Implement parallel sync for independent items
- [ ] Add network quality detection for adaptive sync

### Phase 3: Service Worker Implementation
- [ ] Create service worker for background sync
- [ ] Implement offline page caching strategy
- [ ] Add push notification for sync completion
- [ ] Implement periodic background sync
- [ ] Add sync event handling for reliable background operations

### Phase 4: Storage Management
- [ ] Implement storage usage tracking and reporting
- [ ] Add automatic cleanup of old synced data
- [ ] Implement LRU cache eviction for photos
- [ ] Add storage quota warnings to UI
- [ ] Implement data compression for text fields

### Phase 5: Offline UX Improvements
- [ ] Add offline search capability for cached data
- [ ] Implement conflict resolution UI for manual merge
- [ ] Add sync queue management UI with reorder/cancel
- [ ] Implement offline data export/import
- [ ] Add detailed sync error reporting with resolution suggestions



## Offline Optimization - Comprehensive (Completed)
- [x] Optimize IndexedDB storage with lazy loading and pagination
- [x] Add database versioning with migration support
- [x] Implement compound indexes for complex queries
- [x] Add transaction batching for bulk operations
- [x] Enhance sync engine with delta sync (only changed fields)
- [x] Implement smart conflict resolution with merge strategies
- [x] Add parallel sync for independent items
- [x] Create Service Worker for background sync
- [x] Implement offline page caching
- [x] Add push notifications for sync completion
- [x] Create storage quota management
- [x] Implement LRU cache eviction for photos
- [x] Add automatic cleanup of old synced data
- [x] Create storage usage visualization
- [x] Add export/import for offline data backup
- [x] Build offline status panel with sync progress
- [x] Create offline search for cached data
- [x] Implement conflict resolution UI


## Dashboard Offline Status Integration

- [x] Integrate OfflineStatusPanel into DashboardLayout sidebar
- [x] Show offline status indicator in sidebar navigation
- [x] Display pending sync count badge in sidebar
- [x] Add collapsible offline status section to sidebar

## Push Notification Permissions

- [x] Request push notification permission on first app load
- [x] Create notification permission request dialog
- [x] Send browser notification when sync completes
- [x] Handle notification permission denied gracefully
- [x] Store notification preference in localStorage


## 3D Model Viewer Feature

- [x] Install Three.js and related dependencies (@react-three/fiber, @react-three/drei)
- [x] Create ThreeModelViewer component with orbit controls
- [x] Support glTF/GLB 3D model format loading
- [x] Implement model upload functionality with S3 storage (already existed)
- [x] Add model upload UI to asset detail 3D Model tab
- [x] Create backend endpoints for 3D model management (upload, get, delete) (already existed)
- [x] Update database schema for 3D model storage (facilityModels table already existed)
- [x] Integrate viewer into asset detail page replacing placeholder
- [x] Add loading states and error handling for 3D viewer
- [x] Test 3D model upload and viewing functionality
- [x] Add support for SketchUp (.skp) file format
- [x] Add support for Revit (.rvt, .rfa) file formats
- [x] Add support for DWG/DXF (.dwg, .dxf) file formats


## Cleanup and Optimization

### Test Data Cleanup
- [x] Remove test/mock data from the application - N/A (sample data in DashboardPreview and SampleCharts is intentional demo content for marketing pages)
- [x] Clean up any hardcoded test values - N/A (no test data found that needs removal)

### Code Splitting
- [x] Implement React.lazy for route-based code splitting
- [x] Add Suspense boundaries with loading fallbacks (PageLoader component)
- [x] Split large page components for better performance (30+ pages now lazy loaded)
- [x] Verify application works correctly after code splitting


## Database Cleanup - Test Projects (Dec 25, 2024)

- [x] Identify test projects in database (CI/FCI Test, History Test, Consultant Upload Test, etc.)
- [x] Delete test projects and their associated data (deleted 799 projects, kept 2 Comox projects)
- [x] Verify project count after cleanup (2 projects, 2 assets, 59 assessments remaining)

## Demo Project & Business Case (Dec 25, 2024)

- [x] Create demo project "City of Vancouver Municipal Complex"
- [x] Add 10 diverse assets covering different building types
- [x] Add comprehensive UNIFORMAT II assessments for each asset
- [x] Add deficiencies with varying priorities and severities
- [ ] Test AI features (compliance checking, AI insights chat)
- [x] Create business case document showcasing all features
- [ ] Verify all features work with demo data


## Portfolio-Level Report Generation with Financial Metrics

### Phase 1: Financial Metrics Calculations
- [x] Implement Facility Condition Index (FCI) calculation per asset
- [x] Implement FCI aggregation at project/portfolio level
- [x] Calculate Deferred Maintenance Backlog (total repair costs)
- [x] Calculate Current Replacement Value (CRV) per asset
- [x] Calculate Funding Gap Analysis (required vs available)
- [x] Implement 5-year Capital Renewal Forecast
- [x] Calculate Remaining Useful Life (RUL) by component
- [x] Implement Priority Weighted Scoring for repairs

### Phase 2: Portfolio Report Data Model
- [x] Create portfolio report schema in database
- [ ] Add report generation history tracking (future enhancement)
- [ ] Store report snapshots for historical comparison (future enhancement)
- [x] Add report configuration options (metrics to include)

### Phase 3: Backend Report Generation
- [x] Create reports.generatePortfolioReport procedure
- [x] Aggregate assessments across all assets in project
- [x] Calculate weighted averages for condition scores
- [x] Generate executive summary with key metrics
- [x] Create detailed breakdown by asset
- [x] Create breakdown by UNIFORMAT II category
- [x] Generate repair priority matrix
- [ ] Add PDF export capability for portfolio reports (future enhancement)

### Phase 4: Portfolio Report UI
- [x] Add "Generate Portfolio Report" button to project detail page
- [x] Create PortfolioReportDialog component
- [x] Add report configuration options (select metrics, date range)
- [x] Display executive summary dashboard
- [x] Add FCI gauge/visualization per asset
- [x] Create deferred maintenance chart
- [x] Add capital renewal forecast chart (5-year projection)
- [x] Create asset comparison table with key metrics
- [ ] Add export options (PDF, Excel) (future enhancement)

### Phase 5: Testing & Documentation
- [x] Write vitest tests for financial metric calculations (31 tests passing)
- [ ] Test portfolio report generation with multiple assets (ready for user testing)
- [ ] Document financial metrics methodology
- [ ] Add tooltips explaining each metric to users


## PDF Export & Budget Allocation (Dec 25, 2024)

### PDF Export for Portfolio Reports
- [x] Install jsPDF and jspdf-autotable packages
- [x] Create portfolioPdfGenerator.ts utility
- [x] Add PDF export button to PortfolioReportDialog
- [x] Include all report sections in PDF (summary, assets, categories, priorities, forecast)
- [x] Add budget allocation data to PDF export

### Budget Allocation Integration
- [x] Add budget input field to portfolio report
- [x] Implement funding gap calculation
- [x] Create prioritized spending recommendations
- [x] Show budget coverage by priority level
- [x] Add Budget tab to portfolio report dialog

### Comprehensive Demo Project
- [x] Create demo project "Metro Vancouver Public Works Portfolio"
- [x] Add 10 diverse assets covering different building types
- [x] Add comprehensive UNIFORMAT II assessments for each asset (251 assessments)
- [x] Add deficiencies with varying priorities and severities (52 deficiencies)
- [x] Verify all features work with demo data

## Portfolio-Wide Analytics and Aggregation

- [x] Portfolio analytics should only be displayed in projects with multiple assets

### Database and Backend
- [x] Create portfolio analytics database queries for cross-portfolio aggregation
- [x] Add portfolio-wide condition distribution analysis
- [x] Add portfolio-wide cost breakdown by UNIFORMAT category
- [x] Add portfolio-wide deficiency trends over time
- [x] Add building comparison metrics (FCI, condition, costs)
- [x] Add geographic distribution analysis (by city/province)
- [x] Add property type distribution analysis

### API Endpoints
- [x] Create portfolioAnalytics router with comprehensive endpoints
- [x] Add getPortfolioOverview endpoint (summary metrics)
- [x] Add getConditionDistribution endpoint
- [x] Add getCostBreakdown endpoint (by category, priority, building)
- [x] Add getBuildingComparison endpoint
- [x] Add getDeficiencyTrends endpoint
- [x] Add getGeographicDistribution endpoint
- [x] Add exportPortfolioReport endpoint (PDF generation via print)

### Frontend UI
- [x] Create PortfolioAnalytics page with comprehensive dashboard
- [x] Add portfolio overview cards (total buildings, CRV, FCI, deficiencies)
- [x] Add condition distribution pie chart
- [x] Add cost breakdown bar chart by UNIFORMAT category
- [x] Add building comparison table with sorting
- [x] Add deficiency trends line chart
- [x] Add geographic distribution list
- [x] Add property type breakdown chart
- [x] Add export/download functionality for reports (print to PDF)
- [x] Add navigation to portfolio analytics from dashboard

### Portfolio Report Feature
- [x] Create PDF portfolio report generator (print-based)
- [x] Include executive summary section
- [x] Include portfolio metrics and KPIs
- [x] Include building-by-building breakdown
- [x] Include capital planning forecast
- [x] Include priority recommendations
- [x] Add report customization options


## Bug Fixes

- [x] BUG: Repair costs showing $0 in Financial KPIs & Cost Analysis page - Fixed by using assessments.estimatedRepairCost instead of deficiencies.estimatedCost

- [x] Update report generation to replace Maben Consulting with B³NMA logo and branding
- [x] Remove Maben Consulting footer from reports and replace with client name/address
- [x] Move Portfolio Analytics from left sidebar to Projects section

- [x] Fix FCI (Facility Condition Index) not displaying properly in Financial tab - created getAssetFCI function and assets.fci endpoint

## Financial Analysis Tab Enhancement

- [ ] Enhance Financial Analysis tab with comprehensive metrics
- [ ] Add FCI (Facility Condition Index) calculation and gauge display
- [ ] Add capital planning timeline/forecast visualization
- [ ] Add cost breakdown by category chart
- [ ] Add ROI and lifecycle cost analysis
- [ ] Add budget vs actual tracking
- [ ] Add depreciation and asset value metrics
- [ ] Add financial risk assessment indicators
- [ ] Add cost escalation projections
- [ ] Add funding gap analysis

## Financial Analysis Tab Enhancement (Completed)

- [x] Enhance Financial Analysis tab with comprehensive metrics
- [x] Add FCI gauge visualization with industry-standard ratings (Good 0-5%, Fair 5-10%, Poor 10-30%, Critical >30%)
- [x] Add key financial metrics (CRV, deferred maintenance, per sq ft costs)
- [x] Add 20-year capital planning forecast with Chart.js visualization
- [x] Add cost breakdown by UNIFORMAT building system with horizontal bar chart
- [x] Add financial risk assessment with risk indicators (FCI Risk Level, Immediate Needs Ratio, Age Risk Factor)
- [x] Add funding scenario modeling (100%, 75%, 50%, 25% funding levels)
- [x] Add financial recommendations based on asset condition
- [x] Add 5-year period summary for capital planning
- [x] Add category-level FCI calculations in cost breakdown

## 📊 Portfolio Analytics Enhancement (Senior Engineer Review)

### Advanced Financial Metrics & Analytics
- [x] Add Net Present Value (NPV) calculations for capital investments
- [x] Implement Return on Investment (ROI) tracking for completed projects
- [x] Add Total Cost of Ownership (TCO) analysis per asset
- [x] Implement lifecycle cost analysis with inflation adjustments
- [ ] Add budget variance analysis (planned vs actual spending)
- [ ] Implement cost per square foot metrics
- [ ] Add depreciation tracking and asset value calculations
- [x] Implement financial risk scoring based on deferred maintenance

### Predictive Analytics & Forecasting
- [x] Add predictive maintenance cost forecasting using historical data
- [x] Implement asset failure probability predictions
- [x] Add budget requirement forecasting with confidence intervals
- [x] Implement condition deterioration rate predictions
- [x] Add scenario modeling (best case, worst case, most likely)
- [ ] Implement what-if analysis for budget allocation strategies

### Risk Assessment & Management
- [ ] Add comprehensive risk scoring matrix (financial, operational, safety, compliance)
- [ ] Implement risk heat maps for portfolio visualization
- [ ] Add risk mitigation cost-benefit analysis
- [ ] Implement criticality scoring for assets
- [ ] Add vulnerability assessments for high-risk components
- [ ] Implement risk trend analysis over time

### Performance Benchmarking
- [x] Add industry benchmark comparisons for FCI/CI metrics
- [ ] Implement peer portfolio comparison capabilities
- [x] Add performance targets and KPI tracking
- [ ] Implement efficiency metrics (cost per unit, maintenance per sqft)
- [ ] Add year-over-year performance comparisons
- [ ] Implement portfolio maturity scoring

### Advanced Visualizations
- [ ] Add interactive portfolio heat maps with drill-down capabilities
- [ ] Implement Sankey diagrams for cost flow analysis
- [ ] Add waterfall charts for budget allocation visualization
- [ ] Implement scatter plots for risk vs cost analysis
- [ ] Add Gantt charts for capital planning timeline
- [ ] Implement treemap visualizations for hierarchical cost breakdown
- [ ] Add sparklines for trend indicators in summary cards

### Economic Analysis Tools
- [ ] Add inflation rate adjustments for multi-year planning
- [ ] Implement discount rate calculations for NPV
- [ ] Add economic life vs physical life analysis
- [ ] Implement replacement vs repair economic analysis
- [ ] Add opportunity cost calculations
- [ ] Implement payback period calculations for investments

### Portfolio Optimization
- [ ] Add budget optimization recommendations using linear programming
- [ ] Implement priority scoring algorithms with multiple criteria
- [ ] Add resource allocation optimization
- [ ] Implement maintenance schedule optimization
- [ ] Add portfolio rebalancing recommendations
- [ ] Implement constraint-based planning (budget, timeline, resources)

### Data Export & Reporting
- [ ] Add comprehensive Excel export with multiple worksheets
- [ ] Implement PDF report generation with executive summary
- [ ] Add customizable report templates
- [ ] Implement scheduled report generation and email delivery
- [ ] Add data export for external BI tools
- [ ] Implement audit trail for all analytics queries

### Database Schema Enhancements
- [x] Create portfolio_metrics table for historical tracking
- [x] Add financial_forecasts table for predictive data
- [x] Create benchmark_data table for industry comparisons
- [ ] Add optimization_scenarios table for what-if analysis
- [x] Create economic_indicators table (inflation, discount rates)
- [x] Add portfolio_targets table for KPI goals
- [x] Add investment_analysis table for ROI/NPV/IRR tracking

### Testing & Documentation
- [x] Write comprehensive unit tests for all new calculations
- [ ] Add integration tests for analytics procedures
- [x] Create user documentation for new features
- [x] Add API documentation for new endpoints
- [x] Create example use cases and tutorialsgy documentation
- [ ] Add inline code documentation for complex algorithms

### Performance & Scalability
- [ ] Implement caching for expensive calculations
- [ ] Add database indexes for analytics queries
- [ ] Implement pagination for large datasets
- [ ] Add query optimization for complex aggregations
- [ ] Implement background jobs for heavy computations
- [ ] Add progress indicators for long-running calculations


### Frontend Implementation Completed
- [x] Created PortfolioAnalyticsEnhanced page with advanced visualizations
- [x] Implemented metrics trend charts with time period selection
- [x] Added financial forecast visualizations with scenario analysis
- [x] Implemented portfolio targets tracking with progress indicators
- [x] Added risk analysis visualizations (failure probability, risk scores)
- [x] Integrated all enhanced analytics API endpoints
- [x] Added navigation link from existing portfolio analytics page
- [x] Implemented responsive design for all analytics components

## Economic Indicators & Portfolio Targets

### Database Schema
- [x] Create economic_indicators table (construction inflation rates, discount rates, regional data)
- [x] Create portfolio_targets table (FCI goals, timeline, KPI tracking)
- [x] Add database migration for new tables

### Backend Implementation
- [x] Implement economicIndicators.create mutation
- [x] Implement economicIndicators.update mutation
- [x] Implement economicIndicators.list query
- [x] Implement economicIndicators.getLatest query (get current active indicators)
- [x] Implement portfolioTargets.create mutation
- [x] Implement portfolioTargets.update mutation
- [x] Implement portfolioTargets.list query
- [x] Implement portfolioTargets.getActive query (get current active targets)
- [x] Add validation for economic indicator values (percentage ranges, dates)
- [x] Add validation for portfolio target values (FCI ranges, dates)

### Frontend UI
- [x] Create EconomicIndicatorsManagement page in Admin section
- [x] Create PortfolioTargetsManagement page in Admin section
- [x] Add forms for creating/editing economic indicators
- [x] Add forms for creating/editing portfolio targets
- [x] Add data tables for viewing indicators and targets
- [x] Add navigation links in Admin section

### Integration
- [ ] Update NPV calculation to use economic indicators (discount rates, inflation)
- [ ] Update financial forecasting to use economic indicators
- [ ] Update portfolio dashboard to display target progress
- [ ] Add FCI trend visualization with target overlay
- [ ] Add KPI tracking cards showing progress toward targets

### Testing
- [ ] Write tests for economic indicators CRUD operations
- [ ] Write tests for portfolio targets CRUD operations
- [ ] Write tests for NPV calculations with economic indicators
- [ ] Test UI forms and validation
- [ ] Test integration with existing financial calculations

## Restructure Analysis to Projects Hierarchy

- [ ] Update database schema to add companies table
- [ ] Create hierarchical relationship: companies → projects → assets
- [ ] Add database helpers for companies CRUD operations
- [ ] Create tRPC procedures for companies management
- [ ] Build Companies list page
- [ ] Build Company detail page with projects list
- [ ] Update Project detail page to show company context
- [ ] Update Asset detail page to show project and company context
- [ ] Update navigation to reflect new hierarchy (Companies → Projects → Assets)
- [ ] Remove old flat analysis structure from navigation

## Analytics Feature Implementation

- [x] Fix existing TypeScript errors in portfolioTargetsRouter.ts
- [x] Fix duplicate exports in schema.ts (economicIndicators, portfolioTargets)
- [x] Design analytics database schema for metrics tracking
- [x] Create analytics aggregation queries (condition trends, deficiency stats, cost projections)
- [x] Build analytics tRPC router with endpoints
- [x] Create Analytics dashboard page with overview cards
- [x] Add condition distribution chart (pie/donut chart)
- [x] Add assessment trends over time chart (line chart)
- [x] Add deficiency priority breakdown chart (bar chart)
- [x] Add cost analysis charts (repair vs replacement costs)
- [x] Add component-level analytics (UNIFORMAT II breakdown)
- [x] Add project-level analytics filtering
- [x] Add company-level analytics filtering
- [x] Add date range filters for analytics
- [ ] Add export analytics data to CSV/Excel
- [ ] Test analytics calculations and visualizations


## 3D Model File Conversion & Viewing (Dec 27, 2024)

### Requirement: Support for RVT, RFA, DWG, DXF, SKP, FBX, OBJ files

### Phase 1: Three.js Native Format Support (FBX, OBJ)
- [ ] Add FBXLoader to Three.js viewer for native FBX support
- [ ] Add OBJLoader to Three.js viewer for native OBJ support
- [ ] Update ModelViewer to detect and use appropriate loader
- [ ] Test FBX and OBJ file loading in browser

### Phase 2: Autodesk Platform Services Integration
- [ ] Request APS credentials from user (Client ID, Client Secret)
- [ ] Create APS authentication service for token management
- [ ] Implement file upload to Autodesk OSS (Object Storage Service)
- [ ] Create translation job endpoint for Model Derivative API
- [ ] Add translation status polling/webhook handling
- [ ] Store translation URN and status in database

### Phase 3: Autodesk Viewer Integration
- [ ] Install Autodesk Viewer SDK
- [ ] Create AutodeskViewer React component
- [ ] Implement viewer initialization with access token
- [ ] Add model loading from translated URN
- [ ] Integrate viewer controls (orbit, pan, zoom, section)

### Phase 4: Hybrid Viewer Strategy
- [ ] Update ModelViewer to detect file format
- [ ] Route GLB/GLTF/FBX/OBJ to Three.js viewer
- [ ] Route RVT/RFA/DWG/DXF/SKP to Autodesk Viewer
- [ ] Add conversion progress indicator
- [ ] Handle conversion errors gracefully

### Phase 5: Testing & Documentation
- [ ] Test with sample RVT file
- [ ] Test with sample DWG file
- [ ] Test with sample SKP file
- [ ] Test with sample FBX file
- [ ] Test with sample OBJ file
- [ ] Document supported formats and limitations


## Move Analytics to Project Assets Page (Dec 27, 2024)

- [x] Add Analytics button to Assets page header (next to AI Import and Add Asset)
- [x] Only show Analytics button when project has more than 1 asset
- [x] Create ProjectAnalytics page component with charts and metrics
- [x] Add route for /projects/:id/analytics
- [x] Link Analytics button to ProjectAnalytics page
- [x] Test Analytics button visibility with single vs multiple assets


## 📊 Enhanced Projects Analytics - 15 Comprehensive Features (Dec 27, 2024)

### 1. Executive Summary Dashboard
- [ ] Add project health score gauge (0-100) based on weighted FCI, deficiency count, and condition distribution
- [ ] Add key performance indicators (KPIs) row: Total CRV, Deferred Maintenance, Average FCI, Critical Deficiencies
- [ ] Add quick action buttons: Export Report, Schedule Assessment, View Critical Items
- [ ] Add project completion percentage based on assessed vs total components
- [ ] Add comparison to portfolio average benchmarks

### 2. Facility Condition Index (FCI) Analytics
- [ ] Add FCI gauge visualization with color-coded zones (Good <5%, Fair 5-10%, Poor >10%)
- [ ] Add FCI trend chart showing historical FCI values over time
- [ ] Add FCI breakdown by UNIFORMAT II category (A-G)
- [ ] Add FCI comparison across assets within the project
- [ ] Add FCI target setting and tracking against goals
- [ ] Add FCI forecasting based on deterioration rates

### 3. Capital Planning & Budget Forecasting
- [ ] Add 5-year capital expenditure forecast chart with year-by-year breakdown
- [ ] Add budget allocation by priority (Immediate, Short-term, Medium-term, Long-term)
- [ ] Add funding gap analysis (required vs available budget)
- [ ] Add cost escalation projections with adjustable inflation rates
- [ ] Add scenario modeling: deferred maintenance impact analysis
- [ ] Add ROI calculator for proposed repairs/replacements

### 4. Deficiency Management Analytics
- [ ] Add deficiency aging report (days since identified)
- [ ] Add deficiency resolution rate tracking (closed vs open over time)
- [ ] Add deficiency heatmap by building component category
- [ ] Add deficiency cost distribution by severity and priority
- [ ] Add deficiency trend analysis (new vs resolved per month)
- [ ] Add critical deficiency alert panel with countdown timers

### 5. Component Lifecycle Analysis
- [ ] Add component age distribution chart
- [ ] Add remaining useful life (RUL) visualization by component
- [ ] Add replacement schedule timeline (Gantt-style view)
- [ ] Add component failure probability predictions
- [ ] Add lifecycle cost comparison (repair vs replace scenarios)
- [ ] Add component warranty tracking and expiration alerts

### 6. Assessment Coverage & Progress
- [ ] Add assessment completion percentage by UNIFORMAT category
- [ ] Add assessment coverage map/matrix showing assessed vs unassessed components
- [ ] Add assessment frequency tracking (last assessed date per component)
- [ ] Add overdue assessment alerts (components not assessed in X months)
- [ ] Add assessor productivity metrics (assessments per day/week)
- [ ] Add assessment quality score based on completeness and photo documentation

### 7. Cost Analysis & Benchmarking
- [ ] Add cost per square foot analysis by building type
- [ ] Add cost comparison to industry benchmarks (RSMeans data)
- [ ] Add cost breakdown by repair type (routine, major, capital)
- [ ] Add cost variance analysis (estimated vs actual)
- [ ] Add cost efficiency metrics by contractor/vendor
- [ ] Add historical cost trend analysis with inflation adjustment

### 8. Risk Assessment Dashboard
- [ ] Add risk score matrix (likelihood x impact) for each asset
- [ ] Add risk heat map visualization across all assets
- [ ] Add safety-related deficiency prioritization panel
- [ ] Add compliance risk tracking (code violations, accessibility)
- [ ] Add environmental risk indicators (hazmat, water intrusion)
- [ ] Add insurance and liability risk scoring

### 9. Energy & Sustainability Metrics
- [ ] Add energy efficiency rating tracking per asset
- [ ] Add estimated energy savings from proposed upgrades
- [ ] Add carbon footprint impact analysis
- [ ] Add sustainability improvement recommendations
- [ ] Add utility cost projections based on component conditions
- [ ] Add green building certification tracking (LEED, BOMA BEST)

### 10. Photo Documentation Analytics
- [ ] Add photo coverage statistics (photos per component, per assessment)
- [ ] Add photo timeline showing condition progression
- [ ] Add before/after comparison viewer for repairs
- [ ] Add photo quality scoring (resolution, clarity, relevance)
- [ ] Add automated deficiency detection from photos (AI-powered)
- [ ] Add photo location mapping on floor plans

### 11. Compliance & Code Tracking
- [ ] Add building code compliance checklist status
- [ ] Add code violation tracking and resolution timeline
- [ ] Add accessibility compliance scoring (AODA, ADA)
- [ ] Add fire safety inspection status tracking
- [ ] Add permit and inspection schedule calendar
- [ ] Add regulatory deadline alerts and notifications

### 12. Comparative Asset Analysis
- [ ] Add side-by-side asset comparison tool
- [ ] Add asset ranking by FCI, condition, cost
- [ ] Add best/worst performing asset identification
- [ ] Add asset clustering by condition similarity
- [ ] Add peer group benchmarking within portfolio
- [ ] Add asset performance trends comparison chart

### 13. Work Order & Maintenance Integration
- [ ] Add work order status tracking dashboard
- [ ] Add maintenance backlog visualization
- [ ] Add preventive vs reactive maintenance ratio
- [ ] Add work order completion rate metrics
- [ ] Add maintenance cost tracking by asset/component
- [ ] Add contractor performance scorecards

### 14. Custom Report Builder
- [ ] Add drag-and-drop report section builder
- [ ] Add customizable chart and metric selection
- [ ] Add report template library (executive, technical, financial)
- [ ] Add scheduled report generation and email delivery
- [ ] Add multi-format export (PDF, Excel, PowerPoint)
- [ ] Add white-label report branding options

### 15. Interactive Data Explorer
- [ ] Add filterable data grid with all assessment data
- [ ] Add advanced search with multiple criteria
- [ ] Add data pivot table functionality
- [ ] Add custom calculated fields
- [ ] Add data export with selected columns
- [ ] Add saved views and filter presets

### Implementation Priority Order
- [ ] Phase 1 (High Priority): Features 1, 2, 4 - Core dashboard and FCI analytics
- [ ] Phase 2 (Medium Priority): Features 3, 5, 6 - Capital planning and lifecycle
- [ ] Phase 3 (Enhancement): Features 7, 8, 12 - Cost analysis and risk
- [ ] Phase 4 (Advanced): Features 9, 10, 11 - Sustainability and compliance
- [ ] Phase 5 (Power User): Features 13, 14, 15 - Integration and customization


## Complete Offline Integration

- [x] Integrate useOfflineAssessment hook into AssessmentDialog component
- [x] Integrate useOfflinePhoto hook into AssessmentDialog component
- [ ] Test offline assessment creation with photos (ready for user testing)
- [ ] Verify automatic sync when connection returns (ready for user testing)
- [x] Create checkpoint after successful offline integration

## APS (Autodesk Platform Services) Integration

### Phase 1: APS Credentials Setup
- [x] Configure APS Client ID via webdev_request_secrets
- [x] Configure APS Client Secret via webdev_request_secrets
- [x] Create APS authentication helper functions
- [x] Test APS token generation

### Phase 2: APS Viewer Enhancement
- [x] Review existing Forge Viewer implementation
- [x] Ensure proper APS authentication flow
- [x] Create ForgeViewer React component
- [x] Create ModelUpload component with APS integration
- [x] Create ModelViewerPanel component
- [ ] Test model loading with user's APS credentials (ready for testing)
- [ ] Verify markup/annotation tools work correctly (ready for testing)

### Phase 3: Model Upload & Management
- [x] Implement direct model upload to APS
- [x] Store model URNs in database (added APS fields to facility_models)
- [x] Link models to buildings/assets
- [x] Add model status tracking (processing, ready, failed)
- [x] Add translation status polling
- [x] Add retry translation functionality

### Phase 4: Testing & Documentation
- [x] Write vitest tests for APS authentication (3 tests passing)
- [x] Write vitest tests for APS service utilities (10 tests passing)
- [ ] Test full model upload workflow (ready for testing)
- [ ] Document APS integration setup
- [ ] Create checkpoint after APS integration


## 3D Model Delete Functionality (Dec 28, 2024)

- [ ] Add delete functionality for 3D models in Digital Twin section
- [ ] Create backend endpoint for model deletion
- [ ] Add delete confirmation dialog
- [ ] Update UI to show delete option in model list


## 3D Model Delete Functionality
- [x] Add delete functionality for 3D models in Digital Twin section (already implemented - verified working)

- [x] Bug: Deleted model still shows as 'Active' - need to refresh list after deletion
- [x] Bug: Revit file not loading in 3D viewer - Added 'Convert for Web Viewing' button and APS upload - still showing conversion prompt

## Fix APS Model Conversion Error (Dec 28, 2024)

- [x] Fix APS upload error: "Legacy endpoint is deprecated" (403) when uploading chunks
- [x] Update APS upload endpoint from deprecated legacy to current API (switched to S3 signed URL workflow)
- [ ] Test model conversion flow after fix - Ready for user testing

## Fix APS S3 Upload eTag Error (Dec 28, 2024)
- [x] Fix APS S3 upload error: eTag field type mismatch (400 error during Revit file conversion)
- [x] Investigate APS upload code to find where eTag is being sent incorrectly
- [x] Update code to send eTag as string array instead of object array (APS API expects simple string array)
- [ ] Test model conversion flow after fix - Ready for user testing


## Conversion Status Bar (Dec 28, 2024)

- [x] Add conversion status bar to show file conversion progress in 3D model viewer

## 3D Model Loading Bug (Dec 28, 2024)

- [x] Bug: Same 3D model is being loaded onto various assets under the same project - FIXED by adding assetId column to facility_models table and updating queries

## 3D Model Upload Issues (Dec 28, 2024)
- [x] Fix 3D model upload stopping when switching browser tabs
- [x] Add upload progress bar with percentage indicator

## 3D Model Delete Bug (Dec 28, 2024)
- [x] Fix 3D model delete not refreshing the list after deletion (toast shows success but model still visible)
