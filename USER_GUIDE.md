# Building Condition Assessment (BCA) System - User Guide

**Version 1.0**  
**Last Updated: December 2024**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [Assessment Workflows](#assessment-workflows)
6. [Advanced Features](#advanced-features)
7. [Mobile Field Assessments](#mobile-field-assessments)
8. [Reporting & Analytics](#reporting--analytics)
9. [Administration](#administration)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Introduction

### What is the BCA System?

The Building Condition Assessment (BCA) System is a comprehensive web application designed to streamline building condition assessments following **ASTM E2018** standards and the **UNIFORMAT II** classification system. The platform enables property assessors to:

- Document building conditions systematically
- Track deficiencies and maintenance needs
- Estimate repair and replacement costs
- Generate professional BCA reports
- Leverage AI-powered tools for efficiency
- Collaborate with team members in real-time

### Key Benefits

- **75% Time Savings**: Reduce assessment time with AI automation
- **98% Data Accuracy**: AI-powered photo analysis and OCR
- **Mobile-First**: Conduct assessments on-site with any device
- **Standards Compliant**: ASTM E2018 and UNIFORMAT II compliant
- **Secure & Auditable**: Complete audit trails and enterprise security

---

## Getting Started

### Account Registration

1. **Navigate to the Application**: Open your web browser and go to the BCA System URL
2. **Click "Login"**: You'll be redirected to the Manus OAuth login page
3. **Sign In**: Use your email or social login (Google, Microsoft, etc.)
4. **Submit Access Request**: First-time users will see an access request form
   - Fill in: Full Name, Email, Company Name, City, Phone Number, Use Case
   - Click "Submit Request"
5. **Wait for Approval**: Your request will be reviewed by an administrator (typically 24-48 hours)
6. **Receive Notification**: You'll receive an email when your account is approved
7. **Start Using**: Log in again to access the full application

### First Login

After approval, you'll see:

- **Dashboard**: Overview of your projects and statistics
- **Projects List**: All projects accessible to your company
- **Navigation Menu**: Access to all features based on your role

---

## User Roles & Permissions

The BCA System uses **Role-Based Access Control (RBAC)** with four distinct roles:

### 1. Viewer (Read-Only)

**Permissions:**
- ✅ View projects and assessments
- ✅ View reports and analytics
- ✅ Export data (CSV, Excel, PDF)
- ❌ Cannot create or edit projects
- ❌ Cannot modify assessments

**Use Case:** Stakeholders, executives, auditors who need read-only access

### 2. Editor

**Permissions:**
- ✅ All Viewer permissions
- ✅ Create and edit own assessments
- ✅ Upload photos and documents
- ✅ Use voice recording features
- ✅ Generate reports
- ❌ Cannot delete projects
- ❌ Cannot manage users

**Use Case:** Field inspectors, assessors conducting evaluations

### 3. Project Manager

**Permissions:**
- ✅ All Editor permissions
- ✅ Create and manage projects
- ✅ Assign team members to projects
- ✅ Delete own projects
- ✅ Share projects with other users
- ✅ Bulk operations (export, delete)
- ❌ Cannot access admin settings

**Use Case:** Team leads, facility managers overseeing multiple projects

### 4. Admin

**Permissions:**
- ✅ All Project Manager permissions
- ✅ Manage all users and roles
- ✅ Access all companies' data (multi-tenant)
- ✅ Configure system settings
- ✅ View audit logs
- ✅ Manage compliance settings
- ✅ Approve/reject access requests

**Use Case:** System administrators, IT staff

---

## Core Features

### 1. Project Management

#### Creating a New Project

1. **Navigate to Projects**: Click "Projects" in the sidebar
2. **Click "Create New Project"**: Opens the project creation form
3. **Fill in Project Details**:
   - **Project Name**: e.g., "1729 Comox Avenue BCA"
   - **Property Address**: Full street address
   - **Client Name**: Property owner or client
   - **Property Type**: Residential, Commercial, Industrial, etc.
   - **Construction Type**: Wood Frame, Concrete, Steel, etc.
   - **Year Built**: Construction year
   - **Building Code** (Optional): Select applicable building code (NBC, BC, Alberta)
4. **Click "Create Project"**: Project is created and you're redirected to project details

#### Editing a Project

1. **Open Project**: Click on any project card
2. **Click "Edit"**: In the project header dropdown menu
3. **Modify Fields**: Update any project information
4. **Click "Save Changes"**: Changes are saved immediately

#### Deleting a Project

1. **Open Project**: Navigate to the project
2. **Click Dropdown Menu**: Three dots in project header
3. **Select "Delete"**: Confirm deletion
4. **Soft Delete**: Project is marked as deleted (not permanently removed)
5. **Recovery**: Deleted projects can be restored within 90 days from "Deleted Projects" page

### 2. Assets Management

Projects can contain multiple assets (buildings, facilities, structures).

#### Adding an Asset

1. **Open Project**: Navigate to your project
2. **Click "Add Asset"**: On the Assets tab
3. **Fill in Asset Details**:
   - Asset Name
   - Asset Type (Building, Parking Structure, etc.)
   - Address
   - Year Built
   - Floor Area (sq ft)
   - Number of Stories
   - Construction Type
   - Replacement Value
4. **Click "Create Asset"**: Asset is added to the project

#### Assessing an Asset

1. **View Assets**: On the project's Assets tab
2. **Click "Assess"**: On the asset card
3. **Start Assessment**: You'll be taken to the assessment page for that specific asset

### 3. Building Component Assessments

#### Understanding UNIFORMAT II

The system uses the **UNIFORMAT II** classification system with 7 major groups:

- **A - Substructure**: Foundations, basement construction
- **B - Shell**: Superstructure, exterior enclosure, roofing
- **C - Interiors**: Interior construction, stairs, finishes
- **D - Services**: Plumbing, HVAC, fire protection, electrical
- **E - Equipment & Furnishings**: Equipment, furnishings, special construction
- **F - Special Construction & Demolition**: Special facilities
- **G - Building Sitework**: Site improvements, utilities

Each major group contains Level 2 (e.g., B30 - Roofing) and Level 3 (e.g., B3010 - Roof Coverings) components.

#### Creating an Assessment

1. **Navigate to Assessment Page**: Click "Assess" on an asset
2. **Expand UNIFORMAT Group**: Click on a major group (A-G) to expand
3. **Select Component**: Click on a specific component (e.g., B3010 - Roof Coverings)
4. **Assessment Dialog Opens**: Fill in the assessment form

**Assessment Form Fields:**

- **Component Name**: Custom name (e.g., "Main Building Roof")
- **Component Location**: Specific location (e.g., "East Wing, 3rd Floor")
- **Condition**: Select from dropdown (Good, Fair, Poor, Critical)
- **Status**: Initial, Active, Completed
- **Estimated Service Life (ESL)**: Expected lifespan in years
- **Review Year**: Year of assessment
- **Last Time Action**: Year of last maintenance/repair
- **Estimated Repair Cost**: Dollar amount
- **Replacement Value**: Full replacement cost
- **Action Year**: Recommended year for action
- **Observations**: Technical condition description (supports rich text)
- **Recommendations**: Maintenance/repair recommendations (supports rich text)

5. **Upload Photos** (Optional): Drag and drop or click to upload
6. **Use Voice Input** (Optional): Click microphone icon to dictate
7. **Click "Save Assessment"**: Assessment is saved to the database

#### Editing an Assessment

1. **View Assessments**: On the Assessment tab in project details
2. **Click Edit Icon**: On the assessment you want to modify
3. **Update Fields**: Make your changes
4. **Click "Save Assessment"**: Changes are saved

---

## Assessment Workflows

### Voice Recording Workflow

The BCA System includes powerful voice-to-text capabilities for hands-free data entry in the field.

#### Using Voice Input

1. **Open Assessment Dialog**: Start creating or editing an assessment
2. **Click Microphone Icon**: Next to any text field (Component Name, Location, Observations, Recommendations)
3. **Grant Microphone Permission**: Browser will request permission (first time only)
4. **Start Recording**: Click "Start Recording" button
5. **Speak Clearly**: Dictate your observations or notes
6. **Stop Recording**: Click "Stop Recording"
7. **Transcription**: Audio is automatically transcribed using Whisper API
8. **Review Text**: Transcribed text appears in the field
9. **Edit if Needed**: Make any corrections
10. **Save**: Click "Save Assessment"

#### Voice Recording History

- **Access History**: Click "Show History" in the voice recorder
- **Search Recordings**: Use the search box to find past recordings
- **Filter by Context**: Filter by Assessment, Project Notes, etc.
- **Reuse Recordings**: Click "Use" to insert a previous recording
- **Multi-Select**: Select multiple recordings and combine them
- **Persistent Storage**: Recordings saved locally (up to 50 recent)

#### AI Enhancement

After transcription, you can enhance the text with AI:

1. **Click "Enhance with AI"**: After transcription completes
2. **AI Processing**: Text is rewritten using BCA industry best practices
3. **Review Both Versions**: Original and enhanced versions displayed
4. **Choose Version**: Click "Use Enhanced" or "Use Original"
5. **Text Inserted**: Selected version is added to the field

#### Offline Recording

Voice recording works even without internet connection:

1. **Record Offline**: Record as normal when offline
2. **Automatic Queue**: Recording is saved to IndexedDB
3. **Queue Status**: WiFi icon shows offline status with pending count
4. **Auto-Upload**: When connection returns, recordings are automatically uploaded and transcribed
5. **View Queue**: Click queue icon to see pending recordings
6. **Manual Retry**: Retry failed uploads if needed

### Photo Upload & AI Analysis

#### Uploading Photos

1. **Open Assessment Dialog**: Start or edit an assessment
2. **Upload Photo**: Drag and drop or click to select
3. **Automatic Geolocation**: GPS coordinates captured automatically (if available)
4. **OCR Extraction**: Text is extracted from the image (equipment labels, serial numbers)
5. **Photo Saved**: Uploaded to S3 storage

#### AI Photo Assessment

After uploading a photo, you can analyze it with AI:

1. **Click "Analyze with AI"**: Button appears after photo upload
2. **AI Processing**: Gemini Vision API analyzes the image (3-5 seconds)
3. **Results Populated**:
   - **Condition Rating**: Automatically set based on visual analysis
   - **Observations**: Technical description of visible conditions
   - **Recommendations**: Maintenance actions based on assessment
4. **Review & Adjust**: Edit AI suggestions before saving
5. **Save Assessment**: Click "Save Assessment"

#### Photo Gallery

- **View Photos**: On the Photos tab in project details
- **Bulk Upload**: Upload multiple photos at once
- **Delete Photos**: Remove unwanted images
- **Download Photos**: Download full-resolution images

### Document Management

#### Uploading Documents

**Project-Level Documents:**

1. **Open Project**: Navigate to project details
2. **Click "Documents" Tab**: View all project documents
3. **Upload Document**: Drag and drop PDF/Word files
4. **Document Saved**: Stored in S3 with metadata
5. **View Count**: Document count badge shows on project card

**Assessment-Level Documents:**

1. **Edit Assessment**: Open assessment dialog
2. **Scroll to Documents Section**: At the bottom of the form
3. **Upload Document**: Drag and drop files
4. **Link to Assessment**: Documents are associated with the specific assessment

#### Managing Documents

- **Download**: Click download icon to save locally
- **Delete**: Click delete icon to remove (admin/owner only)
- **View List**: See all documents with upload dates and file sizes

### AI Document Import

Import existing BCA reports (PDF/Word) and extract structured data automatically.

#### Importing a Document

1. **Navigate to Projects**: Go to the Projects page
2. **Click "AI Import from Document"**: In the page header
3. **Upload File**: Select PDF or Word document (max 10MB)
4. **AI Processing**: Document is analyzed and data extracted
   - Project information
   - Assessments with component codes, conditions, costs
   - Deficiencies with descriptions and priorities
5. **Review Extracted Data**: Preview shows all extracted information
6. **Edit if Needed**: Modify any fields before committing
7. **Click "Import to Database"**: Data is saved as a new project

**Supported Formats:**
- PDF (up to 10MB)
- Microsoft Word (.docx)

**What Gets Extracted:**
- Project name, address, client information
- Building components with UNIFORMAT codes
- Condition ratings and observations
- Estimated costs and service life
- Deficiencies with severity levels
- Recommendations

---

## Advanced Features

### Building Code Compliance Checking

Analyze assessments against selected building codes to identify potential violations.

#### Checking Compliance

1. **Select Building Code**: When creating a project, choose applicable code (NBC, BC, Alberta)
2. **Complete Assessment**: Fill in component assessment details
3. **Click "Check Building Code Compliance"**: On the assessment list
4. **AI Analysis**: Assessment is compared against building code requirements
5. **Review Results**:
   - **Compliance Status**: Compliant, Minor Issues, Major Issues, Critical
   - **Issues Found**: List of potential violations with:
     - Severity (Critical, Major, Minor, Info)
     - Code Section reference
     - Description of issue
     - Recommendation for remediation
6. **Take Action**: Address identified issues

### Cost Estimation Engine

Automatically estimate repair and replacement costs using RS Means-based pricing.

#### Estimating Costs

1. **Navigate to Assessment Tab**: In project details
2. **Click "Estimate Missing Costs"**: Button at the top
3. **Confirmation Dialog**: Review components without cost estimates
4. **Click "Estimate Costs"**: AI calculates costs based on:
   - UNIFORMAT II component type
   - Condition rating (multiplier applied)
   - Regional adjustment (Vancouver BC)
   - Industry pricing data
5. **Costs Updated**: Estimated repair costs and replacement values populated
6. **Review & Adjust**: Edit estimates as needed

### Predictive Analytics

Forecast future building conditions and maintenance needs.

#### Viewing Predictions

1. **Navigate to Dashboard Tab**: In project details
2. **View Deterioration Curves**: Visual representation of component degradation over time
3. **Risk Analysis**: Components ranked by risk level
4. **AI Insights**: Machine learning identifies patterns and accelerated deterioration
5. **What-If Scenarios**: Compare different maintenance strategies

### Financial Planning

Generate multi-year capital expenditure forecasts.

#### Accessing Financial Planning

1. **Navigate to Dashboard Tab**: In project details
2. **View Expenditure Forecast Chart**: 5-year cost projections by UNIFORMAT system
3. **Review Data Table**: Detailed breakdown by building system and time period
4. **Export Data**: Download Excel or CSV for further analysis

### FCI Calculation

The **Facility Condition Index (FCI)** is automatically calculated:

**Formula:** FCI = (Total Repair Cost / Total Replacement Value) × 100

**Rating Scale:**
- **Good**: 0-5% (Excellent condition)
- **Fair**: 5-10% (Acceptable condition)
- **Poor**: 10-30% (Requires attention)
- **Critical**: >30% (Immediate action needed)

**Where to Find FCI:**
- Project dashboard widget
- Dashboard tab in project details
- Financial planning reports
- Exported reports

---

## Mobile Field Assessments

The BCA System is optimized for mobile devices, enabling efficient on-site assessments.

### Mobile Features

- **Responsive Design**: Works on phones and tablets
- **Touch-Optimized**: Large buttons and touch targets (44px minimum)
- **Offline Capable**: Record assessments without internet
- **Voice Input**: Hands-free data entry
- **Photo Capture**: Take photos directly from device camera
- **Geolocation**: Automatic GPS tagging of photos

### Mobile Workflow

1. **Access on Mobile**: Open BCA System in mobile browser
2. **Navigate to Project**: Select your project
3. **Select Asset**: Choose the building/facility
4. **Start Assessment**: Tap on component to assess
5. **Use Voice Input**: Dictate observations hands-free
6. **Take Photos**: Capture condition photos with device camera
7. **Save Assessment**: Data syncs when online

### Mobile Tips

- **Use Landscape Mode**: For better form visibility
- **Enable Location Services**: For automatic GPS tagging
- **Allow Microphone Access**: For voice recording
- **Work Offline**: Assessments save locally and sync later
- **Check Queue**: View pending uploads in offline queue widget

---

## Reporting & Analytics

### Generating Reports

#### PDF Reports

1. **Navigate to Project**: Open project details
2. **Click "Generate PDF Report"**: In the dropdown menu
3. **Report Generated**: Comprehensive BCA report with:
   - Executive summary
   - Project information
   - All assessments with photos
   - Deficiencies list
   - Cost estimates
   - FCI analysis
   - Recommendations
4. **Download**: PDF opens in new tab for download

#### Excel Reports

1. **Navigate to Projects**: Go to Projects page
2. **Select Projects**: Use checkboxes to select multiple projects
3. **Click "Export Selected"**: In the bulk actions toolbar
4. **Excel Generated**: Multi-sheet workbook with:
   - Summary sheet (all projects overview)
   - Per-project sheets (assessments, deficiencies)
5. **Download**: Excel file downloads automatically

#### CSV Exports

1. **Open Project**: Navigate to project details
2. **Click Dropdown Menu**: Three dots in header
3. **Select Export Format**:
   - Assessments (CSV)
   - Deficiencies (CSV)
4. **Download**: CSV file downloads with all data

### Dashboard Analytics

#### Project Dashboard

Access from project details → Dashboard tab:

- **Overall Condition Widget**: Building health score and FCI
- **Assessment Progress**: Status distribution (initial, active, completed)
- **Financial Planning**: 5-year cost forecast chart
- **Condition Matrix**: Summary by building system
- **Component Distribution**: Breakdown by condition rating

#### Portfolio Analytics

Access from Admin → Overview tab:

- **Total Projects**: Count and status breakdown
- **Active Assessments**: In-progress evaluations
- **Completed Projects**: Finished assessments
- **Portfolio FCI**: Average across all facilities
- **Cost Summary**: Total identified maintenance backlog

---

## Administration

### User Management

**Admin Only**

#### Viewing Users

1. **Navigate to Admin**: Click "Admin" in sidebar
2. **Click "Users" Tab**: View all registered users
3. **User Table Shows**:
   - Name, Email, Company, City
   - Role, Account Status
   - Last Sign-In date

#### Managing User Roles

1. **Find User**: Search or scroll to user
2. **Click Role Dropdown**: Select new role
   - Viewer
   - Editor
   - Project Manager
   - Admin
3. **Auto-Save**: Role updated immediately
4. **Self-Protection**: Cannot demote yourself

#### Managing Account Status

1. **Find User**: Locate user in table
2. **Click Status Dropdown**: Select status
   - Active
   - Trial
   - Suspended
   - Pending
3. **Auto-Save**: Status updated immediately

#### Approving Access Requests

1. **Navigate to Admin**: Click "Admin" in sidebar
2. **Click "Access Requests" Tab**: View pending requests
3. **Review Request**: Check user information and use case
4. **Click "Approve"**:
   - Edit company name if needed
   - Assign role (default: Editor)
   - Set account status (Active or Trial)
   - Add admin notes
   - Click "Approve Request"
5. **User Notified**: User receives approval email

#### Rejecting Access Requests

1. **View Pending Requests**: In Access Requests tab
2. **Click "Reject"**: On the request
3. **Provide Reason**: Enter rejection reason (shown to user)
4. **Add Admin Notes**: Internal notes (not shown to user)
5. **Click "Reject Request"**: User is notified

### Project Sharing

**Project Manager & Admin**

#### Sharing a Project

1. **Open Project**: Navigate to project details
2. **Click "Share"**: In the dropdown menu
3. **Select User**: Choose user from dropdown
4. **Set Permission**: Read or Write
5. **Click "Share Project"**: User gains access
6. **Notification**: User can now see the project

#### Removing Access

1. **Open Project**: Navigate to project details
2. **Click "Share"**: View shared users
3. **Click "Remove"**: Next to user
4. **Confirm**: User loses access immediately

### Audit Logs

**Admin Only**

#### Viewing Audit Logs

1. **Navigate to Admin**: Click "Admin" in sidebar
2. **Click "Audit Logs" Tab**: View all system activity
3. **Filter Logs**:
   - By user
   - By action type (create, update, delete, login, etc.)
   - By date range
   - By entity type (project, assessment, user, etc.)
4. **Export Logs**: Download CSV for compliance audits

#### Authentication Logs

- Login attempts (successful and failed)
- Logout events
- Session timeouts
- Account lockouts
- SAML authentication events

#### Configuration Logs

- Role changes
- Permission changes
- System settings modifications
- SAML configuration changes
- Retention policy changes
- Encryption key rotations

### Compliance & Security

**Admin Only**

#### Data Security Dashboard

1. **Navigate to Admin**: Click "Admin" in sidebar
2. **Click "Data Security" Tab**: View security settings
3. **Review Encryption**: TLS 1.3 in transit, AES-256 at rest
4. **Data Ownership**: City retains sole ownership
5. **Retention Policies**: 7-year default for all data
6. **Disposal Requests**: Manage secure data purging

#### Compliance Dashboard

1. **Navigate to Admin**: Click "Admin" in sidebar
2. **Click "Compliance" Tab**: View compliance metrics
3. **Review Metrics**:
   - Audit coverage percentage
   - User consent rates
   - Data retention compliance
   - Security incident count
4. **Generate Reports**: Export compliance reports for audits

---

## Troubleshooting

### Common Issues

#### Voice Recording Not Working

**Problem:** Microphone button doesn't work or transcription fails

**Solutions:**

1. **Check Browser Permissions**:
   - Chrome: Click lock icon → Microphone → Allow
   - Safari: Settings → Websites → Microphone → Allow
   - Firefox: Click microphone icon → Allow
2. **Test Microphone**: Click "Test Microphone" before recording
3. **Check Internet**: Transcription requires internet connection
4. **Retry**: Click "Try Again" if permission was denied
5. **Clear Browser Cache**: Sometimes helps with permission issues

#### Photos Not Uploading

**Problem:** Photo upload fails or doesn't appear

**Solutions:**

1. **Check File Size**: Max 10MB per photo
2. **Check File Format**: JPG, PNG, HEIC supported
3. **Check Internet**: Upload requires connection
4. **Wait for Upload**: Large files take time
5. **Retry**: Click upload again if failed

#### Projects Not Showing

**Problem:** Projects page shows "No projects yet" but projects exist

**Solutions:**

1. **Check Company Filter**: Ensure correct company selected (admins)
2. **Check Role**: Viewers can only see projects shared with them
3. **Use Admin Dashboard**: Navigate to Admin → Projects tab as workaround
4. **Refresh Page**: Sometimes cache needs clearing
5. **Contact Admin**: Request access to specific projects

#### AI Import Fails

**Problem:** Document import shows error message

**Solutions:**

1. **Check File Size**: Max 10MB
2. **Check File Type**: PDF or Word (.docx) only
3. **Check File Content**: Must contain text (not scanned images)
4. **Minimum Text**: Document must have at least 100 characters
5. **Try Smaller File**: Split large documents into sections
6. **Check Internet**: AI processing requires connection

#### Session Timeout

**Problem:** Logged out unexpectedly

**Solutions:**

1. **Activity Timeout**: 30 minutes of inactivity triggers logout
2. **Warning Dialog**: 2-minute warning appears before logout
3. **Stay Active**: Click anywhere to reset timer
4. **Save Work Frequently**: Prevent data loss
5. **Log Back In**: Simply log in again to continue

---

## FAQ

### General Questions

**Q: What browsers are supported?**  
A: Chrome, Firefox, Safari, Edge (latest versions). Mobile browsers also supported.

**Q: Can I use the system offline?**  
A: Yes, voice recordings and assessments can be saved offline and synced when connection returns.

**Q: How much does it cost?**  
A: Contact your administrator for pricing information.

**Q: Is my data secure?**  
A: Yes. TLS 1.3 encryption in transit, AES-256 encryption at rest, complete audit trails, and enterprise-grade security.

### Account & Access

**Q: How do I get an account?**  
A: Sign in with Manus OAuth, submit an access request, and wait for admin approval (24-48 hours).

**Q: I forgot my password. What do I do?**  
A: The system uses OAuth (no passwords). Click "Login" and use your social login (Google, Microsoft, etc.).

**Q: Can I change my role?**  
A: No. Only admins can change user roles. Contact your administrator.

**Q: How do I request access to a project?**  
A: Contact the project owner or admin to share the project with you.

### Assessments

**Q: What is UNIFORMAT II?**  
A: A standard classification system for building components (A-G major groups, with sub-levels).

**Q: Can I create custom components?**  
A: Yes. Click "Add Custom Component" in the assessment page to create project-specific components.

**Q: How accurate is the AI photo analysis?**  
A: 98% accuracy rate. Always review and adjust AI suggestions before saving.

**Q: Can I edit an assessment after saving?**  
A: Yes. Click the edit icon on any assessment to modify it.

**Q: What happens to deleted assessments?**  
A: Assessments are permanently deleted (no recovery). Use caution.

### Voice Recording

**Q: What languages are supported?**  
A: English is primary. Other languages may work but accuracy varies.

**Q: How long can I record?**  
A: No strict limit, but keep recordings under 5 minutes for best results.

**Q: Can I use voice recording offline?**  
A: Yes. Recordings are saved locally and transcribed when you're back online.

**Q: Why is transcription slow?**  
A: Transcription typically takes 3-10 seconds. Large files (>1MB) take longer.

### Reports

**Q: Can I customize reports?**  
A: Currently, reports use a standard template. Custom templates coming soon.

**Q: How do I share a report?**  
A: Generate PDF and download, then share via email or file sharing.

**Q: Can I export to Excel?**  
A: Yes. Use "Export Selected" for multi-project Excel exports, or CSV for individual projects.

**Q: Are photos included in PDF reports?**  
A: Yes. Up to 4 photos per assessment are included in PDF reports.

### Technical

**Q: Why is the site slow?**  
A: Check your internet connection. Large file uploads/downloads can slow performance.

**Q: Can I use the system on my phone?**  
A: Yes. The system is fully responsive and optimized for mobile devices.

**Q: What if I encounter a bug?**  
A: Contact your administrator or submit a support ticket with details.

**Q: How often is the system updated?**  
A: Regular updates are deployed. Check the version number in the footer.

---

## Support

### Getting Help

**Technical Support:**
- Email: support@bcasystem.com
- Phone: (555) 123-4567
- Hours: Monday-Friday, 9 AM - 5 PM PST

**Documentation:**
- User Guide: This document
- Video Tutorials: Coming soon
- Knowledge Base: help.bcasystem.com

**Training:**
- New User Onboarding: Contact your administrator
- Advanced Features Training: Available upon request
- Custom Training Sessions: Available for teams

---

## Appendix

### Keyboard Shortcuts

- **Ctrl/Cmd + K**: Global search
- **Ctrl/Cmd + N**: New project (Projects page)
- **Ctrl/Cmd + S**: Save assessment (Assessment dialog)
- **Esc**: Close dialog/modal

### UNIFORMAT II Quick Reference

| Code | System | Examples |
|------|--------|----------|
| A | Substructure | Foundations, basement walls |
| B | Shell | Roof, exterior walls, windows |
| C | Interiors | Partitions, doors, finishes |
| D | Services | Plumbing, HVAC, electrical |
| E | Equipment | Furnishings, equipment |
| F | Special Construction | Special facilities |
| G | Sitework | Landscaping, paving, utilities |

### Condition Rating Scale

| Rating | ESL Remaining | Description |
|--------|---------------|-------------|
| Good | 75-100% | Excellent condition, minimal wear |
| Fair | 50-75% | Acceptable condition, some wear |
| Poor | 25-50% | Significant deterioration, repairs needed |
| Critical | 0-25% | Severe deterioration, immediate action required |

### FCI Rating Scale

| FCI % | Rating | Action Required |
|-------|--------|-----------------|
| 0-5% | Good | Routine maintenance |
| 5-10% | Fair | Planned maintenance |
| 10-30% | Poor | Significant repairs needed |
| >30% | Critical | Major capital investment required |

---

**End of User Guide**

*For the latest version of this guide, visit the Help section in the application.*
