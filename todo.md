# Building Condition Assessment System - TODO

## Database Schema
- [x] Create projects table
- [x] Create building_components table (UNIFORMAT II)
- [x] Create assessments table
- [x] Create deficiencies table
- [x] Create photos table
- [x] Create cost_estimates table

## Core Features
- [x] Project management (create, list, view, edit)
- [x] UNIFORMAT II classification structure
- [x] Building component assessment interface
- [x] Deficiency recording system
- [x] Photo upload and management
- [x] Cost estimation calculator

## Reporting
- [x] Dashboard with project summary
- [ ] Generate BCA report (PDF) - Placeholder ready
- [x] Actions list with priorities
- [x] Cost breakdown by category

## UI/UX
- [x] Dashboard layout with navigation
- [x] Project creation form
- [x] Assessment data entry interface
- [x] Photo gallery component
- [ ] Report preview - Placeholder ready
- [x] Responsive design

## Testing
- [x] Test project CRUD operations
- [x] Test assessment workflow
- [ ] Test report generation - Pending implementation
- [x] Create checkpoint

## New Enhancements (Phase 2)

### Photo Management
- [x] Photo upload API with S3 storage
- [x] Photo gallery component with viewer
- [x] Photo tagging by component/deficiency
- [x] Thumbnail generation
- [x] Photo deletion functionality

### PDF Report Generation
- [x] Report template following Maben sample structure
- [x] Executive summary section
- [x] Building information section
- [x] Assessment findings by UNIFORMAT II
- [x] Deficiency tables with priorities
- [x] Cost summary and breakdown
- [x] Photo documentation section
- [x] PDF generation endpoint

### Export Functionality
- [x] CSV export for deficiencies
- [x] CSV export for assessments
- [x] Excel export with multiple sheets
- [x] Cost estimates export
- [x] Export buttons in UI

### Testing
- [x] Test photo upload and retrieval
- [x] Test PDF report generation
- [x] Test export functionality
- [x] Create final checkpoint

## New Features (Phase 3)

### AI-Powered Photo Assessment
- [x] Vision API integration for photo analysis
- [x] Automatic deficiency detection from photos
- [x] Severity assessment based on visual analysis
- [x] Component identification from images
- [x] Confidence scoring for AI assessments
- [x] Manual review and adjustment interface

### Photo Annotations & Markup
- [x] Drawing tools (arrows, rectangles, circles)
- [x] Text annotation capability
- [x] Color picker for markup
- [x] Undo/redo functionality
- [x] Save annotated images
- [x] Display annotations in gallery

### Scheduled Report Generation
- [ ] Schedule configuration interface - Schema ready, UI pending
- [ ] Automated report generation job - Requires cron setup
- [ ] Email delivery integration - Requires email service
- [ ] Report history tracking - Schema ready
- [ ] Schedule management (create, edit, delete) - Schema ready
- [ ] Notification preferences - Schema ready

### Mobile-Responsive Forms
- [x] Responsive assessment form layout
- [x] Touch-optimized controls
- [x] Mobile photo capture integration
- [ ] Offline data entry support - Requires PWA setup
- [ ] Progressive web app features - Requires service worker
- [x] Field-friendly UI improvements

### Testing
- [x] Test AI photo assessment accuracy
- [x] Test photo annotation tools
- [ ] Test scheduled report generation
- [x] Test mobile responsiveness
- [x] Create final checkpoint

## Bug Fixes

- [x] Fix React setState-in-render error in Home component

## UI Improvements

- [x] Add assessment dialog when clicking on building components
- [x] Include photo upload in assessment dialog
- [x] Add condition rating selector in dialog
- [x] Add observations field in dialog
- [x] Add remaining useful life input in dialog

## Assessment Format Updates (Maben Report Alignment)

- [x] Update condition rating to percentage-based format (e.g., Fair = 75-50% of ESL)
- [x] Change Expected Useful Life to Estimated Service Life (ESL)
- [x] Add Review Year field
- [x] Add Last Time Action field
- [x] Update database schema with new fields
- [x] Update assessment dialog UI
- [x] Update condition badge display

## Bug Fixes (Project Not Found)

- [x] Check database for existing projects
- [x] Fix error handling in project queries to return null instead of throwing
- [x] Add proper error boundaries in UI for missing projects
- [x] Redirect to projects list when project not found

