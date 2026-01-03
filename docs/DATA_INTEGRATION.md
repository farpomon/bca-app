# Data Integration Architecture

**Building Condition Assessment System**  
**SAP and TRIRIGA Integration**  
**Version 1.0**  
**Date: December 2024**

---

## Executive Summary

This document defines the data integration architecture for the Building Condition Assessment (BCA) System, establishing unidirectional data flow from the City's existing SAP and TRIRIGA platforms into the BCA cloud system. The integration enables automated import of master data, maintenance history, and asset details from systems of record while providing annual bulk export capabilities for physical condition ratings back to the City's TRIRIGA team.

The integration architecture follows enterprise integration patterns with scheduled batch imports, comprehensive error handling, and audit logging. Data transformations map SAP and TRIRIGA data structures to the BCA system's normalized schema while preserving data lineage and enabling reconciliation. The system supports both full initial loads and incremental updates to maintain data currency without performance impact.

Annual bulk exports provide TRIRIGA administrators with standardized CSV or Excel files containing physical condition ratings for the entire building portfolio, enabling manual updates to the City's facility management system without complex bidirectional integration.

---

## 1. Integration Overview

### 1.1 Integration Scope

**Data Sources**:
- **SAP**: Enterprise resource planning system containing financial data, procurement records, and maintenance work orders
- **TRIRIGA**: Integrated workplace management system (IWMS) containing facility data, space management, and asset records

**Data Direction**: **Unidirectional** (SAP/TRIRIGA → BCA System)
- Import master data FROM City systems INTO BCA system
- NO automated data push back TO City systems
- Manual annual export for TRIRIGA updates

**Data Types Imported**:
- Building and facility master data
- Asset details and specifications
- Maintenance history and work orders
- Space and occupancy information
- Financial data (capital costs, replacement values)

### 1.2 Integration Architecture

The integration follows a **batch-oriented Extract-Transform-Load (ETL)** pattern:

**Extract**: Data is extracted from SAP and TRIRIGA using their respective APIs or database connections. Extraction queries are optimized to retrieve only changed records (incremental sync) after initial full load.

**Transform**: Extracted data is transformed to match the BCA system's data model. Transformations include field mapping, data type conversions, business rule application, and data quality validation.

**Load**: Transformed data is loaded into the BCA database using upsert operations (insert new records, update existing records). Load operations maintain referential integrity and generate audit logs.

**Scheduling**: Integrations run on configurable schedules (daily, weekly) during off-peak hours to minimize performance impact. Manual triggers are available for ad-hoc imports.

### 1.3 Integration Patterns

**Full Load**: Initial integration performs complete data extraction and load. All relevant records from source systems are imported to establish baseline dataset.

**Incremental Load**: Subsequent integrations extract only records modified since last successful import. Incremental loads use change tracking mechanisms (timestamps, change data capture) to identify modified records.

**Upsert Strategy**: Load operations use unique business keys to match incoming records with existing database records. Matching records are updated; new records are inserted.

**Error Handling**: Integration errors (connection failures, data validation failures, transformation errors) are logged and reported. Failed records are quarantined for manual review while successful records are loaded.

---

## 2. SAP Integration

### 2.1 SAP Data Sources

The BCA system integrates with the following SAP modules and tables:

**SAP Plant Maintenance (PM)**:
- Equipment Master (EQUI table): Asset details, specifications, installation dates
- Functional Locations (IFLOT table): Building hierarchy, location codes
- Maintenance Orders (AUFK table): Work order history, maintenance activities
- Notifications (QMEL table): Defect reports, maintenance requests

**SAP Financial Accounting (FI)**:
- Asset Accounting (ANLA table): Capital costs, depreciation, replacement values
- Cost Centers (CSKS table): Budget allocation, cost tracking

**SAP Materials Management (MM)**:
- Material Master (MARA table): Component specifications, spare parts
- Purchase Orders (EKKO/EKPO tables): Procurement history for capital projects

### 2.2 SAP Data Mapping

Key SAP fields are mapped to BCA system entities:

**Building/Facility Mapping** (SAP Functional Location → BCA Building):

