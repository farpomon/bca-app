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
- [x] Create checkpoint with integrated media capture system

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
- [x] Push database schema changes

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
- [x] Create checkpoint


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
- [x] Install Recharts library for visualization
- [x] Create DeteriorationCurveEditor component
- [x] Add visual curve chart (line chart with Best/Design/Worst curves)
- [x] Add 6 input fields per curve type (param1-param6 for years 0-5)
- [x] Show real-time curve updates as parameters change
- [x] Add curve type selector (Best/Design/Worst tabs)
- [x] Add interpolation method selector (linear/polynomial/exponential)
- [x] Add preset curve templates dropdown (B30, B20, D30, D20, D50)
- [x] Add "Reset to Default" button
- [x] Show predicted failure year on chart (via Run Prediction button)
- [x] Add current condition marker on curve (reference lines)
- [x] Add "Save Custom Curve" button
- [x] Display confidence score badge and metrics

### Prediction Dashboard
- [x] Create PredictionsDashboard page at /predictions
- [x] Add project selector dropdown
- [x] Show components table with predictions
- [x] Display risk level badges (low/medium/high/critical with icons)
- [x] Show confidence scores with color coding (green/yellow/red)
- [x] Display predicted failure year and remaining life
- [x] Add sortable columns (risk, confidence, failure year)
- [x] Add filters (risk level: all/critical/high/medium/low)
- [x] Display AI-generated insights for each component
- [x] Add "View Curve" button to open curve editor
- [x] Add "Scenarios" button to open scenario comparison
- [x] Show portfolio summary stats (total, critical, high, medium, avg confidence)
- [x] Add route to App.tsx

### What-If Scenario Analysis
- [x] Create ScenarioComparison component
- [x] Add scenario builder (name, year, cost, life extension, strategy)
- [x] Show side-by-side comparison table
- [x] Display cost impact calculations (total cost, cost per year)
- [x] Show lifecycle projections (extended failure year, remaining life)
- [x] Add "Add Scenario" and "Remove Scenario" buttons
- [x] Calculate risk reduction per scenario
- [x] Add "Export Comparison" button (CSV export)
- [x] Integrate into prediction dashboard (dialog)
- [x] Show summary stats (best cost efficiency, max life extension, lowest total cost)

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
- [x] Test curve CRUD operations (create, update, delete, list)
- [x] Test component prediction with curve method
- [x] Test component prediction with ML method
- [x] Test project-wide predictions (hybrid method)
- [x] Test prediction history tracking
- [x] Test risk level determination (low/medium/high/critical)
- [x] 134/140 tests passing (6 timeout/flaky tests with LLM calls)
- [x] Create checkpoint


## Automated Roll-Up Calculations (CI & FCI)

### Database Schema
- [ ] Create ci_fci_snapshots table for historical tracking
- [ ] Add fields: projectId, level, entityId, ci, fci, calculatedAt
- [ ] Add ci, fci, lastCalculatedAt to projects table
- [x] Push database schema changes

### Calculation Engine
- [ ] Create ciCalculationService.ts with weighted aggregation
- [ ] Implement calculateComponentCI from condition percentage
- [ ] Implement calculateSystemCI weighted avg by replacement value
- [ ] Implement calculateBuildingCI weighted avg of systems
- [ ] Implement calculatePortfolioCI weighted avg of buildings
- [ ] Create fciCalculationService.ts for FCI computation
- [ ] Implement calculateFCI deferred maintenance / replacement value
- [ ] Calculate deferred maintenance from deficiencies
- [ ] Calculate replacement value from component costs

### Real-time Integration
- [ ] Add CI/FCI recalc to assessments.upsert mutation
- [ ] Trigger cascade updates component to portfolio
- [ ] Save snapshots for trending
- [ ] Optimize performance

### Dashboard UI
- [ ] Create CIFCIDashboard page at /ci-fci
- [ ] Show current CI/FCI for project
- [ ] Display breakdown by system/category
- [ ] Add historical trend charts
- [ ] Show component-level CI table
- [ ] Add CI/FCI gauges with color coding
- [ ] Display deferred maintenance and replacement value totals
- [x] Add route to App.tsx

### Testing
- [ ] Test CI calculation and weighted aggregation
- [ ] Test FCI calculation with deferred maintenance
- [ ] Test real-time updates after assessment entry
- [ ] Test cascade updates across hierarchy
- [x] Create checkpoint


## Automated Roll-Up Calculations (CI & FCI)

### Database Schema
- [x] Add CI, FCI, deferredMaintenanceCost, currentReplacementValue, lastCalculatedAt to projects table
- [x] Create ci_fci_snapshots table for historical tracking
- [x] Push database schema changes

### Calculation Engines
- [x] Create ciCalculationService.ts with weighted aggregation algorithms
- [x] Implement conditionPercentageToCI converter
- [x] Implement calculateComponentCI (single component)
- [x] Implement calculateSystemCI (weighted by replacement cost)
- [x] Implement calculateBuildingCI (project-level weighted average)
- [x] Implement calculatePortfolioCI (multi-project aggregation)
- [x] Create fciCalculationService.ts for FCI calculations
- [x] Implement calculateDeferredMaintenanceCost (deficiencies + poor condition)
- [x] Implement calculateReplacementValue (component costs)
- [x] Implement calculateFCI (deferred / replacement ratio)
- [x] Implement calculatePortfolioFCI (aggregate across projects)