## Bug Fixes (tRPC Undefined Error)

- [x] Update projects.get to throw TRPCError instead of returning undefined
- [x] Update frontend to catch and handle TRPCError
- [x] Test error handling with non-existent project IDs

## Bug Fixes (Console Error Suppression)

- [x] Add onError handler to suppress NOT_FOUND errors in console
- [x] Test that UI still shows error page correctly

## Bug Fixes (Components Not Loading)

- [x] Check if building_components table has data
- [x] Fix component loading query
- [x] Reseed UNIFORMAT II data if missing
- [x] Test complete assessment workflow end-to-end

## Project Edit and Delete Features

- [x] Add update project endpoint in backend
- [x] Add delete project endpoint in backend
- [x] Add edit button to project cards
- [x] Add delete button with confirmation dialog
- [x] Create edit project dialog/form
- [x] Handle cascade delete for related data (assessments, deficiencies, photos)
- [x] Test edit and delete functionality

## Bug Fixes (Navigation)

- [x] Remove placeholder "Page 2" navigation item from sidebar

## Bug Fixes (Project Card Navigation)

- [x] Fix project card click not navigating to project details
- [x] Ensure dropdown menu doesn't interfere with card click

## Bug Fixes (Project Card Navigation)

- [x] Fix project card click not navigating to project details
- [x] Ensure dropdown menu doesn't interfere with card click

## Assessment Enhancements

- [x] Add estimatedRepairCost field to assessments
- [x] Add replacementValue field to assessments
- [x] Add actionYear field to assessments
- [x] Update assessment dialog UI with new fields
- [x] Update backend to handle new assessment fields

## FCI and Dashboard Features

- [x] Add FCI (Facility Condition Index) calculation to projects
- [x] Create dashboard page with project summary
- [x] Display total replacement value
- [x] Display total repair costs
- [x] Show FCI percentage and rating
- [ ] Add condition distribution charts
- [x] Test FCI calculations and dashboard

## Gemini AI Image Interpretation Integration

- [x] Install @google/genai package
- [x] Create geminiService.ts with image analysis function
- [x] Add GEMINI_API_KEY to environment variables
- [x] Update photo upload endpoint to support AI analysis
- [x] Add AI analysis button to photo upload UI
- [x] Display AI-generated description, condition, and recommendations
- [x] Test AI image interpretation with sample photos
- [x] Create checkpoint with AI integration

## Separate Observations and Recommendations Fields

- [x] Add recommendations field to assessments table schema
- [x] Update backend to handle recommendations field
- [x] Split AssessmentDialog UI into separate Observations and Recommendations textareas
- [x] Update AI integration to populate observations and recommendations separately
- [x] Remove "AI Recommendation" and "AI Analysis" labels from output
- [x] Test the updated assessment workflow
- [x] Create checkpoint with separated fields

## Dashboard Enhancement - Import from Maben App

- [x] Analyze Maben app dashboard components
- [x] Create backend endpoint for financial planning data (5-year cost breakdown)
- [x] Create backend endpoint for condition matrix data
- [x] Build Financial Planning component (grouped bar chart + data table)
- [x] Build Condition Matrix component (color-coded table)
- [x] Build FCI Analysis gauge component (linear gradient gauge)
- [x] Integrate all components into dashboard page
- [x] Test dashboard with real project data
- [x] Create checkpoint with enhanced dashboard

## Fix Financial Planning Chart Y-Axis
- [x] Fix Y-axis formatter to show proper dollar values
- [x] Test chart with different value ranges
- [x] Create checkpoint with fix

## UI/UX Design Improvements
- [x] Audit current UI and document improvement areas
- [x] Enhance typography scale and hierarchy
- [x] Refine color palette and semantic colors
- [x] Improve spacing system and layout consistency
- [x] Polish component designs (cards, buttons, forms)
- [x] Add micro-interactions and transitions
- [x] Enhance dashboard visual appeal
- [x] Improve empty states and loading states
- [x] Add visual feedback for user actions
- [x] Test across different screen sizes
- [x] Create checkpoint with UI improvements

## Populate Test Project from Maben Report
- [x] Extract project details from PDF
- [x] Extract assessment data from PDF
- [x] Create seed script to populate database
- [x] Run seed script and verify data