| SAP Field | SAP Table | BCA Field | Transformation |
|-----------|-----------|-----------|----------------|
| TPLNR | IFLOT | buildingCode | Direct mapping |
| PLTXT | IFLOT | buildingName | Direct mapping |
| STRNO | IFLOT | streetAddress | Direct mapping |
| PSTLZ | IFLOT | postalCode | Direct mapping |
| ORT01 | IFLOT | city | Direct mapping |
| EQART | IFLOT | buildingType | Lookup table mapping |
| INBDT | IFLOT | constructionYear | Extract year from date |

**Asset Mapping** (SAP Equipment → BCA Asset):

| SAP Field | SAP Table | BCA Field | Transformation |
|-----------|-----------|-----------|----------------|
| EQUNR | EQUI | assetNumber | Direct mapping |
| EQKTX | EQUI | assetDescription | Direct mapping |
| EQART | EQUI | assetType | Lookup table mapping |
| ANSDT | EQUI | installationDate | Date format conversion |
| HERST | EQUI | manufacturer | Direct mapping |
| TYPBZ | EQUI | modelNumber | Direct mapping |
| SERNR | EQUI | serialNumber | Direct mapping |

**Maintenance History Mapping** (SAP Maintenance Order → BCA Maintenance Record):

| SAP Field | SAP Table | BCA Field | Transformation |
|-----------|-----------|-----------|----------------|
| AUFNR | AUFK | workOrderNumber | Direct mapping |
| AUART | AUFK | maintenanceType | Lookup table mapping |
| GSTRP | AUFK | startDate | Date format conversion |
| GLTRP | AUFK | completionDate | Date format conversion |
| KTEXT | AUFK | workDescription | Direct mapping |
| WERKS | AUFK | location | Map to building via functional location |

### 2.3 SAP Connection Methods

**Option 1 - SAP OData Services** (Recommended):
- Modern REST-based API provided by SAP Gateway
- Supports filtering, pagination, change tracking
- Authentication via OAuth 2.0 or Basic Auth
- JSON response format for easy parsing

**Option 2 - SAP RFC (Remote Function Call)**:
- Traditional SAP integration method
- Requires SAP connector library
- Binary protocol with higher performance
- Authentication via SAP user credentials

**Option 3 - Database Direct Access**:
- Read-only connection to SAP database (Oracle, HANA)
- SQL queries against SAP tables
- Requires database credentials and network access
- Risk of schema changes breaking integration

**Recommended Approach**: SAP OData Services for maintainability and future-proofing. Fallback to RFC if OData not available.

### 2.4 SAP Integration Schedule

**Initial Full Load**: One-time complete data import during implementation
- Estimated duration: 4-8 hours depending on data volume
- Scheduled during weekend or maintenance window
- Validates data quality before production cutover

**Incremental Updates**: Regular scheduled imports of changed data
- **Frequency**: Daily at 2:00 AM
- **Change Detection**: Last modified timestamp (AEDAT field in SAP tables)
- **Duration**: 15-30 minutes typical

**Ad-Hoc Imports**: Manual trigger for immediate data refresh
- Available through admin interface
- Used for urgent data updates or troubleshooting
- Same transformation logic as scheduled imports

---

## 3. TRIRIGA Integration

### 3.1 TRIRIGA Data Sources

The BCA system integrates with TRIRIGA modules:

**Real Estate Module**:
- Buildings: Facility master data, addresses, ownership
- Floors: Floor plans, square footage, occupancy
- Spaces: Room details, usage classification

**Capital Projects Module**:
- Projects: Capital improvement projects, budgets, timelines
- Project Costs: Actual vs. budgeted costs

**Maintenance Module**:
- Work Orders: Maintenance and repair history
- Service Requests: User-reported issues
- Preventive Maintenance: Scheduled maintenance tasks

**Assets Module**:
- Equipment: Asset register, specifications
- Asset Hierarchy: Parent-child relationships

### 3.2 TRIRIGA Data Mapping

**Building Mapping** (TRIRIGA Building → BCA Building):

| TRIRIGA Field | BCA Field | Transformation |
|---------------|-----------|----------------|
| Building Number | buildingCode | Direct mapping |
| Building Name | buildingName | Direct mapping |
| Address | streetAddress | Direct mapping |
| City | city | Direct mapping |
| State/Province | province | Direct mapping |
| Postal Code | postalCode | Direct mapping |
| Building Type | buildingType | Lookup table mapping |
| Gross Area | grossArea | Unit conversion (sq ft → sq m) |
| Year Built | constructionYear | Direct mapping |
| Replacement Value | replacementValue | Currency conversion if needed |

