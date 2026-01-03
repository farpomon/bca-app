import { invokeLLM } from "./_core/llm";

export interface PhotoAssessmentResult {
  componentCode: string;
  componentName: string;
  condition: "good" | "fair" | "poor" | "critical";
  deficiencies: Array<{
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    priority: "immediate" | "short_term" | "medium_term" | "long_term";
    location: string;
    recommendedAction: string;
    estimatedCost?: number;
  }>;
  observations: string;
  confidence: number; // 0-100
  analysisNotes: string;
}

const UNIFORMAT_COMPONENTS = `
A - SUBSTRUCTURE (Foundations, basement walls)
B - SHELL (Superstructure, exterior walls, roofing)
C - INTERIORS (Interior construction, stairs, finishes)
D - SERVICES (Plumbing, HVAC, electrical, fire protection)
E - EQUIPMENT & FURNISHINGS
F - SPECIAL CONSTRUCTION
G - BUILDING SITEWORK
`;

const ASSESSMENT_PROMPT = `You are an expert building inspector conducting a condition assessment following ASTM E2018-15 standards and UNIFORMAT II classification.

Analyze this building photo and provide a detailed assessment in JSON format.

UNIFORMAT II Components:
${UNIFORMAT_COMPONENTS}

Your response must be valid JSON matching this structure:
{
  "componentCode": "B20" (select the most appropriate UNIFORMAT II code),
  "componentName": "Exterior Enclosure - Roof",
  "condition": "good" | "fair" | "poor" | "critical",
  "deficiencies": [
    {
      "title": "Brief deficiency title",
      "description": "Detailed description of the issue",
      "severity": "low" | "medium" | "high" | "critical",
      "priority": "immediate" | "short_term" | "medium_term" | "long_term",
      "location": "Specific location within the component",
      "recommendedAction": "Recommended repair or replacement action",
      "estimatedCost": 50000 (cost in cents, optional)
    }
  ],
  "observations": "General observations about the component condition",
  "confidence": 85 (your confidence level 0-100 in this assessment),
  "analysisNotes": "Any additional notes or uncertainties"
}

Assessment Guidelines:
- Condition ratings: good (no issues), fair (minor wear), poor (significant issues), critical (immediate attention needed)
- Severity: low (cosmetic), medium (functional impact), high (safety concern), critical (immediate hazard)
- Priority: immediate (<1 year), short_term (1-2 years), medium_term (3-5 years), long_term (5+ years)
- Be specific about deficiencies - describe what you see
- If the image quality is poor or the component is unclear, lower the confidence score
- Estimate costs conservatively in cents (e.g., $500 = 50000 cents)

Respond ONLY with valid JSON, no additional text.`;

export async function assessPhotoWithAI(imageUrl: string): Promise<PhotoAssessmentResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: ASSESSMENT_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this building component photo and provide a detailed condition assessment.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "building_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              componentCode: {
                type: "string",
                description: "UNIFORMAT II component code",
              },
              componentName: {
                type: "string",
                description: "Name of the building component",
              },
              condition: {
                type: "string",
                enum: ["good", "fair", "poor", "critical"],
                description: "Overall condition rating",
              },
              deficiencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    severity: {
                      type: "string",
                      enum: ["low", "medium", "high", "critical"],
                    },
                    priority: {
                      type: "string",
                      enum: ["immediate", "short_term", "medium_term", "long_term"],
                    },
                    location: { type: "string" },
                    recommendedAction: { type: "string" },
                    estimatedCost: { type: "number" },
                  },
                  required: [
                    "title",
                    "description",
                    "severity",
                    "priority",
                    "location",
                    "recommendedAction",
                  ],
                  additionalProperties: false,
                },
              },
              observations: {
                type: "string",
                description: "General observations",
              },
              confidence: {
                type: "number",
                description: "Confidence level 0-100",
              },
              analysisNotes: {
                type: "string",
                description: "Additional notes",
              },
            },
            required: [
              "componentCode",
              "componentName",
              "condition",
              "deficiencies",
              "observations",
              "confidence",
              "analysisNotes",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const message = response.choices[0]?.message;
    if (!message?.content) {
      throw new Error("No response from AI");
    }

    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    const result = JSON.parse(content) as PhotoAssessmentResult;
    return result;
  } catch (error) {
    console.error("Photo assessment error:", error);
    throw new Error("Failed to assess photo with AI: " + (error as Error).message);
  }
}