## Fix Report and Edit Features
- [x] Investigate current report generation implementation
- [x] Investigate edit assessment functionality issues
- [x] Fix edit assessment dialog to load existing data
- [x] Fix edit assessment save functionality
- [x] Implement proper report generation matching Maben format
- [x] Add all required report sections (dashboard, components, photos)
- [x] Test report generation with sample project
- [x] Test edit functionality with existing assessments
- [x] Create checkpoint with fixes

## Fix Dashboard Edit Feature
- [x] Investigate edit button on dashboard/project detail page
- [x] Fix edit button to properly pass existing assessment data
- [x] Test edit from dashboard UI
- [x] Create checkpoint with fix

## Fix Project Edit Button
- [x] Implement project edit dialog with form
- [x] Wire up Edit button to open dialog
- [x] Test project editing functionality
- [x] Verify assessment edit buttons are visible in Assessments tab
- [x] Create checkpoint with complete edit functionality

## Add Photos to Report
- [x] Update report generator to fetch assessment photos
- [x] Display photos in each assessment section of the report
- [x] Test report generation with photos
- [x] Create checkpoint with photo-enabled reports

## Debug Photos Not Showing in PDF Reports
- [x] Check if photos are being fetched from database
- [x] Check if photo data is being passed to report generator
- [x] Debug jsPDF image rendering
- [x] Fix photo rendering in PDF
- [x] Test with real project data
- [x] Create checkpoint with working photos
- [x] Fix duplicate handleSave function definition causing server errors
- [x] Clean up AssessmentDialog to use only async photo linking approach

## Fix Photos Not Appearing in Generated Reports
- [x] Investigate report generation code
- [x] Check if getAssessmentPhotos is being called
- [x] Verify photo URLs are valid in database
- [x] Test report generation with project that has photos
- [x] Fix photo rendering in PDF - converted to fetch images and use base64 data URLs
- [x] Verify photos appear in generated report - confirmed working!
- [x] Create checkpoint with working photo reports

## Flexible UNIFORMAT II Asset Hierarchy System
- [x] Design database schema for hierarchy templates and configurations
- [x] Create hierarchyTemplates table with UNIFORMAT II structure
- [x] Create projectHierarchyConfig table for per-project overrides
- [x] Add component weighting and priority fields
- [x] Implement backend tRPC procedures for hierarchy CRUD operations
- [x] Build global hierarchy settings page (admin only)
- [x] Build per-project hierarchy customization UI
- [x] Add hierarchy depth configuration (Level 1-4)
- [x] Add component weighting/priority controls
- [x] Integrate hierarchy into assessment component selection
- [x] Write tests for hierarchy system - 8 tests passing
- [x] Create checkpoint with hierarchy feature

## Industry-Standard Condition Rating Scales
- [x] Design database schema for rating scales (FCI, CI, custom)
- [x] Create ratingScales table for global rating configurations
- [x] Create projectRatingConfig table for per-project overrides
- [x] Add numerical scoring fields to assessments table
- [x] Add overall building condition rating to projects table
- [x] Implement backend tRPC procedures for rating scale CRUD
- [x] Build rating scale configuration UI (admin)
- [x] Create predefined rating scales (10-point FCI, numerical CI) via seed script
- [x] Add project rating configuration tab
- [ ] Update assessment form to use configured rating scales
- [ ] Implement deficiency priority rating system (deferred - use priority scale in deficiency form)
- [x] Build overall building condition calculation logic
- [x] Add building condition dashboard widget
- [x] Write tests for rating system - 5 tests passing
- [x] Add OverallConditionWidget to ProjectDashboard
- [x] Create checkpoint with rating system

## Full Audit Trail and Version Control System
- [x] Design audit trail database schema
- [x] Create audit_log table for tracking all changes
- [x] Create entity_versions tables for assessments, deficiencies, projects
- [x] Implement audit trail tRPC procedures
- [x] Add manual audit logging capability
- [x] Build version history viewer UI component
- [x] Build audit trail dashboard for admins
- [ ] Add compare versions functionality (deferred)
- [ ] Implement rollback to previous version (deferred)
- [ ] Add periodic database backup system (deferred)
- [x] Write tests for audit trail system - 6 tests passing
- [x] Create checkpoint with audit trail feature

