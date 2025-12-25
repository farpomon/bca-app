import mammoth from 'mammoth';
import { invokeLLM } from './_core/llm';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Custom error types for better error handling
export class DocumentParsingError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DocumentParsingError';
  }
}

export class AIExtractionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AIExtractionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Extract text from PDF buffer using pdf.js
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log(`[PDF Parser] Starting PDF text extraction, size: ${buffer.length} bytes`);
    
    if (buffer.length === 0) {
      throw new DocumentParsingError('PDF file is empty');
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDocument = await loadingTask.promise;
    
    if (!pdfDocument || pdfDocument.numPages === 0) {
      throw new DocumentParsingError('PDF has no pages or is corrupted');
    }
    
    console.log(`[PDF Parser] PDF has ${pdfDocument.numPages} pages`);
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n\n=== PAGE ${pageNum} ===\n${pageText}`;
      } catch (pageError) {
        console.error(`[PDF Parser] Error extracting page ${pageNum}:`, pageError);
        throw new DocumentParsingError(
          `Failed to extract text from page ${pageNum}`,
          pageError instanceof Error ? pageError : undefined
        );
      }
    }
    
    if (fullText.trim().length === 0) {
      throw new DocumentParsingError('PDF contains no extractable text. The document may be scanned or image-based.');
    }
    
    console.log(`[PDF Parser] Successfully extracted ${fullText.length} characters`);
    return fullText;
  } catch (error) {
    if (error instanceof DocumentParsingError) {
      throw error;
    }
    console.error('[PDF Parser] Unexpected error:', error);
    throw new DocumentParsingError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Extract text from Word document buffer
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    console.log(`[Word Parser] Starting Word text extraction, size: ${buffer.length} bytes`);
    
    if (buffer.length === 0) {
      throw new DocumentParsingError('Word document is empty');
    }
    
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result || !result.value) {
      throw new DocumentParsingError('Failed to extract text from Word document');
    }
    
    if (result.value.trim().length === 0) {
      throw new DocumentParsingError('Word document contains no extractable text');
    }
    
    console.log(`[Word Parser] Successfully extracted ${result.value.length} characters`);
    return result.value;
  } catch (error) {
    if (error instanceof DocumentParsingError) {
      throw error;
    }
    console.error('[Word Parser] Unexpected error:', error);
    throw new DocumentParsingError(
      `Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Use AI to extract structured BCA data from document text
 */
export async function extractBCADataWithAI(text: string) {
  console.log(`[AI Parser] Analyzing ${text.length} characters of text`);
  
  const prompt = `You are an expert building condition assessment (BCA) analyst. Extract structured data from this building assessment report.

UNIFORMAT II Level 2 Component Codes (use these exact codes):
- A10: Foundations
- A20: Basement Construction
- B10: Superstructure
- B20: Exterior Enclosure
- B30: Roofing
- C10: Interior Construction
- C20: Stairs
- C30: Interior Finishes
- D10: Conveying Systems
- D20: Plumbing
- D30: HVAC
- D40: Fire Protection
- D50: Electrical
- E10: Equipment
- E20: Furnishings
- F10: Special Construction
- F20: Selective Demolition
- G10: Site Preparation
- G20: Site Improvements
- G30: Site Civil/Mechanical
- G40: Site Electrical

Extract the following information:

1. PROJECT INFORMATION:
   - Project name/building name
   - Property address
   - Client name
   - Property type (residential, commercial, institutional, etc.)
   - Construction type (wood frame, concrete, steel, masonry, etc.)
   - Year built
   - Number of units (if applicable)
   - Number of stories
   - Any general observations about the building

2. COMPONENT ASSESSMENTS:
   For each building component mentioned, extract:
   - Component code (from UNIFORMAT II list above)
   - Component name (e.g., "Concrete Foundation Walls", "Asphalt Shingle Roofing")
   - Component location (e.g., "North elevation", "Main building", "Entire facility")
   - Condition rating (excellent, good, fair, poor, or critical)
   - Condition percentage (if mentioned, e.g., "75% of expected service life remaining")
   - Observations (detailed description of current condition)
   - Recommendations (what actions are recommended)
   - Estimated Service Life (ESL) in years (if mentioned)
   - Remaining Useful Life (RUL) in years (if mentioned)
   - Review year (when was this assessment done)
   - Last action year (when was last maintenance/repair done)
   - Estimated repair cost (if mentioned) - the cost to repair/maintain the component in its current state
   - Replacement value/cost (if mentioned) - the full cost to replace the entire component with new
   - Action year (when should action be taken)
   
   IMPORTANT FOR COSTS:
   - Look for repair costs, maintenance costs, remediation costs - these are "estimatedRepairCost"
   - Look for replacement costs, replacement value, capital renewal costs - these are "replacementValue"
   - Extract numeric values only (no currency symbols)
   - If costs are given as ranges, use the higher value
   - If costs are given per unit (e.g., per sq ft), calculate total if area is available

3. DEFICIENCIES:
   For each deficiency or issue mentioned, extract:
   - Component code (from UNIFORMAT II)
   - Description of the deficiency
   - Location
   - Severity (low, medium, high, critical)
   - Priority (1-5, where 1 is highest)
   - Estimated cost to repair
   - Recommended action
   - Timeline for action

IMPORTANT INSTRUCTIONS:
- Use ONLY the UNIFORMAT II codes listed above (A10-G40)
- Match component descriptions to the closest UNIFORMAT II code
- For condition ratings, use: excellent, good, fair, poor, or critical
- Extract ALL components mentioned in the document
- Extract ALL deficiencies mentioned
- If a field is not mentioned, set it to null
- Be thorough and extract as much detail as possible

Document text:
${text.substring(0, 50000)}

Respond with a JSON object following this exact structure:
{
  "project": {
    "name": "string",
    "address": "string or null",
    "clientName": "string or null",
    "propertyType": "string or null",
    "constructionType": "string or null",
    "yearBuilt": number or null,
    "numberOfUnits": number or null,
    "numberOfStories": number or null,
    "observations": "string or null"
  },
  "assessments": [
    {
      "componentCode": "string (UNIFORMAT II code)",
      "componentName": "string",
      "componentLocation": "string or null",
      "condition": "excellent|good|fair|poor|critical",
      "conditionPercentage": number or null,
      "observations": "string or null",
      "recommendations": "string or null",
      "estimatedServiceLife": number or null,
      "remainingUsefulLife": number or null,
      "reviewYear": number or null,
      "lastTimeAction": number or null,
      "estimatedRepairCost": number or null,
      "replacementValue": number or null,
      "actionYear": number or null
    }
  ],
  "deficiencies": [
    {
      "componentCode": "string (UNIFORMAT II code)",
      "description": "string",
      "location": "string or null",
      "severity": "low|medium|high|critical",
      "priority": number (1-5),
      "estimatedCost": number or null,
      "recommendedAction": "string or null",
      "timeline": "string or null"
    }
  ]
}`;

  try {
    console.log('[AI Parser] Calling LLM for data extraction...');
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are an expert building condition assessment analyst. Extract structured data from BCA reports.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_object'
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new AIExtractionError('No valid response from AI. The AI service may be unavailable.');
    }

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch (parseError) {
      console.error('[AI Parser] Failed to parse AI response:', content);
      throw new AIExtractionError(
        'AI returned invalid JSON response',
        parseError instanceof Error ? parseError : undefined
      );
    }
    
    // Validate extracted data structure
    if (!extracted.project || !extracted.assessments || !extracted.deficiencies) {
      throw new AIExtractionError('AI response missing required fields (project, assessments, or deficiencies)');
    }
    
    if (!Array.isArray(extracted.assessments) || !Array.isArray(extracted.deficiencies)) {
      throw new AIExtractionError('AI response has invalid data structure');
    }
    
    console.log(`[AI Parser] Successfully extracted ${extracted.assessments.length} assessments and ${extracted.deficiencies.length} deficiencies`);
    
    return extracted;
  } catch (error) {
    if (error instanceof AIExtractionError) {
      throw error;
    }
    console.error('[AI Parser] Unexpected error during AI extraction:', error);
    throw new AIExtractionError(
      `AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Main function to parse document and extract BCA data
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<{
  project: any;
  assessments: any[];
  deficiencies: any[];
  aiProvider?: string;
}> {
  try {
    console.log(`[AI Parser] Starting parse for ${mimeType}, size: ${buffer.length} bytes`);
    
    // Validate file size
    if (buffer.length === 0) {
      throw new ValidationError('File is empty');
    }
    
    if (buffer.length > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`
      );
    }
    
    // Validate MIME type
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      throw new ValidationError(
        `Unsupported document type: ${mimeType}. Only PDF and Word documents (.docx) are supported.`
      );
    }
    
    // Extract text based on document type
    let text: string;
    try {
      if (mimeType === 'application/pdf') {
        text = await extractTextFromPDF(buffer);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromWord(buffer);
      } else {
        throw new ValidationError(`Unsupported document type: ${mimeType}`);
      }
    } catch (error) {
      if (error instanceof DocumentParsingError || error instanceof ValidationError) {
        throw error;
      }
      throw new DocumentParsingError(
        'Failed to extract text from document',
        error instanceof Error ? error : undefined
      );
    }
    
    console.log(`[AI Parser] Extracted ${text.length} characters of text`);
    
    if (text.length < 100) {
      throw new ValidationError(
        'Document contains insufficient text for analysis. Please ensure the document contains a building condition assessment report.'
      );
    }
    
    // Use AI to extract structured data
    // Try OpenAI first, fallback to Gemini if it fails
    let extracted;
    let aiProvider = 'unknown';
    try {
      console.log('[AI Parser] Attempting extraction with OpenAI...');
      const { extractBCADataWithOpenAI } = await import('./ai-document-parser-openai');
      extracted = await extractBCADataWithOpenAI(text);
      aiProvider = 'OpenAI';
      console.log('[AI Parser] Successfully extracted data using OpenAI');
    } catch (openaiError) {
      console.warn('[AI Parser] OpenAI extraction failed, falling back to Gemini:', 
        openaiError instanceof Error ? openaiError.message : 'Unknown error');
      
      try {
        console.log('[AI Parser] Attempting extraction with Gemini...');
        extracted = await extractBCADataWithAI(text);
        aiProvider = 'Gemini';
        console.log('[AI Parser] Successfully extracted data using Gemini');
      } catch (geminiError) {
        console.error('[AI Parser] Both OpenAI and Gemini extraction failed');
        if (geminiError instanceof AIExtractionError) {
          throw geminiError;
        }
        throw new AIExtractionError(
          'Failed to analyze document with AI (tried both OpenAI and Gemini)',
          geminiError instanceof Error ? geminiError : undefined
        );
      }
    }
    
    // Final validation
    if (!extracted.project?.name) {
      throw new AIExtractionError(
        'Could not identify a project name in the document. Please ensure this is a building condition assessment report.'
      );
    }
    
    // Map condition values from AI output to database enum
    // Database accepts: 'good', 'fair', 'poor', 'not_assessed'
    // AI returns: 'excellent', 'good', 'fair', 'poor', 'critical'
    const conditionMapping: Record<string, string> = {
      'excellent': 'good',
      'good': 'good',
      'fair': 'fair',
      'poor': 'poor',
      'critical': 'poor'
    };
    
    const mappedAssessments: Array<{
      componentCode: string;
      componentName: string;
      componentLocation?: string | null;
      condition: 'good' | 'fair' | 'poor' | 'not_assessed';
      conditionPercentage?: number | null;
      observations?: string | null;
      recommendations?: string | null;
      remainingUsefulLife?: number | null;
      expectedUsefulLife?: number | null;
      estimatedRepairCost?: number | null;
      replacementValue?: number | null;
    }> = extracted.assessments.map((assessment: any) => {
      const lowerCondition = assessment.condition?.toLowerCase() || '';
      const mappedCondition = (conditionMapping[lowerCondition] || 'not_assessed') as 'good' | 'fair' | 'poor' | 'not_assessed';
      
      return {
        componentCode: assessment.componentCode,
        componentName: assessment.componentName,
        componentLocation: assessment.componentLocation,
        condition: mappedCondition,
        conditionPercentage: assessment.conditionPercentage,
        observations: assessment.observations,
        recommendations: assessment.recommendations,
        remainingUsefulLife: assessment.remainingUsefulLife,
        expectedUsefulLife: assessment.expectedUsefulLife,
        estimatedRepairCost: assessment.estimatedRepairCost,
        replacementValue: assessment.replacementValue,
      };
    });
    
    // Map priority values from AI output to database enum
    // Database accepts: 'immediate', 'short_term', 'medium_term', 'long_term'
    // AI may return various formats or undefined
    const priorityMapping: Record<string, string> = {
      'immediate': 'immediate',
      'urgent': 'immediate',
      'critical': 'immediate',
      'short': 'short_term',
      'short_term': 'short_term',
      'short term': 'short_term',
      'medium': 'medium_term',
      'medium_term': 'medium_term',
      'medium term': 'medium_term',
      'long': 'long_term',
      'long_term': 'long_term',
      'long term': 'long_term',
      'low': 'long_term'
    };
    
    const mappedDeficiencies = extracted.deficiencies.map((deficiency: any) => {
      // Map priority if present
      if (deficiency.priority && typeof deficiency.priority === 'string') {
        const lowerPriority = deficiency.priority.toLowerCase().trim();
        deficiency.priority = priorityMapping[lowerPriority] || 'medium_term';
      } else {
        // Default to medium_term if priority is undefined or invalid
        deficiency.priority = 'medium_term';
      }
      // Ensure title has a value
      if (!deficiency.title || deficiency.title.trim() === '') {
        deficiency.title = `Deficiency - ${deficiency.componentCode}`;
      }
      return deficiency;
    }) as Array<{
      componentCode: string;
      title: string;
      description?: string | null;
      location?: string | null;
      severity: 'low' | 'medium' | 'high' | 'critical';
      priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
      estimatedCost?: number | null;
      recommendedAction?: string | null;
    }>
    
    console.log(`[AI Parser] Document parsing completed successfully using ${aiProvider}`);
    return {
      project: extracted.project,
      assessments: mappedAssessments,
      deficiencies: mappedDeficiencies,
      aiProvider // Return which AI provider was used
    };
  } catch (error) {
    // Log the error for debugging
    console.error('[AI Parser] Document parsing failed:', {
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      mimeType,
      bufferSize: buffer.length
    });
    
    // Re-throw with appropriate error type
    if (
      error instanceof ValidationError ||
      error instanceof DocumentParsingError ||
      error instanceof AIExtractionError
    ) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new Error(
      `Unexpected error during document parsing: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
