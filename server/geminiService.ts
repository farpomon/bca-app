import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini AI with API key from environment
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export interface ImageAnalysisResult {
  description: string;
  condition: "good" | "fair" | "poor" | "not_assessed";
  recommendation: string;
  confidence?: string;
}

/**
 * Analyze a building component image using Gemini AI
 * @param base64Image - Base64 encoded image data
 * @param componentCode - UNIFORMAT II component code (e.g., "A1010")
 * @param componentName - Component name (e.g., "Standard Foundations")
 * @param userNotes - Optional user-provided context or observations
 * @returns AI-generated analysis with description, condition, and recommendations
 */
export async function analyzeComponentImage(
  base64Image: string,
  componentCode: string,
  componentName: string,
  userNotes?: string
): Promise<ImageAnalysisResult> {
  try {
    const ai = getAI();

    // Remove data URL header if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const prompt = `
You are a professional building inspector conducting a Building Condition Assessment (BCA) following ASTM E2018-15 standards.

Analyze this image of a building component:
- Component Code: ${componentCode}
- Component Name: ${componentName}
${userNotes ? `- Inspector Notes: ${userNotes}` : ''}

Provide a detailed technical assessment:

1. **Description**: Write a professional, technical description of what you observe in the image. Include:
   - Physical condition of materials
   - Visible defects, deterioration, or damage
   - Any signs of wear, aging, or maintenance issues
   - Specific observations relevant to this component type

2. **Condition Rating**: Assess the condition as one of:
   - "good": Component is in good condition (90-75% of Estimated Service Life remaining)
   - "fair": Component shows moderate wear (75-50% of ESL remaining)
   - "poor": Component has significant deterioration (50-25% of ESL remaining)

3. **Recommendation**: Provide specific, actionable maintenance or repair recommendations based on ASTM standards.

Be thorough, technical, and specific in your assessment.
    `.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { 
              type: Type.STRING, 
              description: "Detailed technical observation of the component condition" 
            },
            condition: { 
              type: Type.STRING, 
              enum: ["good", "fair", "poor"],
              description: "Condition rating based on visual assessment"
            },
            recommendation: { 
              type: Type.STRING, 
              description: "Specific maintenance or repair recommendations" 
            },
            confidence: {
              type: Type.STRING,
              description: "AI confidence level in the assessment (high/medium/low)"
            }
          },
          required: ["description", "condition", "recommendation"]
        }
      }
    });

    const jsonText = response.text || '{}';
    const result = JSON.parse(jsonText);

    return {
      description: result.description || "Unable to analyze image",
      condition: result.condition || "not_assessed",
      recommendation: result.recommendation || "Manual inspection recommended",
      confidence: result.confidence || "medium"
    };

  } catch (error) {
    console.error("Gemini image analysis failed:", error);
    throw new Error("Failed to analyze image with AI. Please try again or perform manual assessment.");
  }
}

/**
 * Enhance user-written notes into professional engineering observations
 * @param rawNotes - User's raw notes
 * @param componentType - Type of component being assessed
 * @returns Enhanced professional notes
 */
export async function enhanceObservations(
  rawNotes: string,
  componentType: string
): Promise<string> {
  try {
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Rewrite the following building assessment notes into a professional engineering observation for a ${componentType} component. Keep it concise but technical, following ASTM E2018-15 standards. Notes: "${rawNotes}"`,
    });

    return response.text || rawNotes;
  } catch (error) {
    console.error("Gemini note enhancement failed:", error);
    return rawNotes; // Return original notes if enhancement fails
  }
}
