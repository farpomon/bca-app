# AI Document Import - Error Handling Documentation

## Overview

The AI Document Import feature now includes comprehensive error handling to provide clear, actionable error messages to users when document parsing fails.

## Error Types

### 1. ValidationError
**When it occurs:** Before processing begins, during input validation

**Common scenarios:**
- Empty file uploaded
- File size exceeds 10MB limit
- Unsupported file type (not PDF or Word)
- Document contains insufficient text (<100 characters)

**Example messages:**
- "File is empty"
- "File size (11.00MB) exceeds maximum allowed size (10MB)"
- "Unsupported document type: text/plain. Only PDF and Word documents (.docx) are supported."
- "Document contains insufficient text for analysis. Please ensure the document contains a building condition assessment report."

### 2. DocumentParsingError
**When it occurs:** During text extraction from PDF or Word documents

**Common scenarios:**
- Corrupted PDF file
- Invalid PDF structure
- PDF with no extractable text (scanned images)
- Word document parsing failure
- Error extracting specific pages

**Example messages:**
- "PDF file is empty"
- "PDF has no pages or is corrupted"
- "PDF contains no extractable text. The document may be scanned or image-based."
- "Failed to extract text from page 5"
- "Word document contains no extractable text"

### 3. AIExtractionError
**When it occurs:** During AI analysis of extracted text

**Common scenarios:**
- AI service unavailable
- Invalid JSON response from AI
- AI response missing required fields
- Network timeout during AI call
- Could not identify project name in document

**Example messages:**
- "No valid response from AI. The AI service may be unavailable."
- "AI returned invalid JSON response"
- "AI response missing required fields (project, assessments, or deficiencies)"
- "Could not identify a project name in the document. Please ensure this is a building condition assessment report."

### 4. Network Errors
**When it occurs:** During file upload or download

**Example messages:**
- "Failed to download document. Please check your internet connection and try again."
- "Failed to fetch document from storage (HTTP 404)"

## Implementation Details

### Backend (server/ai-document-parser.ts)

**Custom error classes:**
```typescript
export class ValidationError extends Error
export class DocumentParsingError extends Error
export class AIExtractionError extends Error
```

**Error handling flow:**
1. Validate file size and MIME type → `ValidationError`
2. Extract text from document → `DocumentParsingError`
3. Validate extracted text length → `ValidationError`
4. Call AI for data extraction → `AIExtractionError`
5. Validate AI response structure → `AIExtractionError`

### Backend (server/routers.ts)

**tRPC endpoint error handling:**
- Catches custom error types and maps to appropriate HTTP status codes
- `ValidationError` → 400 BAD_REQUEST
- `DocumentParsingError` → 400 BAD_REQUEST
- `AIExtractionError` → 500 INTERNAL_SERVER_ERROR
- Network errors → 400 BAD_REQUEST with descriptive message

### Frontend (client/src/components/AIImportDialog.tsx)

**User-facing error handling:**
- Extracts error message from tRPC error response
- Displays detailed error in toast notification with 6-second duration
- Includes helpful description: "Please check the document format and try again."
- Clears uploaded file on error to allow retry
- Resets dialog to upload state

## Error Logging

All errors are logged with contextual information:

```typescript
console.error('[AI Parser] Document parsing failed:', {
  errorType: error.constructor.name,
  message: error.message,
  mimeType,
  bufferSize
});
```

This helps with debugging and monitoring in production.

## User Experience

### Before Error Handling
- Generic "Failed to parse document" message
- No indication of what went wrong
- Users confused about next steps

### After Error Handling
- Specific error message (e.g., "File size exceeds 10MB")
- Clear indication of the problem
- Actionable guidance (e.g., "Please check the document format")
- File automatically cleared to allow retry

## Testing

Error handling has been validated with the following test scenarios:

1. ✅ Empty buffer → ValidationError
2. ✅ File too large (>10MB) → ValidationError
3. ✅ Unsupported MIME type → ValidationError
4. ✅ Invalid PDF content → DocumentParsingError

All tests pass and throw the correct error types with appropriate messages.

## Validation Rules

| Rule | Limit | Error Type |
|------|-------|------------|
| File size | Max 10MB | ValidationError |
| File types | PDF, Word (.docx) only | ValidationError |
| Minimum text | 100 characters | ValidationError |
| PDF pages | Must have at least 1 page | DocumentParsingError |
| Text extraction | Must extract some text | DocumentParsingError |
| AI response | Must include project name | AIExtractionError |

## Future Improvements

1. **OCR Support**: Add optical character recognition for scanned PDFs
2. **Batch Processing**: Allow multiple document uploads
3. **Progress Indicators**: Show detailed progress during long operations
4. **Retry Logic**: Automatic retry for transient AI service errors
5. **Error Analytics**: Track error types to identify common issues