**Space Mapping** (TRIRIGA Space → BCA Space):

| TRIRIGA Field | BCA Field | Transformation |
|---------------|-----------|----------------|
| Space ID | spaceCode | Direct mapping |
| Space Name | spaceName | Direct mapping |
| Floor | floor | Direct mapping |
| Space Type | spaceType | Lookup table mapping |
| Area | area | Unit conversion |
| Occupancy | occupancy | Direct mapping |

**Maintenance Mapping** (TRIRIGA Work Order → BCA Maintenance Record):

| TRIRIGA Field | BCA Field | Transformation |
|---------------|-----------|----------------|
| Work Order Number | workOrderNumber | Direct mapping |
| Work Type | maintenanceType | Lookup table mapping |
| Status | status | Status code mapping |
| Created Date | createdDate | Date format conversion |
| Completed Date | completionDate | Date format conversion |
| Description | workDescription | Direct mapping |
| Cost | cost | Currency conversion if needed |

### 3.3 TRIRIGA Connection Methods

**Option 1 - TRIRIGA REST API** (Recommended):
- RESTful web services provided by TRIRIGA
- JSON or XML response formats
- OAuth or Basic authentication
- Supports filtering and pagination

**Option 2 - TRIRIGA OSLC API**:
- Open Services for Lifecycle Collaboration standard
- RDF/XML or JSON-LD formats
- Standardized query language
- Better for complex queries

**Option 3 - Database Direct Access**:
- Read-only connection to TRIRIGA database
- SQL queries against TRIRIGA tables
- Requires understanding of TRIRIGA data model
- Risk of schema changes

**Recommended Approach**: TRIRIGA REST API for standard integration. OSLC API for complex queries or if already in use by City.

### 3.4 TRIRIGA Integration Schedule

**Initial Full Load**: One-time complete data import
- Estimated duration: 2-4 hours
- Scheduled during maintenance window
- Includes all buildings, spaces, and 5 years of maintenance history

**Incremental Updates**: Regular scheduled imports
- **Frequency**: Daily at 3:00 AM (offset from SAP import)
- **Change Detection**: Last modified date field
- **Duration**: 10-20 minutes typical

**Ad-Hoc Imports**: Manual trigger available through admin interface

---

## 4. Data Transformation and Validation

### 4.1 Data Quality Rules

Imported data is validated against quality rules before loading:

**Required Fields**: Critical fields must be populated
- Building code, name, address (for buildings)
- Asset number, type (for assets)
- Work order number, date (for maintenance records)

**Data Type Validation**: Fields must match expected data types
- Dates in valid format (ISO 8601)
- Numbers within reasonable ranges
- Text fields within length limits

**Referential Integrity**: Foreign key relationships must be valid
- Assets must reference existing buildings
- Maintenance records must reference existing assets
- Spaces must reference existing buildings/floors

**Business Rules**: Domain-specific validation
- Construction year must be between 1800 and current year
- Building area must be positive number
- Maintenance costs must be non-negative

**Duplicate Detection**: Prevent duplicate records
- Check for existing records with same business key
- Flag potential duplicates for manual review

### 4.2 Data Transformation Logic

**Unit Conversions**:
- Area: Square feet → Square meters (multiply by 0.092903)
- Length: Feet → Meters (multiply by 0.3048)
- Currency: USD → CAD (apply current exchange rate if needed)

**Date Format Standardization**:
- SAP dates (YYYYMMDD) → ISO 8601 (YYYY-MM-DD)
- TRIRIGA dates (various formats) → ISO 8601
- Store in database as UTC timestamps

**Code Mapping**:
- Building types: SAP/TRIRIGA codes → BCA standard codes
- Maintenance types: Work order types → BCA maintenance categories
- Status codes: Source system statuses → BCA workflow statuses

**Text Normalization**:
- Trim leading/trailing whitespace
- Convert to consistent case (Title Case for names)
- Remove special characters where appropriate

### 4.3 Error Handling

