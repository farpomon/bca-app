import mammoth from 'mammoth';
import { invokeLLM } from './_core/llm';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extract text from PDF buffer using pdf.js
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n\n=== PAGE ${pageNum} ===\n${pageText}`;
    }
    
    return fullText;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from Word document buffer
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   - Estimated repair cost (if mentioned)
   - Replacement value (if mentioned)
   - Action year (when should action be taken)

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
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are an expert building condition assessment analyst. Extract structured data from BCA reports.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'bca_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              project: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string', nullable: true },
                  clientName: { type: 'string', nullable: true },
                  propertyType: { type: 'string', nullable: true },
                  constructionType: { type: 'string', nullable: true },
                  yearBuilt: { type: 'number', nullable: true },
                  numberOfUnits: { type: 'number', nullable: true },
                  numberOfStories: { type: 'number', nullable: true },
                  observations: { type: 'string', nullable: true }
                },
                required: ['name'],
                additionalProperties: false
              },
              assessments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    componentCode: { type: 'string' },
                    componentName: { type: 'string' },
                    componentLocation: { type: 'string', nullable: true },
                    condition: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor', 'critical'] },
                    conditionPercentage: { type: 'number', nullable: true },
                    observations: { type: 'string', nullable: true },
                    recommendations: { type: 'string', nullable: true },
                    estimatedServiceLife: { type: 'number', nullable: true },
                    remainingUsefulLife: { type: 'number', nullable: true },
                    reviewYear: { type: 'number', nullable: true },
                    lastTimeAction: { type: 'number', nullable: true },
                    estimatedRepairCost: { type: 'number', nullable: true },
                    replacementValue: { type: 'number', nullable: true },
                    actionYear: { type: 'number', nullable: true }
                  },
                  required: ['componentCode', 'componentName', 'condition'],
                  additionalProperties: false
                }
              },
              deficiencies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    componentCode: { type: 'string' },
                    description: { type: 'string' },
                    location: { type: 'string', nullable: true },
                    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    priority: { type: 'number' },
                    estimatedCost: { type: 'number', nullable: true },
                    recommendedAction: { type: 'string', nullable: true },
                    timeline: { type: 'string', nullable: true }
                  },
                  required: ['componentCode', 'description', 'severity', 'priority'],
                  additionalProperties: false
                }
              }
            },
            required: ['project', 'assessments', 'deficiencies'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('No valid response from AI');
    }

    const extracted = JSON.parse(content);
    console.log(`[AI Parser] Extracted ${extracted.assessments.length} assessments and ${extracted.deficiencies.length} deficiencies`);
    
    return extracted;
  } catch (error) {
    console.error('[AI Parser] Failed:', error);
    throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
}> {
  console.log(`[AI Parser] Starting parse for ${mimeType}, size: ${buffer.length} bytes`);
  
  // Extract text based on document type
  let text: string;
  if (mimeType === 'application/pdf') {
    text = await extractTextFromPDF(buffer);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    text = await extractTextFromWord(buffer);
  } else {
    throw new Error(`Unsupported document type: ${mimeType}`);
  }
  
  console.log(`[AI Parser] Extracted ${text.length} characters of text`);
  
  // Use AI to extract structured data
  const extracted = await extractBCADataWithAI(text);
  
  return {
    project: extracted.project,
    assessments: extracted.assessments,
    deficiencies: extracted.deficiencies
  };
}
