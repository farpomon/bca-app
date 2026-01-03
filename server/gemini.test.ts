import { describe, expect, it } from "vitest";
import { analyzeComponentImage } from "./geminiService";

describe("Gemini AI Integration", () => {
  it("should validate GEMINI_API_KEY is configured", () => {
    expect(process.env.GEMINI_API_KEY).toBeDefined();
    expect(process.env.GEMINI_API_KEY).not.toBe("");
  });

  it("should analyze a simple test image with Gemini AI", async () => {
    // Create a minimal 1x1 red pixel PNG image in base64
    // This is a valid PNG file that Gemini can process
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    
    const result = await analyzeComponentImage(
      testImageBase64,
      "B30",
      "Roofing",
      "Test image for API validation"
    );

    // Verify the response structure
    expect(result).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.condition).toBeDefined();
    expect(result.recommendation).toBeDefined();
    
    // Verify condition is one of the valid values
    expect(["good", "fair", "poor", "not_assessed"]).toContain(result.condition);
    
    // Verify we got actual content (not empty strings)
    expect(result.description.length).toBeGreaterThan(0);
    expect(result.recommendation.length).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for API call
});
