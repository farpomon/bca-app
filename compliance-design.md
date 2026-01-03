# Building Code Compliance Checking Design

## Overview
AI-powered compliance checking that analyzes assessment observations against the project's selected building code PDF document.

## Workflow

### When to Trigger
1. **Manual**: User clicks "Check Compliance" button on individual assessment
2. **Bulk**: User selects multiple assessments and runs batch compliance check
3. **Future**: Auto-check on assessment creation/update (optional setting)

### What to Analyze
- Assessment observations text
- Component type and condition
- Deficiency descriptions (if any)
- Project metadata (year built, property type, etc.)

### AI Analysis Process
1. Fetch project's selected building code (buildingCodeId → building code PDF URL)
2. Send to LLM with:
   - Building code PDF as file context
   - Assessment details as structured data
   - Prompt: "Analyze this building assessment against the building code. Identify any potential code violations, compliance concerns, or required actions."
3. Parse AI response into structured format

## Data Structure

### Assessment Table Additions
```sql
ALTER TABLE assessments ADD COLUMN complianceStatus VARCHAR(50); -- 'compliant', 'non_compliant', 'needs_review', 'not_checked'
ALTER TABLE assessments ADD COLUMN complianceIssues TEXT; -- JSON array of issues
ALTER TABLE assessments ADD COLUMN complianceRecommendations TEXT; -- JSON array of recommendations
ALTER TABLE assessments ADD COLUMN complianceCheckedAt TIMESTAMP;
ALTER TABLE assessments ADD COLUMN complianceCheckedBy INT; -- user ID
```

### Compliance Issue Format (JSON)
```json
{
  "status": "non_compliant",
  "issues": [
    {
      "severity": "high",
      "codeSection": "NBC 2020 Section 9.3.2.1",
      "description": "Fire separation requirements not met",
      "recommendation": "Install fire-rated barriers as per code requirements"
    }
  ],
  "checkedAt": "2025-01-15T10:30:00Z",
  "checkedBy": 1
}
```

## UI Components

### Assessment List
- Badge showing compliance status (green/yellow/red/gray)
- Filter by compliance status

### Assessment Detail
- "Check Compliance" button (primary action)
- Compliance status card with:
  - Status badge
  - Last checked timestamp
  - List of issues (if any)
  - Recommendations
  - Code section references (clickable links to PDF)

### Bulk Actions
- Select multiple assessments
- "Check Compliance" bulk action
- Progress indicator
- Summary report

## API Endpoints

### `assessments.checkCompliance`
- Input: `{ assessmentId: number }`
- Process:
  1. Fetch assessment + project + building code
  2. Call LLM with PDF context
  3. Parse response
  4. Update assessment compliance fields
- Output: Compliance result object

### `assessments.bulkCheckCompliance`
- Input: `{ assessmentIds: number[] }`
- Process: Loop through assessments, call checkCompliance for each
- Output: Array of compliance results

## Implementation Notes

- Use `invokeLLM` with file_url content type for PDF
- Cache building code PDFs to avoid repeated downloads
- Rate limit compliance checks to avoid API overuse
- Store raw AI response for debugging/audit trail
- Allow manual override of compliance status
