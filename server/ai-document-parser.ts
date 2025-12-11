import mammoth from 'mammoth';
import { invokeLLM } from './_core/llm';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { storagePut } from './storage';
import { randomBytes } from 'crypto';
import sharp from 'sharp';

type ExtractedImage = {
  buffer: Buffer;
  mimeType: string;
  caption?: string;
  pageNumber?: number;
  context?: string; // Surrounding text for context
};

/**
 * Extract text and images from PDF buffer using pdf.js
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
 * Extract images from PDF buffer
 * NOTE: Currently disabled due to complexity of PDF image formats (JPEG2000, JBIG2, etc.)
 * Users should upload photos separately after project creation
 */
export async function extractImagesFromPDF(buffer: Buffer): Promise<ExtractedImage[]> {
  // TODO: Implement robust image extraction
  // Current issue: pdf.js returns images in various compressed formats that require
  // complex decoding. Options:
  // 1. Use external service for image extraction
  // 2. Render full pages as images instead
  // 3. Skip extraction and let users upload photos manually
  
  console.log('[PDF Image Extraction] Skipped - users should upload photos separately');
  return [];
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
 * Extract images from Word document buffer
 * Note: mammoth doesn't provide easy image extraction API, so we return empty for now
 * Users can convert Word to PDF first for image extraction
 */
export async function extractImagesFromWord(buffer: Buffer): Promise<ExtractedImage[]> {
  // Word image extraction is complex and requires additional libraries
  // For now, recommend users convert to PDF for image extraction
  console.log('Word image extraction not yet implemented - convert to PDF for best results');
  return [];
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
6. Extract costs as numbers (remove currency symbols, commas, and convert to numeric)
7. Map condition descriptions to: "excellent", "good", "fair", "poor", "critical"
8. Map severity to: "low", "medium", "high", "critical"
9. Map priority to: "immediate", "short_term", "medium_term", "long_term"
10. COST EXTRACTION: Look for cost tables, financial summaries, and cost projections
    - Search for "Repair Cost", "Replacement Cost", "Replacement Value", "Cost Estimate" columns
    - Match costs to their corresponding components by code or name
    - Extract both immediate repair costs and long-term replacement values
    - If a document has separate cost tables, extract all cost data
11. DOCUMENT TYPE DETECTION:
    - Building Asset Inventory (BAI): Focus on component inventory and conditions
    - Depreciation Report: Extract cost tables, financial projections, and FCI calculations
    - Handle both document types appropriately

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
    console.log('[AI Extraction] Sending request to Gemini...');
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
                  address: { type: 'string', nullable: true },
                  clientName: { type: 'string', nullable: true },
                  propertyType: { type: 'string', nullable: true },
                  constructionType: { type: 'string', nullable: true },
                  yearBuilt: { type: 'number', nullable: true },
                  numberOfUnits: { type: 'number', nullable: true },
                  numberOfStories: { type: 'number', nullable: true },
                  observations: { type: 'string', nullable: true },
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
                    componentLocation: { type: 'string', nullable: true },
                    condition: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor', 'critical'] },
                    conditionPercentage: { type: 'number', nullable: true },
                    observations: { type: 'string', nullable: true },
                    recommendations: { type: 'string', nullable: true },
                    remainingUsefulLife: { type: 'number', nullable: true },
                    expectedUsefulLife: { type: 'number', nullable: true },
                    estimatedRepairCost: { type: 'number', nullable: true },
                    replacementValue: { type: 'number', nullable: true },
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
                    location: { type: 'string', nullable: true },
                    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    priority: { type: 'string', enum: ['immediate', 'short_term', 'medium_term', 'long_term'] },
                    estimatedCost: { type: 'number', nullable: true },
                    recommendedAction: { type: 'string', nullable: true },
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

    console.log('[AI Extraction] Response received');
    console.log('[AI Extraction] Response structure:', JSON.stringify({
      hasChoices: !!response.choices,
      choicesLength: response.choices?.length,
      firstChoice: response.choices?.[0] ? 'exists' : 'missing'
    }));
    
    const message = response.choices?.[0]?.message;
    if (!message || !message.content) {
      console.error('[AI Extraction] No message in response:', JSON.stringify(response, null, 2));
      throw new Error('No response from AI');
    }

    console.log('[AI Extraction] Parsing content...');
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    const extracted = JSON.parse(content);
    console.log('[AI Extraction] Successfully extracted data');
    return extracted;
  } catch (error) {
    console.error('[AI Extraction] Error details:', error);
    throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload extracted images to S3 and return photo metadata
 */
async function uploadExtractedImages(images: ExtractedImage[], projectPrefix: string): Promise<Array<{
  url: string;
  fileKey: string;
  caption?: string;
  context?: string;
}>> {
  const uploadedPhotos = [];
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const randomSuffix = randomBytes(4).toString('hex');
    const fileKey = `${projectPrefix}/photo-${i + 1}-${randomSuffix}.png`;
    
    try {
      const { url } = await storagePut(fileKey, image.buffer, image.mimeType);
      
      console.log(`[AI Import] Uploaded photo ${i + 1}:`, { url, fileKey });
      
      uploadedPhotos.push({
        url,
        fileKey,
        caption: image.caption,
        context: image.context,
      });
    } catch (error) {
      console.error(`Failed to upload image ${i + 1}:`, error);
    }
  }
  
  return uploadedPhotos;
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
  photos: Array<{
    url: string;
    fileKey: string;
    caption?: string;
    context?: string;
  }>;
}> {
  let documentText: string;
  let images: ExtractedImage[] = [];

  // Extract text and images based on file type
  if (mimeType === 'application/pdf') {
    documentText = await extractTextFromPDF(buffer);
    images = await extractImagesFromPDF(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    documentText = await extractTextFromWord(buffer);
    images = await extractImagesFromWord(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  console.log(`Extracted ${images.length} images from document`);

  if (!documentText || documentText.trim().length < 100) {
    throw new Error('Document appears to be empty or too short to parse');
  }

  // Use AI to extract structured data
  const extracted = await extractBCADataFromText(documentText);

  // Upload extracted images to S3
  const projectPrefix = `ai-imports/${Date.now()}-${randomBytes(4).toString('hex')}`;
  const uploadedPhotos = await uploadExtractedImages(images, projectPrefix);

  return {
    ...extracted,
    photos: uploadedPhotos,
  };
}