**Validation Errors**: Records failing validation are quarantined
- Error details logged with field name and validation rule failed
- Quarantined records available for review in admin interface
- Manual correction and retry available

**Connection Errors**: Network or authentication failures
- Automatic retry with exponential backoff (3 attempts)
- Alert sent to administrators after failed retries
- Integration marked as failed in monitoring dashboard

**Transformation Errors**: Unexpected data causing transformation failure
- Record skipped and logged
- Integration continues with remaining records
- Summary report shows skipped records

**Partial Success**: Some records succeed, others fail
- Successful records are loaded
- Failed records quarantined for review
- Integration marked as "Completed with Errors"

---

## 5. Annual Bulk Export

### 5.1 Export Scope

The annual bulk export provides TRIRIGA administrators with physical condition ratings for the entire building portfolio:

**Export Contents**:
- Building identification (code, name, address)
- Most recent assessment date
- Physical condition rating (1-5 scale or A-F grade)
- Overall Facility Condition Index (FCI) if calculated
- Major deficiencies summary
- Assessor name
- Assessment completion status

**Export Frequency**: **Annual** (typically end of fiscal year)
- Scheduled export or manual trigger
- Historical exports retained for audit trail

**Export Formats**:
- CSV (Comma-Separated Values) for maximum compatibility
- Excel (XLSX) with formatted headers and data validation
- Optional PDF summary report with charts

### 5.2 Export Data Mapping

**CSV/Excel Column Structure**:

| Column Name | Data Source | Description |
|-------------|-------------|-------------|
| Building Code | buildings.code | Unique building identifier matching TRIRIGA |
| Building Name | buildings.name | Building name |
| Address | buildings.address | Street address |
| City | buildings.city | City |
| Assessment Date | assessments.completedAt | Date of most recent assessment |
| Condition Rating | assessments.overallRating | Physical condition rating (1-5 or A-F) |
| FCI | assessments.fci | Facility Condition Index (0.00-1.00) |
| Deficiencies | assessments.deficienciesSummary | Summary of major deficiencies |
| Assessor | users.name | Name of person who conducted assessment |
| Status | assessments.status | Assessment status (Complete, In Progress, etc.) |

**Rating Scale Mapping**:
- If BCA uses 1-5 scale, export as-is
- If BCA uses A-F grades, optionally convert to numeric (A=5, B=4, C=3, D=2, F=1)
- Include rating scale legend in export header or separate sheet

### 5.3 Export Generation Process

**Data Selection**:
1. Query all buildings in the system
2. For each building, retrieve most recent completed assessment
3. If no assessment exists, include building with "Not Assessed" status
4. Calculate FCI if not already stored
5. Aggregate deficiencies into summary text

**File Generation**:
- **CSV**: Generate using standard CSV library with proper escaping
- **Excel**: Use library (e.g., ExcelJS) to create formatted workbook
  - Header row with bold formatting
  - Data validation on rating columns
  - Freeze top row for scrolling
  - Auto-fit column widths

**File Storage**:
- Generated files stored in secure S3 bucket
- Unique filename with timestamp: `BCA_Condition_Ratings_YYYY-MM-DD.xlsx`
- Retention: 7 years for compliance
- Access restricted to administrators

**Download Delivery**:
- Admin downloads file through web interface
- Secure download link with expiration (24 hours)
- Download logged in audit trail
- Optional email delivery to designated recipients

### 5.4 Export Scheduling

**Scheduled Annual Export**:
- Configured to run automatically (e.g., March 31 for fiscal year-end)
- Email notification sent to administrators when export is ready
- Export available for download through admin interface

**Manual Export**:
- Admin can trigger export at any time
- Useful for mid-year reports or ad-hoc requests
- Same data selection and formatting as scheduled export

**Export History**:
- All generated exports retained with metadata
- Export history shows: Date generated, user who triggered, record count, download count
- Previous exports can be re-downloaded

---

## 6. Integration Security

### 6.1 Authentication

**SAP Authentication**:
- **Preferred**: OAuth 2.0 client credentials flow
- **Alternative**: SAP user account with read-only permissions
- Credentials stored in secure environment variables (not in code)
- Credential rotation every 90 days

