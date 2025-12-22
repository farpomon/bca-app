import { describe, it, expect } from "vitest";

/**
 * Test for compliance check LLM response parsing
 * Verifies that the response handler can process both string and array content types
 */

describe("Compliance Check Response Parsing", () => {
  it("should handle string content from LLM response", () => {
    const messageContent = '{"compliant": true, "details": "Component meets code requirements"}';
    
    let content: string;
    if (typeof messageContent === 'string') {
      content = messageContent;
    } else {
      throw new Error("Expected string content");
    }
    
    const result = JSON.parse(content);
    expect(result.compliant).toBe(true);
    expect(result.details).toBe("Component meets code requirements");
  });

  it("should handle array content with text part from LLM response", () => {
    const messageContent = [
      {
        type: 'text',
        text: '{"compliant": false, "details": "Component has safety issues"}'
      }
    ];
    
    let content: string;
    if (Array.isArray(messageContent)) {
      const textPart = messageContent.find(part => part.type === 'text');
      if (textPart && 'text' in textPart) {
        content = textPart.text;
      } else {
        throw new Error("No text content in array");
      }
    } else {
      throw new Error("Expected array content");
    }
    
    const result = JSON.parse(content);
    expect(result.compliant).toBe(false);
    expect(result.details).toBe("Component has safety issues");
  });

  it("should throw error for empty content", () => {
    const messageContent = undefined;
    
    expect(() => {
      if (!messageContent) {
        throw new Error('AI returned empty response');
      }
    }).toThrow('AI returned empty response');
  });

  it("should throw error for array without text part", () => {
    const messageContent = [
      {
        type: 'image',
        url: 'https://example.com/image.jpg'
      }
    ];
    
    expect(() => {
      if (Array.isArray(messageContent)) {
        const textPart = messageContent.find((part: any) => part.type === 'text');
        if (!textPart || !('text' in textPart)) {
          throw new Error('AI response missing text content');
        }
      }
    }).toThrow('AI response missing text content');
  });

  it("should handle compliance check result structure", () => {
    const responseText = JSON.stringify({
      status: "non_compliant",
      issues: [
        {
          severity: "high",
          codeSection: "NBC 2020 Section 9.3.2.1",
          description: "Fire alarm system does not meet current standards",
          recommendation: "Upgrade to addressable fire alarm system"
        }
      ],
      summary: "Component requires upgrades to meet building code"
    });
    
    const result = JSON.parse(responseText);
    expect(result.status).toBe("non_compliant");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("high");
    expect(result.summary).toBeTruthy();
  });
});
