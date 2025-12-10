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
      fullText += pageText + '\n';
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
 * Extract structured data from document text using Gemini AI
 */
export async function extractBCADataFromText(documentText: string): Promise<{
  project: any;
  assessments: any[];
  deficiencies: any[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}> {
  const prompt = `You are an expert at extracting structured data from Building Condition Assessment (BCA) reports.

Analyze the following BCA report and extract structured data in JSON format.

IMPORTANT INSTRUCTIONS:
1. Extract as much information as possible, but mark uncertain fields with null
2. For assessments, look for component lists, condition ratings, cost estimates
3. For deficiencies, look for issues, problems, repairs needed
4. Preserve relationships: which deficiencies belong to which components
5. Extract dates in ISO format (YYYY-MM-DD)
6. Extract costs as numbers (remove currency symbols)
7. Map condition descriptions to: "excellent", "good", "fair", "poor", "critical"
8. Map severity to: "low", "medium", "high", "critical"
9. Map priority to: "immediate", "short_term", "medium_term", "long_term"

DOCUMENT TEXT:
${documentText.substring(0, 50000)} 

Return ONLY valid JSON in this exact structure:
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
      "componentCode": "string",
      "componentName": "string",
      "componentLocation": "string or null",
      "condition": "excellent|good|fair|poor|critical",
      "conditionPercentage": number or null,
      "observations": "string or null",
      "recommendations": "string or null",
      "remainingUsefulLife": number or null,
      "expectedUsefulLife": number or null,
      "estimatedRepairCost": number or null,
      "replacementValue": number or null
    }
  ],
  "deficiencies": [
    {
      "componentCode": "string (matching assessment)",
      "title": "string",
      "description": "string",
      "location": "string or null",
      "severity": "low|medium|high|critical",
      "priority": "immediate|short_term|medium_term|long_term",
      "estimatedCost": number or null,
      "recommendedAction": "string or null"
    }
  ],
  "confidence": "high|medium|low",
  "warnings": ["array of strings describing any extraction issues or uncertainties"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction expert specializing in building condition assessment reports. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
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
                  address: { type: ['string', 'null'] },
                  clientName: { type: ['string', 'null'] },
                  propertyType: { type: ['string', 'null'] },
                  constructionType: { type: ['string', 'null'] },
                  yearBuilt: { type: ['number', 'null'] },
                  numberOfUnits: { type: ['number', 'null'] },
                  numberOfStories: { type: ['number', 'null'] },
                  observations: { type: ['string', 'null'] },
                },
                required: ['name'],
                additionalProperties: false,
              },
              assessments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    componentCode: { type: 'string' },
                    componentName: { type: 'string' },
                    componentLocation: { type: ['string', 'null'] },
                    condition: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor', 'critical'] },
                    conditionPercentage: { type: ['number', 'null'] },
                    observations: { type: ['string', 'null'] },
                    recommendations: { type: ['string', 'null'] },
                    remainingUsefulLife: { type: ['number', 'null'] },
                    expectedUsefulLife: { type: ['number', 'null'] },
                    estimatedRepairCost: { type: ['number', 'null'] },
                    replacementValue: { type: ['number', 'null'] },
                  },
                  required: ['componentCode', 'componentName', 'condition'],
                  additionalProperties: false,
                },
              },
              deficiencies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    componentCode: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    location: { type: ['string', 'null'] },
                    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    priority: { type: 'string', enum: ['immediate', 'short_term', 'medium_term', 'long_term'] },
                    estimatedCost: { type: ['number', 'null'] },
                    recommendedAction: { type: ['string', 'null'] },
                  },
                  required: ['componentCode', 'title', 'description', 'severity', 'priority'],
                  additionalProperties: false,
                },
              },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              warnings: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['project', 'assessments', 'deficiencies', 'confidence', 'warnings'],
            additionalProperties: false,
          },
        },
      },
    });

    const message = response.choices[0]?.message;
    if (!message || !message.content) {
      throw new Error('No response from AI');
    }

    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    const extracted = JSON.parse(content);
    return extracted;
  } catch (error) {
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
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}> {
  let documentText: string;

  // Extract text based on file type
  if (mimeType === 'application/pdf') {
    documentText = await extractTextFromPDF(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    documentText = await extractTextFromWord(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  if (!documentText || documentText.trim().length < 100) {
    throw new Error('Document appears to be empty or too short to parse');
  }

  // Use AI to extract structured data
  const extracted = await extractBCADataFromText(documentText);

  return extracted;
}
