import OpenAI from 'openai';
import { AIExtractionError } from './ai-document-parser';

/**
 * Use OpenAI to extract structured BCA data from document text
 */
export async function extractBCADataWithOpenAI(text: string) {
  console.log(`[OpenAI Parser] Analyzing ${text.length} characters of text`);
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIExtractionError('OpenAI API key not configured');
  }
  
  const openai = new OpenAI({ apiKey });
  
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
      "title": "string",
      "description": "string or null",
      "location": "string or null",
      "severity": "low|medium|high|critical",
      "priority": "immediate|short_term|medium_term|long_term",
      "estimatedCost": number or null,
      "recommendedAction": "string or null"
    }
  ]
}`;

  try {
    console.log('[OpenAI Parser] Calling OpenAI API for data extraction...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert building condition assessment analyst. Extract structured data from BCA reports and return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new AIExtractionError('No valid response from OpenAI. The API may be unavailable.');
    }

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch (parseError) {
      console.error('[OpenAI Parser] Failed to parse OpenAI response:', content);
      throw new AIExtractionError(
        'OpenAI returned invalid JSON response',
        parseError instanceof Error ? parseError : undefined
      );
    }
    
    // Validate extracted data structure
    if (!extracted.project || !extracted.assessments || !extracted.deficiencies) {
      throw new AIExtractionError('OpenAI response missing required fields (project, assessments, or deficiencies)');
    }
    
    if (!Array.isArray(extracted.assessments) || !Array.isArray(extracted.deficiencies)) {
      throw new AIExtractionError('OpenAI response has invalid data structure');
    }
    
    console.log(`[OpenAI Parser] Successfully extracted ${extracted.assessments.length} assessments and ${extracted.deficiencies.length} deficiencies`);
    
    return extracted;
  } catch (error) {
    if (error instanceof AIExtractionError) {
      throw error;
    }
    console.error('[OpenAI Parser] Unexpected error during OpenAI extraction:', error);
    throw new AIExtractionError(
      `OpenAI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}