## Assessment Status Filter
- [x] Add status field to assessments table (initial, active, completed)
- [x] Update assessment schema in drizzle/schema.ts
- [x] Add status filter to backend queries
- [x] Add statusCounts procedure to get assessment counts by status
- [x] Build status filter UI component
- [x] Add status cards showing counts (Active, Completed, Initial)
- [x] Integrate filter into ProjectDetail assessments tab
- [x] Update assessment form to allow status changes
- [x] Write tests for status filtering - 3 tests passing
- [x] Create checkpoint with status filter feature

## Status Badges in Assessment List
- [x] Add colored status badges to assessment list items
- [x] Use blue for initial, orange for active, green for completed
- [x] Position badges next to condition badges
- [x] Test visual appearance
- [x] Create checkpoint

## Bulk Status Updates
- [x] Add checkbox selection to assessment list
- [x] Add bulk action toolbar when items selected
- [x] Implement bulk status change mutation
- [x] Test bulk status updates

## Automatic Status Change Audit Logging
- [x] Integrate audit logging into assessment upsert
- [x] Detect status changes and log them
- [x] Include old and new status in audit log
- [x] Test audit logging for status changes

## Assessment Progress Dashboard Widget
- [x] Create progress chart component
- [x] Calculate status distribution percentages
- [x] Add visual progress bar with percentages
- [x] Integrate into project dashboard
- [x] Test progress widget display

## Final Testing and Delivery
- [x] Run all tests - 68 tests passing
- [x] Create checkpoint with all three features

## Building Extensions and Additions Management
- [x] Design database schema for building sections/extensions
- [x] Create buildingSections table with install dates and lifecycle info
- [x] Add sectionId foreign key to assessments table
- [x] Implement backend CRUD APIs for building sections
- [x] Add section-specific stats and FCI calculation APIs
- [x] Build UI for creating/editing building sections
- [x] Add sections tab to project detail page
- [ ] Add section selector to assessment workflow (deferred)
- [x] Implement section-specific FCI calculations
- [ ] Add section lifecycle tracking and reporting (deferred)
- [ ] Update PDF reports to show section breakdown (deferred)
- [x] Write tests for building sections feature - 5 tests passing
- [x] Create checkpoint with building sections feature
## Integrated Media Capture with Geolocation and Floor Plans
- [x] Design database schema for enhanced media metadata
- [x] Add geolocation fields (latitude, longitude, altitude, accuracy) to photos table
- [x] Add OCR text recognition fields to photos table
- [x] Create floorPlans table for digital floor plan management
- [x] Add floor plan coordinates (x, y) to photos for pinning
- [ ] Implement geolocation capture from device GPS
- [ ] Integrate OCR text recognition for captured photos
- [ ] Build floor plan upload and management UI
- [ ] Create interactive floor plan viewer with photo/video pins
- [ ] Add drag-and-drop photo positioning on floor plans
- [ ] Integrate enhanced media capture into assessment workflow
- [ ] Add geolocation map view for photos
- [ ] Write tests for media capture features
- [ ] Create checkpoint with integrated media capture system

## Integrated Media Capture with Geolocation and OCR

### Database Schema
- [x] Add geolocation fields to photos table (latitude, longitude, altitude, locationAccuracy)
- [x] Add OCR fields to photos table (ocrText, ocrConfidence)
- [x] Add floor plan fields to photos table (floorPlanId, floorPlanX, floorPlanY)
- [x] Create floor_plans table with project association
- [x] Push database schema changes

### Backend Implementation
- [x] Update photos.upload tRPC endpoint to accept geolocation parameters
- [x] Update photos.upload to accept performOCR flag
- [x] Create OCR service using Gemini Vision API
- [x] Integrate OCR processing into photo upload workflow
- [x] Convert numeric geolocation values to decimal strings for database storage
- [x] Return OCR results in photo upload response

### Frontend Implementation
- [x] Add photoGeolocation state to AssessmentDialog
- [x] Capture GPS coordinates using browser Geolocation API when photo is selected
- [x] Request location permissions from user
- [x] Display toast notifications for location capture status
- [x] Pass geolocation data to photo upload mutation
- [x] Enable OCR processing for all uploaded photos
- [x] Reset geolocation state when photo is removed

### Testing
- [x] Create comprehensive test suite for geolocation and OCR
- [x] Test geolocation data capture and storage
- [x] Test OCR text extraction from images
- [x] Test combined geolocation and OCR workflow
- [x] Verify all 76 tests passing