**TRIRIGA Authentication**:
- **Preferred**: OAuth 2.0 or API key authentication
- **Alternative**: TRIRIGA service account with read-only role
- Credentials stored in secure environment variables
- Credential rotation every 90 days

**Credential Management**:
- Credentials stored in platform secrets management
- Never logged or displayed in user interfaces
- Encrypted at rest and in transit
- Access restricted to integration service

### 6.2 Network Security

**Connection Security**:
- All connections use TLS 1.3 encryption
- Certificate validation enforced
- No fallback to unencrypted connections

**Network Access**:
- Integration service connects to SAP/TRIRIGA from fixed IP addresses
- City IT can whitelist these IPs in firewall rules
- VPN or private network connection if required by City security policy

**API Rate Limiting**:
- Respect source system rate limits
- Implement throttling to avoid overwhelming source systems
- Retry with exponential backoff on rate limit errors

### 6.3 Data Security

**Data in Transit**:
- All data encrypted during transfer (TLS 1.3)
- No sensitive data in URL parameters or logs

**Data at Rest**:
- Imported data stored in encrypted database
- Export files encrypted in S3 storage
- Encryption keys managed separately from data

**Data Access**:
- Integration service uses dedicated database account
- Principle of least privilege (read/write only to necessary tables)
- All data access logged in audit trail

**Sensitive Data Handling**:
- Personal information (employee names, contact info) minimized
- Financial data (costs, budgets) access restricted to authorized users
- Data retention policies applied to imported data

---

## 7. Integration Monitoring

### 7.1 Monitoring Metrics

**Integration Success Metrics**:
- Integration runs completed successfully vs. failed
- Records imported per integration run
- Average integration duration
- Error rate (validation errors, transformation errors)

**Data Quality Metrics**:
- Percentage of records passing validation
- Duplicate detection rate
- Referential integrity violations
- Missing required fields

**Performance Metrics**:
- Integration execution time
- Records processed per minute
- Database load during integration
- API response times from source systems

### 7.2 Alerts and Notifications

**Integration Failure Alerts**:
- Email notification to administrators
- Alert includes error message and failed integration details
- Escalation if not acknowledged within 4 hours

**Data Quality Alerts**:
- Warning if error rate exceeds 5%
- Critical alert if error rate exceeds 20%
- Daily summary of quarantined records

**Performance Alerts**:
- Warning if integration duration exceeds 2x average
- Alert if integration impacts production performance

### 7.3 Integration Logs

**Execution Logs**:
- Start and end time of each integration run
- Records extracted, transformed, loaded
- Errors encountered and resolution
- Integration status (Success, Failed, Completed with Errors)

**Audit Logs**:
- All data changes tracked (insert, update, delete)
- Source system and record identifier
- Timestamp and user/service account
- Before and after values for updates

**Log Retention**:
- Integration logs: 90 days
- Audit logs: 7 years (compliance requirement)
- Logs stored in centralized logging system

---

## 8. Integration Administration

### 8.1 Admin Interface Features

**Integration Dashboard**:
- Status of last integration run (Success/Failed)
- Next scheduled integration time
- Integration history (last 30 days)
- Error summary and quarantined records count

**Manual Integration Trigger**:
- Button to trigger immediate integration
- Confirmation dialog to prevent accidental triggers
- Progress indicator during execution
- Success/failure notification

**Integration Configuration**:
- Enable/disable scheduled integrations
- Adjust schedule (time of day, frequency)
- Configure connection parameters (URLs, credentials)
- Set data quality thresholds

**Error Review and Resolution**:
- List of quarantined records with error details
- Manual correction interface
- Retry individual records or batches
- Bulk actions (approve, reject, delete)

**Export Management**:
- Trigger annual export generation
- Download previous exports
- View export history and metadata
- Configure export recipients

### 8.2 Integration Testing

**Test Mode**:
- Dry-run integration without loading data
- Validates connections and data retrieval
- Reports potential errors without database changes
- Useful for testing after configuration changes

**Sandbox Environment**:
- Separate integration environment for testing
- Connects to SAP/TRIRIGA test systems if available
- Allows testing of new transformations or mappings
- No impact on production data

**Data Reconciliation**:
- Compare record counts between source and BCA systems
- Identify missing or extra records
- Validate data accuracy through sampling
- Generate reconciliation reports

---

