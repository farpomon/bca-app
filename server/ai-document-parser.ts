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
 * Render each PDF page as a full-page image using pdf-poppler
 * This preserves all context (text, tables, diagrams, photos) on each page
 */
export async function renderPDFPagesToImages(buffer: Buffer): Promise<ExtractedImage[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  // @ts-ignore - pdf-poppler has no type definitions
  const poppler = await import('pdf-poppler');
  
  try {
    // Create temp directory for PDF and output images
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-render-'));
    const pdfPath = path.join(tempDir, 'input.pdf');
    
    // Write PDF to temp file
    await fs.writeFile(pdfPath, buffer);
    
    console.log(`[PDF Page Rendering] Starting render using pdf-poppler`);
    
    // Convert PDF to images using poppler
    const options = {
      format: 'jpeg',
      out_dir: tempDir,
      out_prefix: 'page',
      page: null, // Convert all pages
      scale: 2048, // High resolution
    };
    
    await poppler.convert(pdfPath, options);
    
    // Read all generated images
    const files = await fs.readdir(tempDir);
    const imageFiles = files
      .filter(f => f.startsWith('page') && f.endsWith('.jpg'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    
    console.log(`[PDF Page Rendering] Found ${imageFiles.length} rendered pages`);
    
    // Extract text for context
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDocument = await loadingTask.promise;
    
    const pageImages: ExtractedImage[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i];
      const imagePath = path.join(tempDir, imageFile);
      const imageBuffer = await fs.readFile(imagePath);
      
      // Compress with sharp
      const compressedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 85 })
        .toBuffer();
      
      // Extract text from this page for context
      const pageNum = i + 1;
      let pageText = '';
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .substring(0, 800);
      } catch (err) {
        console.warn(`[PDF Page Rendering] Could not extract text from page ${pageNum}`);
      }
      
      pageImages.push({
        buffer: compressedBuffer,
        mimeType: 'image/jpeg',
        pageNumber: pageNum,
        context: pageText,
        caption: `Page ${pageNum}`,
      });
      
      console.log(`[PDF Page Rendering] Processed page ${pageNum}/${imageFiles.length}`);
    }
    
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    
    return pageImages;
  } catch (error) {
    console.error('[PDF Page Rendering] Failed:', error);
    throw new Error(`Failed to render PDF pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * Classify page images by UNIFORMAT II sub-section using AI Vision
 * Uploads images temporarily to S3 and uses Gemini Vision to analyze them
 */
async function classifyPagesBySubSection(
  pageImages: ExtractedImage[]
): Promise<Array<ExtractedImage & { componentCode?: string }>> {
  if (pageImages.length === 0) return [];
  
  console.log(`[AI Classification] Classifying ${pageImages.length} pages using Vision API`);
  
  // Upload images to S3 temporarily for vision analysis
  const tempPrefix = `temp-classification/${Date.now()}-${randomBytes(4).toString('hex')}`;
  const uploadedImages: Array<{ pageNumber: number; url: string; context: string }> = [];
  
  for (let i = 0; i < pageImages.length; i++) {
    const img = pageImages[i];
    const pageNum = img.pageNumber || i + 1;
    const { url } = await storagePut(
      `${tempPrefix}/page-${pageNum}.jpg`,
      img.buffer,
      img.mimeType
    );
    uploadedImages.push({
      pageNumber: pageNum,
      url,
      context: (img.context || '').substring(0, 500),
    });
    console.log(`[AI Classification] Uploaded page ${pageNum} for analysis`);
  }
  
  // Classify in batches of 5 pages to avoid token limits
  const batchSize = 5;
  const allClassifications: any[] = [];
  
  for (let i = 0; i < uploadedImages.length; i += batchSize) {
    const batch = uploadedImages.slice(i, i + batchSize);
    
    // Build multimodal message with images and text
    const content: any[] = [
      {
        type: 'text',
        text: `Analyze these BCA report pages and classify each by UNIFORMAT II component code.

**UNIFORMAT II Level 2 Codes:**
- A10: Foundations
- A20: Basement Construction  
- B10: Superstructure (framing, structural walls)
- B20: Exterior Enclosure (walls, windows, doors, cladding)
- B30: Roofing (membrane, shingles, flashing, drainage, skylights)
- C10: Interior Construction (partitions, interior doors)
- C20: Stairs
- C30: Interior Finishes (flooring, wall finishes, ceilings, paint)
- D10: Conveying (elevators, escalators)
- D20: Plumbing (pipes, fixtures, toilets, sinks, water heater, drainage)
- D30: HVAC (heating, cooling, ventilation, AC units, furnace, boiler)
- D40: Fire Protection (sprinklers, alarms, extinguishers)
- D50: Electrical (panels, wiring, lighting, outlets)
- E10: Equipment (kitchen, laundry)
- E20: Furnishings (cabinets, millwork, washroom accessories)
- F10: Special Construction
- G10-G40: Site Work (landscaping, paving, walkways, ramps, bike racks)

**Instructions:**
1. Look at the photos/images on each page - they show the building component
2. Read the text for component codes (e.g., "B.7", "D.2") and names ("SBS Membrane Roofing", "Plumbing Fixtures")
3. Match what you see in photos to the appropriate UNIFORMAT code
4. If a page has multiple components, choose the primary one
5. Return null if it's a cover page, table of contents, or unclear

**Return JSON array:**
[{"pageNumber": number, "componentCode": "B30" | "D20" | etc. | null, "confidence": "high" | "medium" | "low", "reasoning": "what I see in the image"}]`
      }
    ];
    
    // Add each page image
    for (const page of batch) {
      content.push({
        type: 'text',
        text: `\n\nPage ${page.pageNumber} - Text context: ${page.context}`
      });
      content.push({
        type: 'image_url',
        image_url: {
          url: page.url,
          detail: 'high'
        }
      });
    }
    
    const prompt = `Analyze the ${batch.length} pages above and return classifications.`;
    
    try {
      console.log(`[AI Classification] Analyzing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uploadedImages.length / batchSize)}`);
      
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a UNIFORMAT II expert analyzing BCA report pages. Return valid JSON only.' },
          { role: 'user', content },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'page_classifications',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                classifications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pageNumber: { type: 'number' },
                      componentCode: { type: ['string', 'null'] },
                      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                      reasoning: { type: 'string' }
                    },
                    required: ['pageNumber', 'componentCode', 'confidence', 'reasoning'],
                    additionalProperties: false
                  }
                }
              },
              required: ['classifications'],
              additionalProperties: false
            }
          }
        }
      });
      
      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.warn(`[AI Classification] No response for batch ${Math.floor(i / batchSize) + 1}`);
        continue;
      }
      
      const parsed = JSON.parse(String(responseContent));
      const batchClassifications = parsed.classifications || [];
      allClassifications.push(...batchClassifications);
      
      console.log(`[AI Classification] Batch ${Math.floor(i / batchSize) + 1} complete: ${batchClassifications.length} pages classified`);
    } catch (error) {
      console.error(`[AI Classification] Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      // Continue with next batch
    }
  }
  
  // Map classifications back to page images
  const result = pageImages.map((img, idx) => {
    const classification = allClassifications.find(
      (c: any) => c.pageNumber === (img.pageNumber || idx + 1)
    );
    
    if (classification) {
      console.log(`[AI Classification] Page ${img.pageNumber}: ${classification.componentCode || 'unclassified'} (${classification.confidence}) - ${classification.reasoning}`);
    }
    
    return {
      ...img,
      componentCode: classification?.componentCode || null,
    };
  });
  
  console.log(`[AI Classification] Complete: ${allClassifications.length}/${pageImages.length} pages classified`);
  return result;
}

/**
 * Upload extracted images to S3 and return photo metadata
 */
async function uploadExtractedImages(images: Array<ExtractedImage & { componentCode?: string }>, projectPrefix: string): Promise<Array<{
  url: string;
  fileKey: string;
  caption?: string;
  context?: string;
  componentCode?: string;
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
        componentCode: image.componentCode,
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
    images = await renderPDFPagesToImages(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    documentText = await extractTextFromWord(buffer);
    images = await extractImagesFromWord(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  console.log(`Extracted ${images.length} page images from document`);

  if (!documentText || documentText.trim().length < 100) {
    throw new Error('Document appears to be empty or too short to parse');
  }

  // Use AI to extract structured data
  const extracted = await extractBCADataFromText(documentText);

  // Classify pages by UNIFORMAT II sub-section
  const classifiedImages = await classifyPagesBySubSection(images);

  // Upload extracted images to S3
  const projectPrefix = `ai-imports/${Date.now()}-${randomBytes(4).toString('hex')}`;
  const uploadedPhotos = await uploadExtractedImages(classifiedImages, projectPrefix);

  return {
    ...extracted,
    photos: uploadedPhotos,
  };
}