### Next Steps
- [ ] Build floor plan management UI (upload, view, list)
- [ ] Create floor plan viewer component
- [ ] Display geolocation data in photo galleries
- [ ] Display OCR extracted text in photo details
- [ ] Add geolocation and OCR data to PDF reports
- [ ] (Future) Implement interactive floor plan pinning with drag-and-drop

## Flexible Data Input with Intelligent Validation

### Database Schema
- [x] Create validation_rules table for configurable business rules
- [x] Add rule types: date_range, numeric_range, required_field, custom_logic, same_year_inspection
- [x] Add severity levels: error (blocking), warning (guidance), info (suggestion)
- [x] Add override tracking fields to assessments table (hasValidationOverrides, validationWarnings)
- [x] Create validation_overrides table to log when users override warnings
- [x] Push database schema changes

### Backend Implementation
- [x] Create validation rules engine service (validationService.ts)
- [x] Implement date validation logic (allow same-year inspections with warning)
- [x] Implement numeric range validation (ESL, costs, etc.)
- [x] Create validation.check tRPC endpoint
- [x] Create validation rules CRUD endpoints (list, create, update, delete, toggle)
- [x] Add override logging to assessment mutations
- [x] Return validation results with severity levels
- [x] Seed default validation rules (5 rules including same-year inspection)

### Frontend Implementation
- [x] Create ValidationWarning component for displaying guidance
- [x] Update AssessmentDialog to check validation before save
- [x] Add "Proceed Anyway" button for overridable warnings
- [x] Display override justification field when proceeding with warnings
- [x] Show validation warnings in dialog before save
- [x] Track validation overrides in assessment save
- [ ] Show validation feedback in real-time as user types (future enhancement)
- [ ] Add validation status indicators to form fields (future enhancement)

### Admin Interface
- [ ] Create ValidationRulesManager component at /admin/validation-rules
- [ ] Build rule creation/edit form
- [ ] Add rule enable/disable toggle UI
- [ ] Show validation rule usage statistics
- [ ] Add rule testing interface

### Testing
- [x] Test date validation with same-year inspections
- [x] Test numeric range validation (negative useful life, zero ESL)
- [x] Test override workflow with justification logging
- [x] Test validation rule CRUD operations (create, list, toggle, delete)
- [x] Verify warnings don't block data entry (canOverride flag)
- [x] Test admin-only access to rule management
- [x] Test saving assessments with validation overrides
- [x] All 87 tests passing (11 new validation tests)
- [x] Create checkpoint

## Extended Text Fields with Rich Text Formatting & Historical Log

### Database Schema
- [x] Create component_history table for permanent lifecycle log
- [x] Add fields: timestamp, userId, changeType, fieldName, oldValue, newValue, richTextContent
- [x] Add indexes for efficient querying by componentCode and timestamp
- [x] Text fields in assessments support rich text HTML (observations, recommendations)
- [x] Push database schema changes

### Rich Text Editor Integration
- [x] Install TipTap rich text editor library
- [x] Create RichTextEditor component with formatting toolbar
- [x] Support: bold, italic, headings, lists (bullet/numbered), links, undo/redo
- [x] Replace textarea fields in AssessmentDialog with RichTextEditor (observations, recommendations)
- [x] Create RichTextDisplay component for read-only rendering
- [x] Backend accepts and stores HTML content
- [x] Sanitize HTML on backend to prevent XSS attacks (sanitize-html library)
- [ ] Replace textarea fields in DeficiencyDialog with RichTextEditor (future enhancement)

### Historical Log System
- [x] Create componentHistoryService to track all text field changes
- [x] Log changes when assessments are created/updated
- [x] Detect field-level changes with detectChanges utility
- [x] Store user ID, userName, and timestamp with each log entry
- [x] Create tRPC endpoints to retrieve historical logs (component, project, search)
- [x] Support filtering by change type, user, date range
- [x] Support search across summary, content, and values
- [ ] Log changes when deficiencies are created/updated (future enhancement)
- [ ] Implement visual diff algorithm to highlight changes (future enhancement)

### Asset Lifecycle Timeline UI
- [x] Create ComponentHistoryTimeline component
- [x] Display chronological list of all changes to a component
- [x] Show formatted rich text content in collapsible timeline entries
- [x] Add filters: by change type
- [x] Add search functionality across historical content
- [x] Show timestamps and user names for each entry
- [x] Color-coded badges for different change types
- [x] Expandable entries to show old/new values and rich text
- [ ] Add "View History" button to component detail pages (future integration)
- [ ] Add history panel to AssessmentDialog (future enhancement)
- [ ] Export historical log to PDF reports (future enhancement)

