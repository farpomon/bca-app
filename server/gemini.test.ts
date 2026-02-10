import { describe, expect, it, vi } from "vitest";

// Mock the Google GenAI module
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          description: "Roofing component showing normal wear patterns",
          condition: "fair",
          recommendation: "Schedule routine maintenance within 1-2 years",
          confidence: "medium",
        }),
      }),
    },
  })),
  Type: {
    STRING: "string",
    OBJECT: "object",
  },
}));

import { analyzeComponentImage } from "./geminiService";

describe("Gemini AI Integration", () => {
  it("should validate GEMINI_API_KEY is configured", () => {
    expect(process.env.GEMINI_API_KEY).toBeDefined();
    expect(process.env.GEMINI_API_KEY).not.toBe("");
  });

  it("should analyze a simple test image with Gemini AI", async () => {
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    
    const result = await analyzeComponentImage(
      testImageBase64,
      "B30",
      "Roofing",
      "Test image for API validation"
    );

    expect(result).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.condition).toBeDefined();
    expect(result.recommendation).toBeDefined();
    
    expect(["good", "fair", "poor", "not_assessed"]).toContain(result.condition);
    
    expect(result.description.length).toBeGreaterThan(0);
    expect(result.recommendation.length).toBeGreaterThan(0);
  }, 30000);
});
