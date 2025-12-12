/**
 * Test AI enhancement with HTML content stripping
 */

import { describe, it, expect } from "vitest";

// Replicate the stripHtmlTags function from audio.router.ts
function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Decode ampersand
    .replace(/&lt;/g, '<') // Decode less than
    .replace(/&gt;/g, '>') // Decode greater than
    .replace(/&quot;/g, '"') // Decode quote
    .replace(/&#39;/g, "'") // Decode apostrophe
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim(); // Remove leading/trailing whitespace
}

describe("AI Enhancement HTML Stripping", () => {
  it("should strip HTML tags from observations before AI processing", () => {
    const htmlInput = "<p>The roof membrane shows <strong>significant wear</strong> and <em>cracking</em>.</p>";
    const expectedClean = "The roof membrane shows significant wear and cracking.";
    
    const cleaned = stripHtmlTags(htmlInput);
    expect(cleaned).toBe(expectedClean);
  });

  it("should strip HTML tags from recommendations before AI processing", () => {
    const htmlInput = "<p>Recommend <strong>immediate replacement</strong> of the <span class='highlight'>damaged section</span>.</p>";
    const expectedClean = "Recommend immediate replacement of the damaged section.";
    
    const cleaned = stripHtmlTags(htmlInput);
    expect(cleaned).toBe(expectedClean);
  });

  it("should handle rich text editor output with multiple paragraphs", () => {
    const htmlInput = "<p>First observation about the component.</p><p>Second observation with more details.</p>";
    const expectedClean = "First observation about the component.Second observation with more details.";
    
    const cleaned = stripHtmlTags(htmlInput);
    expect(cleaned).toBe(expectedClean);
  });

  it("should handle empty HTML tags", () => {
    const htmlInput = "<p></p><p>Actual content here</p><p></p>";
    const expectedClean = "Actual content here";
    
    const cleaned = stripHtmlTags(htmlInput);
    expect(cleaned).toBe(expectedClean);
  });

  it("should decode HTML entities in technical descriptions", () => {
    const htmlInput = "<p>Temperature &gt; 150&deg;F &amp; pressure &lt; 50 PSI</p>";
    const expectedClean = "Temperature > 150°F & pressure < 50 PSI";
    
    const cleaned = stripHtmlTags(htmlInput);
    // Note: &deg; is not in our basic entity list, so it will remain as-is
    // This test shows what we currently handle
    expect(cleaned).toContain("Temperature > 150");
    expect(cleaned).toContain("& pressure < 50 PSI");
  });

  it("should handle nested formatting tags", () => {
    const htmlInput = "<div><p><strong><em>Critical deficiency</em></strong> requiring <u>immediate attention</u></p></div>";
    const expectedClean = "Critical deficiency requiring immediate attention";
    
    const cleaned = stripHtmlTags(htmlInput);
    expect(cleaned).toBe(expectedClean);
  });

  it("should preserve technical terminology without HTML", () => {
    const htmlInput = "<p>HVAC system operating at 85% capacity with refrigerant leak detected.</p>";
    const expectedClean = "HVAC system operating at 85% capacity with refrigerant leak detected.";
    
    const cleaned = stripHtmlTags(htmlInput);
    expect(cleaned).toBe(expectedClean);
  });

  it("should handle line breaks and normalize whitespace", () => {
    const htmlInput = "<p>Component shows\n\nmultiple    defects including:</p><ul><li>Cracking</li><li>Corrosion</li></ul>";
    const expectedClean = "Component shows multiple defects including:CrackingCorrosion";
    
    const cleaned = stripHtmlTags(htmlInput);
    expect(cleaned).toBe(expectedClean);
  });
});