### Testing
- [x] Test rich text editor saves formatted content
- [x] Test HTML sanitization prevents XSS (script tags, onclick, javascript: links)
- [x] Test historical log captures assessment creation
- [x] Test historical log captures assessment updates with field changes
- [x] Test sanitization of rich text in history entries
- [x] Test component-specific history retrieval
- [x] Test project-wide history retrieval
- [x] Test search and filter functionality
- [x] Test authentication requirements for history access
- [x] Test user isolation (can't access other users' history)
- [x] All 107 tests passing (20 new rich text/history tests)
- [x] Create checkpoint


## 3rd Party Consultant Data Upload System with Review Workflow

### Database Schema
- [ ] Create consultant_submissions table for tracking upload batches
- [ ] Create submission_items table for staging individual records (assessments, deficiencies, photos)
- [ ] Add status field: pending_review, approved, rejected, finalized
- [ ] Add reviewer fields: reviewedBy, reviewedAt, reviewNotes
- [ ] Add consultant info: submittedBy, consultantName, consultantEmail
- [ ] Create submission_photos table for staging uploaded photos
- [ ] Add validation_errors field for storing parsing/validation issues
- [ ] Push database schema changes

### Spreadsheet Template System
- [ ] Install xlsx library for Excel generation and parsing
- [ ] Create template generator for assessments (component code, condition, costs, etc.)
- [ ] Create template generator for deficiencies (description, priority, location, etc.)
- [ ] Add data validation rules to templates (dropdowns, number ranges)
- [ ] Add instructions sheet with field descriptions and examples
- [ ] Create parser to read uploaded Excel/CSV files
- [ ] Validate data against schema and business rules
- [ ] Handle parsing errors gracefully with detailed error messages

### Consultant Upload Portal
- [ ] Create ConsultantUploadPage component at /consultant/upload
- [ ] Add project selection dropdown
- [ ] Add "Download Template" buttons for assessments and deficiencies
- [ ] Create file upload area with drag-and-drop support
- [ ] Show upload progress and validation results
- [ ] Display preview of parsed data before submission
- [ ] Allow photo attachments linked to specific rows
- [ ] Create submission summary with item counts
- [ ] Generate unique submission ID for tracking

### Staging & Preview
- [ ] Store uploaded data in submission_items table (not production tables)
- [ ] Parse and validate all rows, flag errors
- [ ] Allow consultants to fix errors and resubmit
- [ ] Show validation warnings (non-blocking) vs errors (blocking)
- [ ] Preview parsed data in table format with edit capability
- [ ] Link photos to specific submission items
- [ ] Calculate summary statistics (total items, total cost, etc.)

### City Personnel Review Dashboard
- [ ] Create ReviewDashboard component at /admin/review
- [ ] List all pending submissions with metadata (consultant, date, project, item count)
- [ ] Show submission details with expandable item list
- [ ] Display side-by-side comparison: submitted data vs existing data (if updating)
- [ ] Add approve/reject buttons for individual items
- [ ] Add bulk approve/reject for entire submission
- [ ] Add review notes/comments field
- [ ] Show validation warnings and allow override
- [ ] Preview photos before approval

### Approval Workflow
- [ ] Create approval mutation that moves data from staging to production
- [ ] Update submission status: pending_review → approved → finalized
- [ ] Record reviewer ID and timestamp
- [ ] Send notification to consultant when submission is approved/rejected
- [ ] Create audit log entry for each approval/rejection
- [ ] Handle partial approvals (some items approved, some rejected)
- [ ] Allow consultants to view submission status and feedback

### User Roles & Permissions
- [ ] Add "consultant" role to user schema
- [ ] Restrict upload portal to consultant role
- [ ] Restrict review dashboard to admin/city_staff role
- [ ] Consultants can only view their own submissions
- [ ] City staff can view all submissions for their projects

### Notifications & Communication
- [ ] Email consultant when submission is received
- [ ] Email consultant when submission is approved/rejected
- [ ] Email city staff when new submission needs review
- [ ] Show in-app notifications for pending reviews
- [ ] Add comments/feedback thread on submissions