## 9. Implementation Plan

### 9.1 Implementation Phases

**Phase 1 - Requirements and Design** (2 weeks):
- Finalize data mapping specifications
- Obtain SAP/TRIRIGA connection details and credentials
- Design database schema for imported data
- Document transformation rules

**Phase 2 - Development** (4 weeks):
- Implement SAP connector and data transformations
- Implement TRIRIGA connector and data transformations
- Build integration scheduling and error handling
- Develop admin interface for integration management
- Implement annual export functionality

**Phase 3 - Testing** (2 weeks):
- Unit testing of transformation logic
- Integration testing with SAP/TRIRIGA test systems
- Data quality validation
- Performance testing with production data volumes
- User acceptance testing of admin interface

**Phase 4 - Initial Load** (1 week):
- Execute initial full load from SAP
- Execute initial full load from TRIRIGA
- Data quality review and correction
- Reconciliation with source systems

**Phase 5 - Production Cutover** (1 week):
- Enable scheduled incremental integrations
- Monitor integration performance
- Address any production issues
- User training on admin interface

### 9.2 Prerequisites

**From City IT**:
- SAP connection details (URL, authentication method)
- TRIRIGA connection details (URL, authentication method)
- Service account credentials with read-only access
- Network access (firewall rules, VPN if needed)
- Sample data for testing
- Data mapping validation and approval

**From Vendor**:
- Integration service infrastructure provisioning
- Secure credential storage configuration
- Database schema updates
- Admin interface deployment
- Documentation and training materials

### 9.3 Success Criteria

**Integration Success**:
- 95%+ of records imported successfully
- Integration completes within 2 hours
- No production performance impact
- All critical data fields populated

**Data Quality**:
- 100% of buildings from TRIRIGA imported
- 95%+ of assets from SAP imported
- Referential integrity maintained
- No duplicate records

**Operational Readiness**:
- Administrators trained on integration management
- Monitoring and alerting operational
- Error resolution procedures documented
- Annual export successfully generated and delivered

---

## 10. Appendices

### Appendix A: SAP Table Reference

**Key SAP Tables**:
- **EQUI**: Equipment Master Data
- **IFLOT**: Functional Locations
- **AUFK**: Order Master Data
- **QMEL**: Quality Notifications
- **ANLA**: Asset Master Record
- **CSKS**: Cost Center Master Data
- **MARA**: General Material Data
- **EKKO**: Purchasing Document Header
- **EKPO**: Purchasing Document Item

### Appendix B: TRIRIGA Data Model

**Key TRIRIGA Business Objects**:
- **triBuilding**: Building master data
- **triFloor**: Floor information
- **triSpace**: Space/room details
- **triWorkTask**: Work orders and maintenance
- **triAsset**: Equipment and asset register
- **triProject**: Capital projects

### Appendix C: Sample Export File

```csv
Building Code,Building Name,Address,City,Assessment Date,Condition Rating,FCI,Deficiencies,Assessor,Status
BLD-001,City Hall,123 Main St,Springfield,2024-03-15,4,0.15,Minor roof wear; HVAC nearing end of life,John Smith,Complete
BLD-002,Fire Station #3,456 Oak Ave,Springfield,2024-02-28,3,0.35,Significant foundation cracks; Electrical panel outdated,Jane Doe,Complete
BLD-003,Community Center,789 Elm St,Springfield,,,,Not yet assessed,,Not Assessed
```

### Appendix D: Integration Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| INT-001 | Connection timeout | Check network connectivity; verify source system is online |
| INT-002 | Authentication failure | Verify credentials; check if account is locked |
| INT-003 | Required field missing | Review source data; update mapping to handle nulls |
| INT-004 | Data type mismatch | Update transformation logic; validate source data format |
| INT-005 | Referential integrity violation | Ensure parent records imported before child records |
| INT-006 | Duplicate record detected | Review business key definition; manual deduplication may be needed |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Manus AI | Initial Data Integration Architecture |

**Distribution**: City IT Department, Vendor Development Team

**Classification**: Confidential - Technical Documentation

**Next Review Date**: March 2025 (Post-Implementation Review)

**Approval**:
- City IT Integration Lead: _________________ Date: _______
- Vendor Technical Architect: _________________ Date: _______
