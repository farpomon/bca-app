import { invokeLLM } from "./llm";

/**
 * Extract text from an image using Gemini Vision API
 * @param imageUrl - Public URL of the image to process
 * @returns Extracted text and confidence score
 */
export async function extractTextFromImage(imageUrl: string): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all visible text from this image. Include equipment labels, serial numbers, signage, and any other readable text. Return ONLY the extracted text, nothing else.",
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
    });

    const content = response.choices[0]?.message?.content;
    const extractedText = typeof content === "string" ? content : "";
    
    // Estimate confidence based on response length and quality
    // In a production system, you might use a dedicated OCR service that provides confidence scores
    const confidence = extractedText.length > 10 ? 0.85 : 0.5;

    return {
      text: extractedText.trim(),
      confidence,
    };
  } catch (error) {
    console.error("[OCR] Failed to extract text:", error);
    return {
      text: "",
      confidence: 0,
    };
  }
}