### Testing
- [ ] Test Excel template generation with validation rules
- [ ] Test parsing valid spreadsheet data
- [ ] Test parsing invalid data and error handling
- [ ] Test photo upload and linking
- [ ] Test submission workflow end-to-end
- [ ] Test approval workflow (approve, reject, partial)
- [ ] Test role-based access control
- [ ] Test bulk operations
- [ ] Test notification delivery
- [ ] Create checkpoint


## 3rd Party Consultant Data Upload System

### Database Schema
- [x] Create consultant_submissions table (track uploads)
- [x] Create submission_items table (individual data rows)
- [x] Create submission_photos table (uploaded photos)
- [x] Add status workflow: pending_review → under_review → approved/rejected → finalized
- [x] Add tracking fields: submissionId, trackingId, submittedBy, reviewedBy, reviewNotes
- [x] Push database schema changes

### Spreadsheet Template System
- [x] Install xlsx library for Excel operations
- [x] Create assessment template generator with validation rules
- [x] Create deficiency template generator with validation rules
- [x] Add instructions sheet explaining required/optional fields
- [x] Add data validation dropdowns for enum fields (condition, priority, status)
- [x] Create template download endpoints (tRPC)
- [x] Templates include: componentCode, condition, observations, recommendations, costs, ESL, etc.

### Spreadsheet Parser
- [x] Create parser for assessment spreadsheets (parseAssessmentSpreadsheet)
- [x] Create parser for deficiency spreadsheets (parseDeficiencySpreadsheet)
- [x] Validate required fields (componentCode, condition, title, description, priority)
- [x] Validate enum values (condition: excellent/good/fair/poor/critical)
- [x] Validate numeric fields (costs, years, ESL, RUL)
- [x] Return structured validation results with row numbers
- [x] Support error, warning, and valid status levels

### Upload Portal (Consultant UI)
- [x] Create ConsultantUploadPage at /consultant/upload
- [x] Add template download buttons (assessment & deficiency)
- [x] Add project selector dropdown
- [x] Add data type selector (assessment/deficiency)
- [x] Create file upload component with drag-and-drop
- [x] Show upload progress and validation results
- [x] Display submission tracking ID and item counts
- [x] Show submission history with status badges (pending/approved/rejected/finalized)
- [x] Add route to App.tsx

### Review Dashboard (City Personnel UI)
- [x] Create ReviewDashboard at /admin/review
- [x] List pending submissions with consultant info (name, email, date)
- [x] Show submission details: file name, tracking ID, item counts
- [x] Preview uploaded data in expandable cards
- [x] Show validation status for each row (valid/warning/error with icons)
- [x] Add approve/reject buttons (admin only)
- [x] Add review notes textarea (required for rejection)
- [x] Show summary stats (valid/warnings/errors)
- [x] Add route to App.tsx
- [ ] Implement bulk approve/reject (future enhancement)