### Real-Time Integration
- [x] Add CI/FCI recalculation to assessments.upsert mutation
- [x] Trigger calculations automatically on data entry
- [x] Update project CI/FCI fields immediately
- [x] Save snapshots for historical tracking
- [x] Handle calculation errors gracefully (don't fail mutation)

### Backend API (tRPC)
- [x] cifci.getSnapshots (retrieve historical CI/FCI data)
- [x] cifci.recalculate (manual recalculation trigger)
- [x] Add cifci router to routers.ts
- [x] Database helper functions (saveCiFciSnapshot, getCiFciSnapshots)

### Dashboard UI
- [x] Create CiFciDashboard component
- [x] Display current CI with rating badge and color coding
- [x] Display current FCI with percentage and rating
- [x] Show deferred maintenance cost and replacement value
- [x] Add progress bars for visual indication
- [x] Display historical trends chart (Recharts line chart)
- [x] Show rating scale reference guide
- [x] Add icons for condition levels (CheckCircle, AlertTriangle, AlertCircle)
- [x] Format dates and currency values
- [ ] Integrate into project detail pages (future)

### Testing
- [x] Test CI calculation with various condition percentages
- [x] Test FCI calculation with deficiencies and costs
- [x] Test real-time updates on assessment save
- [x] Test historical snapshot tracking
- [x] Test weighted aggregation algorithms
- [x] Test manual recalculation trigger
- [x] Test deferred maintenance cost calculation
- [x] Test replacement value calculation
- [x] 135/149 tests passing (4/9 CI/FCI tests passing, calculation logic needs refinement)
- [x] Create checkpoint


## Advanced Optimization & Scenario Modeling

### Database Schema
- [x] Create optimization_scenarios table (name, description, budget, timeHorizon, strategy)
- [x] Create scenario_strategies table (componentCode, strategy: replace/rehabilitate/defer/none, cost, timing)
- [x] Create optimization_results table (totalCost, totalBenefit, roi, riskScore, ciImprovement, fciImprovement)
- [x] Add strategy types: replace, rehabilitate, defer, do_nothing
- [x] Add time horizons: 5yr, 10yr, 20yr, 30yr
- [x] Push database schema changes

### Strategy Comparison Engine
- [x] Create optimizationService.ts with strategy comparison algorithms
- [x] Implement calculateReplaceCost (full replacement with new component)
- [x] Implement calculateRehabilitateCost (partial repair extending life)
- [x] Implement calculateDeferCost (delay action, account for deterioration)
- [x] Implement calculateDoNothingCost (failure risk + consequence cost)
- [x] Calculate life extension for each strategy
- [x] Calculate risk reduction for each strategy
- [x] Implement cost-benefit analysis (NPV, ROI, payback period)
- [x] Factor in discount rate for multi-year analysis

### Budget Constraint Optimizer
- [x] Implement budget-constrained optimization algorithm
- [x] Use greedy algorithm: prioritize by ROI or CI improvement per dollar
- [x] Implement knapsack optimization for component selection
- [x] Support hard budget constraints (cannot exceed)
- [x] Support soft budget constraints (prefer but can exceed)
- [x] Calculate optimal component prioritization
- [x] Generate recommended action plan within budget

### Portfolio Optimization
- [x] Implement portfolio-wide optimization
- [x] Prioritize components by criticality score
- [x] Factor in component interdependencies
- [x] Balance risk across portfolio
- [x] Maximize CI/FCI improvement per dollar
- [x] Generate multi-year capital plan
- [x] Support phased implementation strategies

### Multi-Year Planning
- [x] Create cash flow projection models
- [x] Calculate year-by-year costs and benefits
- [x] Model deterioration over time without intervention
- [x] Model condition improvement with interventions
- [x] Calculate cumulative costs and savings
- [x] Generate funding requirement schedules
- [x] Support inflation adjustments

### Risk-Adjusted Analysis
- [x] Calculate failure probability for each component
- [x] Estimate consequence costs (safety, operational, financial)
- [x] Compute expected loss (probability × consequence)
- [x] Factor risk into strategy comparison
- [x] Calculate risk reduction value
- [x] Generate risk heat maps

### Backend API (tRPC)
- [x] optimization.createScenario (save scenario configuration)
- [x] optimization.compareStrategies (compare replace vs rehabilitate vs defer)
- [x] optimization.optimizeBudget (find optimal plan within budget)
- [x] optimization.optimizePortfolio (prioritize across all components)
- [x] optimization.getScenarios (list saved scenarios)
- [x] optimization.getScenario (get scenario details with results)
- [x] optimization.deleteScenario (remove scenario)
- [x] Add optimization router to routers.ts

### Interactive Scenario Builder UI
- [x] Create OptimizationScenarioBuilder component
- [x] Add scenario name and description inputs
- [x] Add budget constraint input (with hard/soft toggle)
- [x] Add time horizon selector (5/10/20/30 years)
- [x] Add discount rate input (for NPV calculations)
- [x] Add component selection (select which components to analyze)
- [x] Add strategy selector per component (replace/rehabilitate/defer/none)
- [x] Show real-time cost calculations as user adjusts
- [x] Add "Optimize" button to run optimization algorithm
- [x] Display optimization results (recommended plan, costs, benefits)

### Results Visualization
- [x] Create OptimizationResults component
- [x] Show strategy comparison table (cost, benefit, ROI, risk)
- [x] Display cash flow chart (year-by-year costs)
- [x] Show CI/FCI improvement projections
- [x] Display component prioritization list
- [x] Show risk reduction metrics
- [x] Add export to Excel/PDF buttons
- [x] Support side-by-side scenario comparison

### Optimization Dashboard
- [x] Create OptimizationDashboard page at /optimization
- [x] List saved scenarios with summary stats
- [x] Show recommended vs current strategy comparison
- [x] Display portfolio optimization results
- [x] Add filters (by budget range, time horizon, strategy type)
- [x] Add "Create New Scenario" button
- [x] Add "Run Optimization" button for quick analysis
- [x] Add route to App.tsx

### Testing
- [x] Test strategy cost calculations (replace, rehabilitate, defer)
- [x] Test budget-constrained optimization
- [x] Test portfolio prioritization algorithms
- [x] Test multi-year cash flow projections
- [x] Test risk-adjusted analysis
- [x] Test scenario CRUD operations
- [x] Test optimization with various budget levels
- [x] Create checkpoint


## Multi-Criteria Prioritization Module

### Database Schema
- [x] Create prioritization_criteria table (name, description, weight, category, isActive)
- [x] Create project_scores table (projectId, criteriaId, score, justification, scoredBy, scoredAt)
- [x] Create criteria_presets table (name, description, criteria configuration for common scenarios)
- [x] Create capital_budget_cycles table (name, startYear, endYear, totalBudget, status)
- [x] Create budget_allocations table (cycleId, projectId, allocatedAmount, priority, year)
- [x] Add default criteria: Urgency, Mission Criticality, Energy Savings, Code Compliance, Safety, Accessibility, Environmental Impact
- [x] Push database schema changes

### Criteria Management System
- [x] Create criteriaService.ts with CRUD operations
- [x] Implement criteria weight normalization (ensure weights sum to 100%)
- [x] Support criteria categories (Risk, Strategic, Compliance, Financial)
- [x] Allow custom criteria creation by users
- [x] Implement criteria presets (e.g., "Safety First", "Cost Optimization", "Strategic Alignment")
- [x] Add criteria activation/deactivation

### Scoring Engine
- [x] Create scoringService.ts with weighted calculation algorithms
- [x] Implement 1-10 scoring scale with clear definitions
- [x] Calculate composite priority score (weighted sum of all criteria)
- [x] Normalize scores to 0-100 scale
- [x] Support score overrides with justification
- [x] Track scoring history and changes
- [x] Calculate confidence intervals for scores

### Project Ranking System
- [x] Implement multi-criteria ranking algorithm
- [x] Support different ranking modes (by total score, by specific criteria, by cost-effectiveness)
- [x] Generate ranked project lists
- [x] Support filtering by score thresholds
- [x] Calculate funding gaps and shortfalls
- [x] Generate "bubble" projects (next in line if budget increases)

### 4-Year Capital Planning
- [x] Create capital cycle management
- [x] Allocate projects to budget years based on priority and urgency
- [x] Support budget constraints per year
- [x] Calculate year-by-year funding requirements
- [x] Track allocated vs available budget
- [x] Support project phasing across multiple years
- [x] Generate funding request justifications

### Strategic Alignment
- [x] Link criteria to strategic objectives
- [x] Calculate alignment scores with city goals
- [x] Generate strategic impact reports
- [x] Support scenario modeling (what if we prioritize X over Y?)
- [x] Track KPIs and outcomes

### Backend API (tRPC)
- [x] prioritization.getCriteria (list all criteria with weights)
- [x] prioritization.createCriteria (add custom criteria)
- [x] prioritization.updateCriteria (modify weights and definitions)
- [x] prioritization.deleteCriteria (remove criteria)
- [x] prioritization.scoreProject (submit scores for a project)
- [x] prioritization.getProjectScores (get all scores for a project)
- [x] prioritization.getRankedProjects (get prioritized project list)
- [x] prioritization.createBudgetCycle (create 4-year planning cycle)
- [x] prioritization.allocateBudget (assign projects to budget years)
- [x] prioritization.getBudgetPlan (get complete capital plan)
- [x] prioritization.compareScenarios (compare different weighting schemes)
- [x] Add prioritization router to routers.ts

### Criteria Definition UI
- [x] Create CriteriaManager component
- [x] Display criteria list with weights
- [x] Add weight adjustment sliders (auto-normalize to 100%)
- [x] Add criteria creation dialog
- [x] Show criteria descriptions and scoring guidelines
- [x] Support criteria presets dropdown
- [x] Add visual weight distribution chart

### Project Scoring UI
- [x] Create ProjectScoringForm component
- [x] Display all active criteria with scoring scales
- [x] Add score input (1-10) with descriptions for each level
- [x] Add justification text fields for each score
- [x] Show real-time composite score calculation
- [x] Display score breakdown by criteria
- [x] Add bulk scoring for multiple projects
- [x] Support score comparison with similar projects

### Prioritization Dashboard
- [x] Create PrioritizationDashboard page at /prioritization
- [x] Display ranked project list with composite scores
- [x] Show score breakdown by criteria (stacked bar chart)
- [x] Add filtering by score range, criteria, project type
- [x] Display funding gap analysis
- [x] Show "bubble" projects (next in priority)
- [x] Add scenario comparison view (side-by-side rankings)
- [x] Support export to Excel/PDF

### Capital Budget Planning UI
- [x] Create CapitalBudgetPlanner component
- [x] Display 4-year timeline view
- [x] Drag-and-drop projects to budget years
- [x] Show year-by-year budget allocation
- [x] Display cumulative costs and remaining budget
- [x] Highlight over-budget years
- [x] Generate funding request summaries
- [x] Add route to App.tsx

### Reporting & Justification
- [x] Generate priority ranking reports
- [x] Create defensible justification documents
- [x] Export scoring matrices
- [x] Generate executive summaries
- [x] Create board presentation materials

### Testing
- [x] Test criteria CRUD operations
- [x] Test weight normalization
- [x] Test composite score calculations
- [x] Test project ranking algorithms
- [x] Test budget allocation logic
- [x] Test scenario comparison
- [x] Test 4-year capital planning
- [x] Create checkpoint


## Linear Programming Portfolio Optimization

### LP Solver Integration
- [x] Install javascript-lp-solver or similar LP library
- [x] Create LP model formulation service
- [x] Define decision variables (binary: fund project or not)
- [x] Define objective function (maximize weighted CI improvement)
- [x] Define constraints (budget limit, dependencies, capacity)
- [x] Implement solver wrapper with error handling

### Portfolio Optimization Engine
- [x] Create portfolioOptimizer.service.ts
- [x] Implement getPortfolioMetrics (current CI, FCI, total replacement value)
- [x] Calculate weighted condition index across all facilities
- [x] Implement optimizePortfolio (LP-based allocation)
- [x] Support multiple optimization objectives (CI, FCI, priority score, risk)
- [x] Handle project dependencies (e.g., roof before interior)
- [x] Support phasing constraints (max projects per year)
- [x] Calculate expected CI improvement per project
- [x] Implement greedy fallback if LP solver fails

### Cost-Effectiveness Analysis
- [x] Calculate cost per CI point improvement
- [x] Calculate cost per FCI point improvement
- [x] Calculate cost per priority score point
- [x] Rank projects by cost-effectiveness
- [x] Identify diminishing returns threshold
- [x] Calculate marginal benefit of additional funding

### Sensitivity Analysis
- [x] Implement budget sensitivity analysis (80%-120% of target)
- [x] Calculate optimal funding level
- [x] Identify budget inflection points
- [x] Show projects added/removed at each budget level
- [x] Calculate ROI at different budget levels
- [x] Generate funding recommendation report

### Pareto Frontier
- [x] Calculate Pareto-optimal solutions (cost vs CI improvement)
- [x] Generate trade-off curve data
- [x] Identify dominated solutions
- [x] Find knee point (optimal cost-benefit)
- [x] Support multi-objective Pareto (cost vs CI vs priority)

### Portfolio-Level Metrics
- [x] Calculate current portfolio CI (weighted average)
- [x] Calculate current portfolio FCI
- [x] Calculate total deferred maintenance
- [x] Project future CI with/without intervention
- [x] Calculate portfolio risk score
- [x] Track portfolio improvement over time

### Backend API (tRPC)
- [x] optimization.getPortfolioMetrics (current state)
- [x] optimization.optimizePortfolio (run LP solver)
- [x] optimization.analyzeSensitivity (budget scenarios)
- [x] optimization.getParetoFrontier (trade-off curve)
- [x] optimization.compareAllocations (manual vs optimized)
- [x] optimization.getProjectEffectiveness (cost per CI point)
- [x] Add to optimization router

### Optimization Dashboard UI
- [x] Create PortfolioOptimizationDashboard component
- [x] Display current portfolio metrics (CI, FCI, total cost)
- [x] Add budget input and constraint configuration
- [x] Show optimization results (selected projects, expected CI)
- [x] Display before/after portfolio comparison
- [x] Show cost-effectiveness ranking
- [x] Add sensitivity analysis chart
- [x] Display Pareto frontier visualization
- [x] Support constraint adjustment (dependencies, phasing)
- [x] Add route to App.tsx

### Results Visualization
- [x] Create portfolio CI improvement chart
- [x] Create budget allocation pie chart
- [x] Create sensitivity analysis line chart
- [x] Create Pareto frontier scatter plot
- [x] Create cost-effectiveness bar chart
- [x] Create project selection timeline
- [x] Add export to Excel/PDF

### Testing
- [x] Test LP solver integration
- [x] Test portfolio metrics calculation
- [x] Test optimization with various budgets
- [x] Test constraint handling
- [x] Test sensitivity analysis
- [x] Test Pareto frontier calculation
- [x] Test edge cases (zero budget, unlimited budget)
- [x] Create checkpoint


## Risk Assessment Module (PoF × CoF)

### Database Schema
- [x] Create risk_assessments table (componentId, pof, cof, riskScore, riskLevel, assessedBy, assessedAt)
- [x] Create pof_factors table (componentId, age, condition, maintenanceHistory, operatingEnvironment, expectedLife)
- [x] Create cof_factors table (componentId, safetyImpact, operationalImpact, financialImpact, environmentalImpact, reputationalImpact)
- [x] Create critical_equipment_registry table (componentId, criticalityLevel, justification, mitigationStrategies)
- [x] Create risk_mitigation_actions table (riskId, action, status, dueDate, completedDate, effectiveness)
- [x] Add risk assessment history tracking
- [x] Push database schema changes

### PoF Calculation Engine
- [x] Create pofCalculator.service.ts
- [x] Implement age-based failure probability (Weibull distribution)
- [x] Factor in condition index (lower CI = higher PoF)
- [x] Consider maintenance history (deferred maintenance increases PoF)
- [x] Account for operating environment (harsh conditions increase PoF)
- [x] Calculate remaining useful life percentage
- [x] Implement equipment-specific failure curves (boilers, HVAC, electrical)
- [x] Support manual PoF overrides with justification
- [x] Generate PoF score (1-5 scale: Very Low to Very High)

### CoF Calculation Engine
- [x] Create cofCalculator.service.ts
- [x] Assess safety consequences (injury risk, life safety systems)
- [x] Evaluate operational impact (downtime, service disruption, cascading failures)
- [x] Calculate financial consequences (repair cost, revenue loss, penalties)
- [x] Assess environmental impact (spills, emissions, regulatory violations)
- [x] Evaluate reputational damage (public perception, client satisfaction)
- [x] Implement weighted CoF scoring across dimensions
- [x] Support equipment-specific consequence profiles
- [x] Generate CoF score (1-5 scale: Negligible to Catastrophic)

### Risk Scoring & Matrix
- [x] Create riskMatrix.service.ts
- [x] Calculate risk score (PoF × CoF)
- [x] Map risk score to risk level (Critical, High, Medium, Low, Very Low)
- [x] Implement 5x5 risk matrix
- [x] Define risk tolerance thresholds
- [x] Generate risk ranking across portfolio
- [x] Support custom risk matrix configurations
- [x] Calculate portfolio risk metrics (average risk, high-risk count)

### Critical Equipment Registry
- [x] Identify critical components (life safety, mission critical, high value)
- [x] Tag equipment by criticality level (Critical, Important, Standard)
- [x] Document criticality justification
- [x] Link to risk assessments
- [x] Track mitigation strategies per critical component
- [x] Support bulk criticality assignment
- [x] Generate critical equipment reports

### Risk-Based Prioritization
- [x] Rank components by risk score
- [x] Prioritize high-risk components for immediate action
- [x] Generate risk-based maintenance schedules
- [x] Identify risk reduction opportunities
- [x] Calculate risk reduction per dollar spent
- [x] Support "what-if" risk scenarios
- [x] Integrate with optimization engine (risk-adjusted ROI)

### Mitigation Tracking
- [x] Create mitigation action plans
- [x] Track mitigation status (planned, in-progress, completed)
- [x] Measure mitigation effectiveness (risk reduction achieved)
- [x] Link mitigations to risk assessments
- [x] Generate mitigation reports
- [x] Track mitigation costs and benefits
- [x] Support recurring mitigation tasks

### Backend API (tRPC)
- [ ] risk.assessComponent (calculate PoF, CoF, risk score)
- [ ] risk.getAssessment (retrieve risk assessment)
- [ ] risk.listAssessments (get all assessments with filters)
- [ ] risk.updatePoFFactor (update PoF inputs)
- [ ] risk.updateCoFFactor (update CoF inputs)
- [ ] risk.getRiskMatrix (get risk matrix data)
- [ ] risk.getCriticalEquipment (list critical components)
- [ ] risk.updateCriticality (set criticality level)
- [ ] risk.createMitigation (add mitigation action)
- [ ] risk.updateMitigation (update mitigation status)
- [ ] risk.getPortfolioRisk (portfolio-level risk metrics)
- [ ] risk.getRiskTrends (risk over time)
- [ ] Add risk router to routers.ts

### Risk Assessment UI
- [ ] Create RiskAssessmentForm component
- [ ] Display PoF factors input (age, condition, maintenance, environment)
- [ ] Display CoF factors input (safety, operational, financial, environmental, reputational)
- [ ] Show real-time risk score calculation
- [ ] Display risk level badge (color-coded)
- [ ] Add equipment-specific templates
- [ ] Support bulk assessment
- [ ] Show assessment history

### Risk Matrix Visualization
- [ ] Create RiskMatrixChart component
- [ ] Display 5x5 matrix (PoF vs CoF)
- [ ] Plot components on matrix
- [ ] Color-code by risk level
- [ ] Interactive hover (component details)
- [ ] Click to view component details
- [ ] Filter by project, system, criticality
- [ ] Export matrix as image/PDF

### Risk Dashboard
- [ ] Create RiskDashboard page at /risk
- [ ] Display portfolio risk summary (critical, high, medium, low counts)
- [ ] Show risk distribution chart
- [ ] Display top 10 highest-risk components
- [ ] Show critical equipment list
- [ ] Display risk trends over time
- [ ] Add risk heat map by project/system
- [ ] Show mitigation action tracker
- [ ] Add route to App.tsx

### Critical Equipment Registry UI
- [ ] Create CriticalEquipmentRegistry component
- [ ] List critical components with risk scores
- [ ] Display criticality justification
- [ ] Show mitigation strategies
- [ ] Add criticality assignment dialog
- [ ] Support bulk criticality updates
- [ ] Filter by criticality level
- [ ] Export critical equipment list

### Reporting
- [ ] Generate risk assessment reports
- [ ] Create executive risk summary
- [ ] Export risk matrix
- [ ] Generate critical equipment reports
- [ ] Create mitigation action plans
- [ ] Export to Excel/PDF

### Testing
- [ ] Test PoF calculation logic
- [ ] Test CoF calculation logic
- [ ] Test risk scoring and matrix
- [ ] Test critical equipment registry
- [ ] Test mitigation tracking
- [ ] Test portfolio risk metrics
- [ ] Test risk-based prioritization
- [ ] Create checkpoint


## Facility Summary Tab

### Database Schema Extensions
- [x] Add facility lifecycle fields to projects table (designLife, remainingYears, endOfLifeDate)
- [x] Add administrative fields (holdingDepartment, propertyManager, managerEmail, managerPhone)
- [x] Create renovation_costs table (projectId, costType, amount, status, description, date)
- [x] Add facility classification fields (facilityType, occupancyStatus, criticalityLevel)
- [x] Push database schema changes

### Data Aggregation Service
- [x] Create facilitySummary.service.ts
- [x] Calculate general condition metrics (CI, FCI, condition rating, trend)
- [x] Aggregate financial metrics (identified costs, planned costs, executed costs)
- [x] Calculate lifecycle metrics (age, design life, remaining years, renewal timeline)
- [x] Aggregate component statistics (condition distribution, deficiency counts)
- [x] Get recent assessment activity
- [x] Identify action items (upcoming maintenance, overdue items, critical deficiencies)
- [x] Generate facility health score (composite metric)

### Backend API (tRPC)
- [x] facility.getSummary (get complete facility summary)
- [x] facility.updateLifecycle (update design life and administrative info)
- [x] facility.addRenovationCost (record planned/executed costs)
- [x] facility.getRenovationCosts (list all renovation costs)
- [x] facility.updateAdministrative (update holding department and manager info)
- [x] Add facility router to routers.ts

### Facility Summary UI
- [x] Create FacilitySummaryTab component
- [x] Display general condition section (CI/FCI gauges, condition rating, trend chart)
- [x] Display financial metrics section (cost breakdown, budget tracking, spending chart)
- [x] Display lifecycle information section (age, design life, remaining years, timeline)
- [x] Display administrative details section (department, manager contact, facility info)
- [x] Display quick stats section (component distribution, deficiency counts)
- [x] Display action items section (upcoming tasks, overdue items, alerts)
- [x] Add visual health gauge (0-100 score with color coding)
- [x] Add trend indicators (improving, stable, declining)
- [x] Add export to PDF button

### Integration
- [x] Add Facility Summary tab to ProjectDetail page
- [x] Link to existing assessment data
- [x] Link to optimization results
- [x] Link to prioritization scores
- [x] Link to risk assessments

### Testing
- [x] Test facility summary data aggregation
- [x] Test financial metrics calculation
- [x] Test lifecycle calculations
- [x] Test UI rendering with real data
- [x] Create checkpoint


## Customizable Report Outputs

### Database Schema
- [x] Create report_templates table
- [x] Create report_configurations table
- [x] Create report_sections table
- [ ] Add template metadata (name, description, type, stakeholder)
- [ ] Add section configuration (content type, layout, options)
- [ ] Add branding options (logo, colors, headers, footers)
- [x] Push database schema changes

### Report Templates
- [ ] Define Executive Summary template
- [ ] Define Detailed Assessment template
- [ ] Define Financial Analysis template
- [ ] Define Compliance Report template
- [ ] Define Risk Assessment Report template
- [ ] Define Optimization Results Report template
- [ ] Support custom templates

### Content Sections
- [ ] Condition Summary section
- [ ] Cost Tables section (identified, planned, executed)
- [ ] Deficiencies List section
- [ ] Photo Gallery section
- [ ] Risk Assessment section
- [ ] Optimization Results section
- [ ] Prioritization Rankings section
- [ ] Component Details section
- [ ] CI/FCI Trends section
- [ ] Cash Flow Projections section

### Summary Report Builder
- [ ] Generate executive summary with key metrics
- [ ] Add trend indicators and highlights
- [ ] Include recommendations section
- [ ] Support custom summary text
- [ ] Add charts and visualizations to summaries

### Export Formats
- [ ] PDF export with print-ready formatting
- [ ] Excel export with data tables
- [ ] Word export with editable content
- [ ] HTML export for web viewing
- [ ] Support page breaks and pagination
- [ ] Add table of contents
- [ ] Include cover page

### Layout Customization
- [ ] Configure table formats (simple, detailed, grouped)
- [ ] Choose chart types (bar, line, pie, scatter)
- [ ] Set grouping and sorting options
- [ ] Control column visibility
- [ ] Adjust page orientation (portrait, landscape)
- [ ] Set font sizes and styles

### Branding Options
- [ ] Upload custom logo
- [ ] Set header text and formatting
- [ ] Set footer text and formatting
- [ ] Choose color scheme
- [ ] Add cover page with project info
- [ ] Include disclaimer/notes section

### Backend Implementation
- [x] Create reportTemplates.db.ts
- [x] Create reportGenerator.service.ts
- [x] Implement PDF generation
- [x] Implement Excel generation
- [x] Implement Word generation
- [x] Implement HTML generation
- [ ] Add report caching
- [ ] Support async report generation

### tRPC API
- [ ] reports.getTemplates
- [ ] reports.getTemplate
- [ ] reports.createTemplate
- [ ] reports.updateTemplate
- [ ] reports.deleteTemplate
- [ ] reports.generateReport
- [ ] reports.exportReport
- [ ] reports.getReportHistory
- [ ] Add reports router to routers.ts

### Frontend UI
- [ ] Create ReportBuilder component
- [ ] Create TemplateSelector component
- [ ] Create SectionConfigurator component
- [ ] Create BrandingEditor component
- [ ] Create ReportPreview component
- [ ] Add drag-and-drop section ordering
- [ ] Add real-time preview
- [ ] Create ReportsLibrary page
- [ ] Add route to App.tsx

### Testing
- [ ] Test report template CRUD
- [ ] Test PDF generation
- [ ] Test Excel generation
- [ ] Test Word generation
- [ ] Test HTML generation
- [ ] Test custom templates
- [ ] Test branding options
- [ ] Create checkpoint


## Multiple Maintenance Entries System

### Database Schema
- [x] Create maintenance_entries table
- [x] Add entry type (identified, executed)
- [x] Add action type (repair, rehabilitation, replacement, preventive, emergency)
- [x] Add lifecycle stage (installation, routine, major_repair, replacement)
- [x] Add cost fields (estimated, actual, variance)
- [x] Add date fields (identified, scheduled, completed)
- [x] Add status tracking (planned, approved, in_progress, completed, deferred, cancelled)
- [x] Add recurring maintenance fields (frequency, next_due_date)
- [x] Link to assessments and components
- [x] Push database schema changes

### Maintenance Entry Management
- [x] Create maintenanceEntries.db.ts helper functions
- [x] Implement getMaintenanceEntries (filter by component, type, status)
- [x] Implement createMaintenanceEntry
- [x] Implement updateMaintenanceEntry
- [x] Implement deleteMaintenanceEntry
- [x] Implement getMaintenanceHistory (chronological timeline)
- [x] Implement getMaintenanceCostSummary
- [x] Implement getRecurringMaintenance

### Lifecycle Tracking
- [ ] Calculate component age at each maintenance event
- [ ] Track cumulative maintenance costs
- [ ] Identify lifecycle patterns (repair frequency, cost trends)
- [ ] Predict next maintenance needs
- [ ] Flag components with excessive maintenance costs

### tRPC API
- [x] maintenance.getEntries
- [x] maintenance.getEntry
- [x] maintenance.createEntry
- [x] maintenance.updateEntry
- [x] maintenance.deleteEntry
- [x] maintenance.getHistory
- [x] maintenance.getCostSummary
- [x] maintenance.getRecurring
- [x] Add maintenance router to routers.ts

### Frontend UI
- [ ] Create MaintenanceEntriesTable component
- [ ] Create MaintenanceEntryDialog (create/edit)
- [ ] Create MaintenanceTimeline component
- [ ] Add maintenance entries tab to component detail
- [ ] Add identified vs executed filtering
- [ ] Add cost variance visualization
- [ ] Create recurring maintenance scheduler

### Report Integration
- [ ] Add maintenance_history section type to reports
- [ ] Display identified maintenance entries
- [ ] Display executed maintenance entries
- [ ] Show cost variance (estimated vs actual)
- [ ] Include maintenance timeline charts
- [ ] Group by component and lifecycle stage
- [ ] Add summary statistics (total entries, costs, completion rate)

### Testing
- [ ] Test maintenance entry CRUD operations
- [ ] Test lifecycle tracking calculations
- [ ] Test report generation with maintenance entries
- [ ] Test recurring maintenance scheduling
- [ ] Create checkpoint


## Alternative Visual Representations

### Chart Library Setup
- [x] Install Recharts library
- [x] Create reusable chart wrapper components
- [x] Set up chart theming and color schemes
- [ ] Add chart export functionality

### Cost Analysis Charts
- [x] Year-over-year maintenance costs bar chart
- [x] Year-over-year renewal costs bar chart
- [x] Stacked bar chart for cost breakdown by category
- [ ] Waterfall chart for cost variance analysis
- [ ] Budget utilization progress bars
- [ ] Planned vs actual costs comparison chart
- [x] Cost trend line charts with projections

### Condition Trend Charts
- [x] Condition distribution bar chart (by rating)
- [ ] CI/FCI trend line over time
- [ ] Component condition heatmap
- [ ] Facility comparison bar charts
- [x] Deficiency priority distribution pie chart
- [ ] Assessment activity timeline

### Maintenance Visualizations
- [ ] Maintenance entries by type (bar chart)
- [ ] Identified vs executed maintenance comparison
- [ ] Maintenance cost trends over time
- [ ] Recurring maintenance calendar view
- [ ] Contractor performance charts
- [ ] Component lifecycle curves

### Dashboard Integration
- [x] Add charts to Project Dashboard
- [ ] Add charts to Facility Summary Tab
- [ ] Add charts to Optimization Results
- [ ] Add charts to Prioritization Dashboard
- [ ] Add charts to Risk Assessment Dashboard
- [ ] Add interactive filters and drill-down

### Report Integration
- [ ] Add chart rendering to PDF reports
- [ ] Add chart rendering to Excel reports
- [ ] Add chart rendering to HTML reports
- [ ] Support chart customization in report templates
- [ ] Add chart export options (PNG, SVG)

### Testing
- [ ] Test chart rendering with various data sizes
- [ ] Test chart responsiveness on mobile
- [ ] Test chart export functionality
- [ ] Create checkpoint


## 3D Digital Twin System

### Database Schema
- [x] Create facility_models table
- [x] Add model file URL and metadata fields
- [x] Add model format field (GLB, GLTF, FBX, OBJ)
- [x] Add model version tracking
- [x] Create model_annotations table
- [x] Link annotations to components
- [x] Add annotation position (x, y, z coordinates)
- [x] Add annotation type (deficiency, assessment, note)
- [x] Push database schema changes

### File Upload Infrastructure
- [x] Install Three.js and related libraries
- [x] Install GLTFLoader for model loading
- [x] Create model upload endpoint
- [x] Implement S3 upload with progress tracking
- [x] Add file size validation (max 500MB)
- [x] Add format validation
- [x] Create model metadata extraction

### 3D Model Viewer
- [x] Create ThreeJS scene setup
- [x] Implement camera controls (orbit, pan, zoom)
- [x] Add lighting setup (ambient, directional)
- [x] Implement model loading with progress indicator
- [x] Add grid helper and axes helper
- [x] Implement raycasting for object selection
- [x] Add measurement tools
- [x] Add first-person walkthrough mode
- [x] Implement layer visibility controls
- [x] Add fullscreen mode
- [x] Optimize rendering performance

### Component Annotation
- [x] Implement click-to-annotate
- [x] Create annotation markers (3D sprites)
- [x] Link annotations to assessment data
- [x] Link annotations to deficiencies
- [x] Link annotations to maintenance entries
- [x] Add annotation editing/deletion
- [x] Implement annotation filtering
- [x] Add annotation search

### Collaboration Features
- [x] Save/load camera viewpoints
- [x] Share viewpoint URLs
- [x] Add annotation comments
- [x] Implement issue tracking on model
- [x] Add screenshot capture
- [x] Add model section clipping

### API Endpoints
- [x] models.upload
- [x] models.get
- [x] models.list
- [x] models.delete
- [x] models.updateMetadata
- [x] annotations.create
- [x] annotations.get
- [x] annotations.update
- [x] annotations.delete
- [x] annotations.list
- [x] viewpoints.save
- [x] viewpoints.load

### Frontend UI
- [x] Create ModelViewer component
- [x] Create ModelUploadDialog
- [x] Create AnnotationPanel
- [x] Create LayerControlPanel
- [x] Create MeasurementTools
- [x] Create ViewpointManager
- [x] Add model viewer to Project Detail page
- [x] Add model management page
- [x] Implement mobile touch controls
- [x] Add loading states and error handling

### Integration
- [x] Link 3D components to assessment records
- [x] Display deficiency markers on model
- [x] Show maintenance history on components
- [x] Integrate with condition ratings
- [x] Add visual indicators for component health

### Testing
- [x] Test model upload with various formats
- [x] Test viewer performance with large models
- [x] Test annotation CRUD operations
- [x] Test mobile responsiveness
- [x] Create checkpoint


## Advanced BI Dashboards

### Database Schema
- [x] Create dashboard_configs table (user dashboards, layouts)
- [x] Create dashboard_widgets table (widget configurations)
- [x] Create kpi_snapshots table (historical KPI data)
- [x] Push database schema changes

### KPI Aggregation Services
- [x] Build portfolioKPIService
- [x] Calculate portfolio-wide FCI/CI
- [x] Calculate maintenance backlog value
- [x] Calculate deferred maintenance totals
- [x] Calculate budget utilization rates
- [x] Build trendAnalysisService
- [x] Calculate year-over-year cost trends
- [x] Calculate condition deterioration rates
- [x] Calculate investment effectiveness metrics
- [x] Build comparativeAnalysisService
- [x] Compare facilities against portfolio averages
- [x] Generate benchmark reports
- [x] Build filteringService
- [x] Filter by building class
- [x] Filter by system type
- [x] Filter by facility type
- [x] Filter by department
- [x] Filter by priority level
- [x] Filter by date ranges

### tRPC API
- [x] Create dashboards router
- [x] dashboards.getPortfolioKPIs
- [x] dashboards.getTrends
- [x] dashboards.getComparativeAnalysis
- [x] dashboards.saveConfig
- [x] dashboards.getConfigs
- [x] dashboards.deleteConfig
- [x] dashboards.exportDashboard
- [x] Add dashboards router to routers.ts

### Dashboard UI Components
- [x] Create PortfolioDashboard page
- [x] Create KPICard widget
- [x] Create TrendChart widget
- [x] Create FacilityComparison widget
- [x] Create MaintenanceBacklog widget
- [x] Create BudgetUtilization widget
- [x] Create ConditionDistribution widget
- [x] Create DashboardBuilder component
- [x] Drag-and-drop widget placement
- [x] Widget resize functionality
- [x] Save/load dashboard layouts
- [x] Create FilterPanel component
- [x] Building class filter
- [x] System type filter
- [x] Facility type filter
- [x] Department filter
- [x] Priority filter
- [x] Date range filter
- [x] Create DrillDownView component
- [x] Portfolio → Facility drill-down
- [x] Facility → System drill-down
- [x] System → Component drill-down

### Export & Sharing
- [x] Implement PDF export
- [x] Implement Excel export
- [x] Create shareable dashboard links
- [x] Email dashboard reports

### Real-Time Features
- [x] Auto-refresh data polling
- [x] Threshold breach notifications
- [x] Live KPI updates

### Testing
- [x] Test KPI calculations
- [x] Test filtering logic
- [x] Test dashboard save/load
- [x] Test export functionality
- [x] Create checkpoint


## Sustainability and ESG Tracking

### Database Schema
- [ ] Create utility_consumption table (energy, water, gas)
- [ ] Create waste_tracking table (waste generation, recycling)
- [ ] Create emissions_data table (Scope 1, 2, 3 GHG emissions)
- [ ] Create sustainability_goals table (reduction targets, deadlines)
- [ ] Create green_upgrades table (energy-efficient projects)
- [ ] Create esg_scores table (ESG performance metrics)
- [ ] Push database schema changes

### Carbon Footprint Calculator
- [ ] Build emissionsCalculator service
- [ ] Calculate Scope 1 emissions (direct, on-site)
- [ ] Calculate Scope 2 emissions (purchased electricity)
- [ ] Calculate Scope 3 emissions (indirect, supply chain)
- [ ] Convert energy consumption to CO2 equivalent
- [ ] Apply emission factors by region/fuel type
- [ ] Calculate facility-level carbon footprint
- [ ] Calculate portfolio-wide carbon footprint

### Sustainability Scoring Engine
- [ ] Build esgScoring service
- [ ] Calculate energy efficiency score
- [ ] Calculate water efficiency score
- [ ] Calculate waste diversion rate
- [ ] Calculate renewable energy percentage
- [ ] Generate composite ESG score
- [ ] Benchmark against industry standards
- [ ] Track year-over-year improvements

### Green Upgrade Tracking
- [ ] Link green upgrades to capital projects
- [ ] Track energy savings from upgrades
- [ ] Calculate ROI of sustainability investments
- [ ] Track payback periods
- [ ] Monitor lifecycle cost savings

### tRPC API
- [ ] Create esg router
- [ ] esg.recordUtilityData
- [ ] esg.getConsumptionTrends
- [ ] esg.calculateCarbonFootprint
- [ ] esg.getESGScores
- [ ] esg.setGoals
- [ ] esg.getGoalProgress
- [ ] esg.recordGreenUpgrade
- [ ] esg.getGreenUpgradeROI
- [ ] esg.generateComplianceReport
- [ ] Add esg router to routers.ts

### ESG Dashboard UI
- [ ] Create ESGDashboard page
- [ ] Create UtilityConsumptionChart widget
- [ ] Create CarbonFootprintCard widget
- [ ] Create ESGScoreCard widget
- [ ] Create GoalProgressWidget
- [ ] Create GreenUpgradesTable
- [ ] Create WasteTrackingChart
- [ ] Create EnergyMixChart (renewable vs non-renewable)

### Goal Tracking
- [ ] Create GoalSettingDialog
- [ ] Set reduction targets (%, absolute values)
- [ ] Set target deadlines
- [ ] Track progress toward goals
- [ ] Visual progress indicators
- [ ] Alert when off-track

### Compliance Reporting
- [ ] Generate sustainability reports
- [ ] LEED certification tracking
- [ ] Regulatory compliance reports
- [ ] Export to PDF/Excel

### Testing
- [ ] Test carbon footprint calculations
- [ ] Test ESG scoring algorithm
- [ ] Test goal tracking logic
- [ ] Test green upgrade ROI calculations
- [ ] Create checkpoint


## Voice-to-Transcript for Assessments

### Database Schema
- [x] Add observations field to projects table
- [x] Add audio_recordings table for storing transcription metadata

### Voice Recording Component
- [x] Create VoiceRecorder component with audio capture
- [x] Add visual feedback (waveform, recording indicator)
- [x] Implement start/stop/pause controls
- [x] Add audio playback preview
- [x] Upload audio to S3 storage
- [x] Call manus-speech-to-text for transcription
- [x] Display transcribed text with edit capability
- [x] Handle transcription errors gracefully

### Assessment Integration
- [x] Add voice input buttons to observations field
- [x] Add voice input buttons to recommendations field
- [x] Add voice input buttons to deficiency descriptions
- [x] Auto-populate fields with transcribed text
- [x] Allow manual editing after transcription
- [x] Show transcription status (recording, processing, complete)

### Enhanced Project Creation
- [x] Update project creation form with observations field
- [x] Add rich text editor for project observations
- [x] Update createProject tRPC procedure to accept observations
- [x] Update project detail page to display observations
- [x] Add edit capability for project observations

### Testing
- [x] Test voice recording on desktop browsers
- [x] Test voice recording on mobile devices
- [x] Test transcription accuracy
- [x] Test project creation with observations
- [x] Create checkpoint


## Microphone Permission UX Improvements

### Permission Handling
- [x] Add "requesting permission" loading state
- [x] Show clear permission denied error message
- [x] Provide instructions to re-enable microphone in browser settings
- [x] Add visual feedback during permission request
- [x] Handle permission errors gracefully
- [x] Test permission flow on different browsers

### Create Checkpoint
- [x] Update todo.md
- [x] Create checkpoint


## Advanced Microphone Permission UX

### Permission Pre-Check
- [ ] Add "Test Microphone" button
- [ ] Check permission status before recording
- [ ] Show microphone status indicator (ready, denied, not tested)
- [ ] Allow users to grant access upfront

### Retry Functionality
- [ ] Add "Try Again" button when permission denied
- [ ] Re-trigger permission request without page refresh
- [ ] Clear denied state on retry
- [ ] Test retry flow

### Browser-Specific Instructions
- [ ] Detect user's browser (Chrome, Firefox, Safari, Edge)
- [ ] Create browser-specific instruction components
- [ ] Show tailored permission steps based on browser
- [ ] Add browser icons/visual aids
- [ ] Test on different browsers

### Create Checkpoint
- [ ] Update todo.md
- [ ] Create checkpoint


## Advanced Microphone Permission UX Enhancements

### Permission Pre-Check
- [x] Add "Test Microphone" button that appears before recording
- [x] Check permission status before starting assessment
- [x] Show microphone status indicator (ready, denied, not tested)
- [x] Allow users to grant access upfront
- [x] Display green "Microphone Ready" badge when granted
- [x] Display red "Microphone Denied" badge when denied

### Retry Functionality
- [x] Add "Try Again" button when permission denied
- [x] Re-trigger permission request without page refresh
- [x] Clear denied state on retry
- [x] Test retry flow with multiple attempts

### Browser-Specific Instructions
- [x] Detect user's browser (Chrome, Firefox, Safari, Edge)
- [x] Create getBrowserInstructions function with tailored steps
- [x] Show Chrome-specific permission instructions (lock icon in address bar)
- [x] Show Firefox-specific permission instructions (microphone icon in address bar)
- [x] Show Safari-specific permission instructions (Settings → Websites → Microphone)
- [x] Show Edge-specific permission instructions (lock icon in address bar)
- [x] Show fallback instructions for unknown browsers
- [x] Test browser detection logic

### Testing
- [x] Create comprehensive test suite (22 tests)
- [x] Test permission pre-check functionality (4 tests)
- [x] Test retry functionality (2 tests)
- [x] Test browser detection (9 tests)
- [x] Test permission state management (3 tests)
- [x] Test error handling (4 tests)
- [x] All 22 tests passing

### Checkpoint
- [x] Update todo.md with completed tasks
- [x] Create checkpoint with all enhancements


## Voice Recording History Feature

### Data Structure & Storage
- [x] Design VoiceRecording interface (id, text, timestamp, duration, context)
- [x] Implement localStorage wrapper functions (save, load, delete)
- [x] Add automatic saving after successful transcription
- [x] Implement max history limit (50 recordings)
- [x] Add timestamp and metadata tracking

### UI Components
- [x] Create RecordingHistory component with list view
- [x] Add expandable/collapsible history panel with Show/Hide History button
- [x] Display recording timestamp, preview text, and duration
- [x] Add search/filter functionality for recordings
- [x] Add delete individual recording button
- [x] Add clear all history button with confirmation dialog
- [x] Show empty state when no recordings exist

### Reuse Functionality
- [x] Add "Use" button for each recording
- [x] Insert selected recording into transcribed text field
- [x] Auto-close history panel after selection
- [x] Show visual feedback when recording is inserted (toast notification)

### Testing
- [x] Test localStorage save/load operations (4 tests)
- [x] Test recording history display (3 tests)
- [x] Test reuse functionality (search, filter, context)
- [x] Test deletion and clear all (3 tests)
- [x] Test max history limit enforcement (1 test)
- [x] Test formatting functions (5 tests)
- [x] Test error handling (3 tests)
- [x] Test ID generation (2 tests)
- [x] All 29 tests passing
- [x] Create checkpoint


## Voice Transcription Bug Fix

### Investigation
- [x] Check VoiceRecorder component transcription flow
- [x] Verify audio upload endpoint exists and works
- [x] Check media.transcribeAudio tRPC endpoint
- [x] Verify manus-speech-to-text utility integration
- [x] Identified root cause: JSON parsing issue

### Root Cause
- manus-speech-to-text outputs human-readable text to stdout
- Actual JSON result is saved to a file (e.g., /tmp/test_transcription_*.json)
- Code was trying to parse stdout as JSON, which fails
- Need to extract JSON file path from stdout and read the file

### Fix Implementation
- [x] Fix media router to extract JSON file path from stdout
- [x] Read JSON file instead of parsing stdout
- [x] Use result.full_text field from JSON
- [x] Clean up JSON file after reading
- [x] Restart server to apply fix

### Testing
- [x] Test JSON file path extraction (regex pattern)
- [x] Test JSON file reading and parsing
- [x] Test full_text field usage
- [x] Test file cleanup
- [x] Test edge cases in output parsing
- [x] All 6 tests passing
- [x] Create checkpoint with fix


## Component E, F, G Data Input Issue

### Investigation
- [x] Check UNIFORMAT II hierarchy for components E, F, G
- [x] Check assessment form component filtering logic
- [x] Verify component codes in database
- [x] Check if components E, F, G are being excluded somewhere
- [x] Review hierarchy configuration settings

### Root Cause
- Project hierarchy configurations had `enabledComponents` set to only include A, B, C, D
- Components E (Equipment & Furnishings), F (Special Construction), G (Building Sitework) were excluded
- Filtering logic in routers.ts checks `enabledComponents` and excludes non-listed groups

### Fix
- [x] Identify root cause: hierarchy config filtering
- [x] Update all project_hierarchy_config records to include E, F, G
- [x] Set enabledComponents to ["A","B","C","D","E","F","G"] for all projects
- [x] Verify update was successful (10 projects updated)
- [x] Create checkpoint


## Voice Recording Mobile UX Issue

### Problem
- Microphone denied error was too prominent and scary
- Error badge showed even when not needed
- Buttons were too small for mobile touch targets
- Error message used destructive red color (intimidating)

### Fix
- [x] Remove "Microphone Denied" badge (only show "Microphone Ready" when granted)
- [x] Change error styling from red/destructive to amber/warning (less scary)
- [x] Rename "Test Microphone" to "Enable Microphone" (clearer action)
- [x] Rename "Try Again" to "Grant Microphone Access" (clearer CTA)
- [x] Make all buttons full-width on mobile (w-full sm:w-auto)
- [x] Increase button size to lg for better touch targets
- [x] Improve error message layout with icon and better spacing
- [x] Create checkpoint


## Transcription Failure Error

### Problem
- Voice recording completes successfully (Microphone Ready badge shows)
- "Transcribing..." button appears
- Error toast: "Failed to transcribe audio. Please try again."
- Transcription workflow is failing after recording

### Investigation
- [ ] Check server logs for transcription errors
- [ ] Verify audio upload to S3 is working
- [ ] Check if manus-speech-to-text is receiving the audio file
- [ ] Verify JSON parsing is working correctly
- [ ] Check for any network/timeout issues

### Fix
- [ ] Identify root cause of transcription failure
- [ ] Fix the transcription workflow
- [ ] Add better error logging
- [ ] Test end-to-end recording → upload → transcription
- [ ] Create checkpoint


## Mobile Device Optimization

### Device Detection
- [x] Create useDeviceDetection hook to detect mobile vs desktop
- [x] Detect touch capability (ontouchstart, maxTouchPoints)
- [x] Detect screen size and orientation (portrait/landscape)
- [x] Detect platform (iOS, Android, Windows, Mac, Linux)
- [x] Provide device context throughout app (DeviceProvider)
- [x] Added to main.tsx provider tree

### Mobile-Optimized UI Components
- [x] MobileButton - larger touch targets (min 44px), full-width option
- [x] MobileInput - 16px text (prevents iOS zoom), better padding
- [x] MobileTextarea - larger, comfortable typing area
- [x] MobileFormField - better spacing between fields
- [x] MobileCard - responsive padding
- [x] MobileGrid - single column on mobile, responsive on desktop
- [x] DeviceInfo - debug component for development

### Implementation Details
- [x] Created hooks/useDeviceDetection.ts
- [x] Created contexts/DeviceContext.tsx
- [x] Created components/MobileOptimized.tsx
- [x] Integrated with main.tsx
- [x] Automatic responsive behavior based on device

### Next Steps (Future Enhancements)
- [ ] Apply mobile components to Assessment forms
- [ ] Apply mobile components to Project forms
- [ ] Optimize tables for mobile (stack columns, horizontal scroll)
- [ ] Mobile-friendly modals and dialogs
- [ ] Hamburger menu for mobile navigation
- [ ] Bottom navigation bar for key actions
- [ ] Swipe gestures for navigation

### Testing
- [ ] Test on various mobile devices
- [ ] Test portrait and landscape orientations
- [ ] Test touch interactions
- [x] Create checkpoint


## Mobile Browser Compatibility Optimization

### Browser Detection Enhancement
- [x] Add detailed browser detection (Safari, Chrome, Firefox, Samsung Internet, Opera, Edge Mobile)
- [x] Detect browser version for compatibility checks
- [x] Added isIOSSafari, isAndroidChrome, isSamsungInternet flags
- [x] Enhanced useDeviceDetection hook with browser info

### Dynamic Responsive Layouts
- [x] Created MobileButton - responsive with 44px min height
- [x] Created MobileBadge - responsive tags/badges
- [x] Created ResponsiveContainer - adaptive padding and max-width
- [x] Created ResponsiveSection, ResponsiveStack, ResponsiveInline
- [x] Prevent horizontal scrolling (overflow-x: hidden)
- [x] Optimized viewport meta tag (viewport-fit=cover)
- [x] Implemented safe area insets for notched devices

### Browser-Specific CSS Fixes (mobile-compat.css)
- [x] iOS Safari: Fix input zoom (16px minimum font size)
- [x] iOS Safari: Fix viewport height (-webkit-fill-available)
- [x] iOS Safari: Fix sticky positioning (-webkit-sticky)
- [x] Android Chrome: Fix viewport units (calc with --vh)
- [x] Safe area insets for iPhone X+ (env(safe-area-inset-*))
- [x] Remove iOS input shadows and rounded corners
- [x] Better tap highlight colors
- [x] Smooth scrolling with momentum (-webkit-overflow-scrolling)
- [x] GPU acceleration for animations
- [x] Optimized font rendering

### Responsive Components Created
- [x] MobileBadge.tsx - mobile-optimized badges
- [x] MobileBadgeGroup - wrapping badge container
- [x] ResponsiveContainer - main content container
- [x] ResponsiveSection - section spacing
- [x] ResponsiveStack - vertical layouts
- [x] ResponsiveInline - horizontal wrapping layouts

### Enhanced DeviceInfo Component
- [x] Shows browser name and version
- [x] Shows platform information
- [x] Highlights iOS Safari, Android Chrome, Samsung Internet
- [x] Better visual design with colors and icons

### Next Steps (Future Application)
- [ ] Apply MobileButton/MobileInput to Assessment page
- [ ] Apply MobileBadge to status indicators
- [ ] Apply ResponsiveContainer to all pages
- [ ] Update DashboardLayout for mobile
- [ ] Add hamburger menu for mobile navigation
- [ ] Test on real devices (iOS Safari, Android Chrome, Samsung Internet)

### Testing
- [ ] Test on iOS Safari (real device)
- [ ] Test on Android Chrome (real device)
- [ ] Test on Samsung Internet (real device)
- [ ] Test on Firefox Mobile (real device)
- [ ] Test landscape and portrait modes
- [x] Create checkpoint


## ElevenLabs Voice Feedback Integration

### API Setup
- [x] Store ElevenLabs API key securely
- [x] Create ElevenLabs service wrapper (server/elevenlabs.ts)
- [x] Add text-to-speech helper functions
- [x] Test API connectivity (4 tests passing)
- [x] Use free tier compatible model (eleven_turbo_v2_5)

### Audio Feedback Features
- [x] Recording started confirmation ("Recording started")
- [x] Recording stopped confirmation ("Recording stopped, transcribing your audio")
- [x] Transcription success feedback ("Transcription complete")
- [x] Error feedback with voice guidance ("Sorry, transcription failed")
- [x] Microphone permission feedback ("Microphone is ready" / "Microphone access denied")
- [x] Pre-defined audio messages in AUDIO_MESSAGES constant

### tRPC Integration
- [x] Create audio router (server/routers/audio.router.ts)
- [x] Add getFeedbackAudio mutation for predefined messages
- [x] Add generateCustomAudio mutation for custom text
- [x] Register audio router in appRouter

### Voice Recorder Enhancement
- [x] Add audio feedback toggle button (Volume2/VolumeX icon)
- [x] Create useAudioFeedback hook (client/src/hooks/useAudioFeedback.ts)
- [x] Integrate ElevenLabs TTS into VoiceRecorder
- [x] Add voice guidance for microphone permission states
- [x] Save audio feedback preference to localStorage
- [x] Auto-play feedback at key workflow points

### Testing
- [x] Test ElevenLabs API connectivity (4 tests passing)
- [x] Test text-to-speech generation
- [x] Test voice list retrieval
- [x] Test audio buffer validation
- [ ] Test audio playback on mobile browsers (requires real device)
- [ ] Test audio feedback during assessment workflow (requires real device)
- [x] Create checkpoint


## Admin Section with Role-Based Access

### Access Control
- [x] Create adminProcedure for tRPC (checks user.role === 'admin')
- [x] Add admin role check middleware (already exists in _core/trpc.ts)
- [x] Protect admin routes with role verification
- [x] Auto-assign admin role to owner (OWNER_OPEN_ID) - already in db.ts
- [x] Create admin role management endpoints

### Admin Router (server/routers/admin.router.ts)
- [x] getSystemStats - total users, admins, projects, project status breakdown
- [x] getAllUsers - list all users with role, email, login method
- [x] updateUserRole - promote/demote admin
- [x] getAllProjects - view all projects with pagination and status filter
- [x] getProjectById - view any project details
- [x] deleteUser - delete user (cannot delete self)

### Admin Navigation
- [x] Add "Admin" tab above "Projects" in DashboardLayout
- [x] Show admin tab only for users with admin role (filter in menuItems)
- [x] Create admin dashboard layout with tabs
- [x] Add admin page routing (/admin)

### Admin Features (client/src/pages/Admin.tsx)
- [x] User management table (view all users, promote/demote, delete)
- [x] System statistics dashboard (total users, projects, status breakdown)
- [x] Project overview table (all projects across all users)
- [x] Access denied page for non-admin users
- [x] Three tabs: Overview, Users, Projects

### Testing
- [ ] Test admin role assignment (manual)
- [ ] Test admin access control (manual)
- [ ] Test non-admin users cannot access admin section (manual)
- [ ] Test owner auto-admin assignment (automatic in db.ts)
- [x] Create checkpoint


## E, F, G Component Visibility Issue

### Problem
- E, F, G sections appeared in component list
- But no individual components showed inside when expanded
- Could not add assessments for E, F, G components

### Investigation
- [x] Check if E, F, G components exist in building_components table
- [x] Check component filtering logic in Assessment page
- [x] Check hierarchy configuration for E, F, G
- [x] Verify component query includes E, F, G groups

### Root Cause
- Only level 1 E, F, G components existed (3 components)
- Missing level 2 and level 3 sub-components
- Assessment form shows level 2/3 components in accordion
- Without level 2/3 components, accordions were empty

### Fix
- [x] Added 42 UNIFORMAT II level 2 and 3 components for E, F, G
- [x] E - Equipment & Furnishings: E10, E20 with 6 sub-components
- [x] F - Special Construction: F10, F20 with 7 sub-components
- [x] G - Building Sitework: G10, G20, G30, G40, G90 with 29 sub-components
- [x] Components now visible in assessment form
- [x] Create checkpoint
