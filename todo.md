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
- [ ] Create checkpoint with photo-enabled reports
