/**
 * Test HTML tag stripping in audio router
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

describe("stripHtmlTags", () => {
  it("should remove <p> tags from text", () => {
    const input = "<p></p><p>If the feature is working, please let me know if the feature is working. Please let me know if the feature is working.</p>";
    const expected = "If the feature is working, please let me know if the feature is working. Please let me know if the feature is working.";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });

  it("should remove all HTML tags", () => {
    const input = "<div><strong>Bold text</strong> and <em>italic text</em></div>";
    const expected = "Bold text and italic text";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });

  it("should decode HTML entities", () => {
    const input = "Test &amp; check &lt;value&gt; &quot;quoted&quot; &#39;apostrophe&#39;";
    const expected = "Test & check <value> \"quoted\" 'apostrophe'";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });

  it("should handle nested tags", () => {
    const input = "<div><p><span>Nested <strong>content</strong></span></p></div>";
    const expected = "Nested content";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });

  it("should normalize whitespace", () => {
    const input = "<p>Multiple    spaces   and\n\nnewlines</p>";
    const expected = "Multiple spaces and newlines";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });

  it("should handle empty tags", () => {
    const input = "<p></p><div></div><span></span>Content";
    const expected = "Content";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });

  it("should handle plain text without tags", () => {
    const input = "Plain text without any HTML";
    const expected = "Plain text without any HTML";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });

  it("should handle the user's specific example", () => {
    const input = "<p></p><p>If the feature is working, please let me know if the feature is working. Please let me know if the feature is\nworking.</p>";
    const expected = "If the feature is working, please let me know if the feature is working. Please let me know if the feature is working.";
    
    expect(stripHtmlTags(input)).toBe(expected);
  });
});