### Backend API (tRPC)
- [x] consultant.downloadAssessmentTemplate (returns base64 Excel)
- [x] consultant.downloadDeficiencyTemplate (returns base64 Excel)
- [x] consultant.uploadSpreadsheet (parse, validate, store in staging)
- [x] consultant.mySubmissions (consultant's own submissions)
- [x] consultant.getSubmission (detail view with items)
- [x] consultant.pendingSubmissions (admin only, status=pending_review)
- [x] consultant.approveSubmission (admin only, finalize data)
- [x] consultant.rejectSubmission (admin only, with required notes)
- [x] Add consultant router to routers.ts

### Approval Workflow
- [x] Validate submission status before approval
- [x] Create assessment records from approved items (all valid items)
- [x] Create deficiency records from approved items (map priority: high→short_term)
- [x] Link submission items to finalized records (finalizedRecordId)
- [x] Update submission status to "finalized"
- [x] Log reviewer ID and timestamp (reviewedBy, reviewedAt)
- [x] Store review notes for audit trail
- [ ] Send notification to consultant on approval/rejection (future enhancement)

### Testing
- [x] Test template generation (valid Excel files with Instructions + Data sheets)
- [x] Test spreadsheet parsing (valid assessment and deficiency data)
- [x] Test validation (missing required fields, invalid enum values)
- [x] Test upload workflow (consultant uploads, gets tracking ID)
- [x] Test review workflow (admin lists pending, views details)
- [x] Test approval creates actual assessment/deficiency records
- [x] Test rejection with required notes
- [x] Test access control (admin-only endpoints throw errors)
- [x] Test submission tracking and history (mySubmissions)
- [x] Test consultant can only see own submissions
- [x] Test error handling (invalid files, non-existent projects)
- [x] All 128 tests (21 new consultant upload tests, 127 passing, 1 flaky Gemini test)
- [x] Create checkpoint


## Predictive Analytics & AI/ML Deterioration Modeling

### Database Schema
- [x] Create deterioration_curves table for Best/Design/Worst scenarios
- [x] Add 6 configurable parameters per curve (param1-param6 for years 0-5)
- [x] Create component_deterioration_config table (per-component curve assignments)
- [x] Create prediction_history table (track predictions over time)
- [x] Add confidence_score, prediction_method, model_version fields
- [x] Push database schema changes

### Deterioration Curve Models
- [x] Define curve parameter structure (CurveParameters interface with 6 params)
- [x] Create default Best/Design/Worst curves for 5 component types (B30, B20, D30, D20, D50)
- [x] Implement linear interpolation algorithm
- [x] Implement polynomial interpolation (Lagrange method)
- [x] Implement exponential decay interpolation
- [x] Calculate remaining service life from current condition
- [x] Predict failure year based on curve trajectory
- [x] Support custom curve creation per component
- [x] Generate 30-year curve projection data for visualization

### ML Prediction Engine
- [x] Create mlPredictionService.ts with AI-powered predictions
- [x] Calculate deterioration rate from historical assessment data
- [x] Estimate current condition with trend extrapolation
- [x] Predict failure year using linear trend projection
- [x] Determine risk level (low/medium/high/critical)
- [x] Add prediction confidence scoring based on data quality
- [x] Use LLM (Gemini) for generateAIInsights (3-5 actionable recommendations)
- [x] Implement analyzeComponentPatterns for portfolio-wide analysis

### Historical Pattern Analysis
- [x] Analyze deterioration trends from historical assessments
- [x] Identify accelerated deterioration components (rate > 4% per year)
- [x] Identify stable components (rate < 1.5% per year)
- [x] Calculate average deterioration rate across component portfolio
- [x] Generate AI insights from historical patterns
- [ ] Visualize deterioration trajectories (UI pending)
- [ ] Compare actual vs predicted deterioration (UI pending)

### Interactive Curve Editor UI
- [ ] Create DeteriorationCurveEditor component
- [ ] Add visual curve chart (line chart with 3 curves)
- [ ] Add 6 input fields per curve (editable year parameters)
- [ ] Show real-time curve updates as parameters change
- [ ] Add preset curve templates (dropdown)
- [ ] Add "Reset to Default" button
- [ ] Show predicted failure year on chart
- [ ] Add current condition marker on curve

### Prediction Dashboard
- [ ] Create PredictionDashboard page
- [ ] Show components at risk (sorted by predicted failure year)
- [ ] Display confidence scores for predictions
- [ ] Add filters (component type, risk level, timeframe)
- [ ] Show deterioration trend charts
- [ ] Add export predictions to CSV/Excel

### What-If Scenario Analysis
- [ ] Create scenario comparison tool
- [ ] Allow users to adjust maintenance timing
- [ ] Show impact on component lifecycle
- [ ] Calculate cost implications of different strategies
- [ ] Compare multiple scenarios side-by-side
- [ ] Generate scenario reports

### Backend API (tRPC)
- [x] predictions.component (get prediction for single component with method selection)
- [x] predictions.project (get predictions for all components)
- [x] predictions.createCurve (create custom curve)
- [x] predictions.updateCurve (edit curve parameters)
- [x] predictions.curves (list available curves with filters)
- [x] predictions.history (get prediction history)
- [x] Add predictions router to routers.ts
- [x] Database helper functions (getDeteriorationCurves, savePredictionHistory, etc.)
- [x] Support curve/ml/hybrid prediction methods

### Testing
- [ ] Test curve interpolation algorithms (linear, polynomial, exponential)
- [ ] Test ML model predictions with various data patterns
- [ ] Test curve parameter editing and saving
- [ ] Test historical pattern analysis
- [ ] Test confidence score calculations
- [ ] Test prediction history tracking
- [ ] Create checkpoint
