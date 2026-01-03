import { describe, it, expect } from 'vitest';

describe('AI Document Import Fix', () => {
  it('should use json_object mode instead of json_schema', async () => {
    // Read the ai-document-parser.ts file
    const fs = await import('fs/promises');
    const content = await fs.readFile('server/ai-document-parser.ts', 'utf-8');
    
    // Verify json_schema mode is NOT used
    expect(content).not.toContain("type: 'json_schema'");
    
    // Verify json_object mode IS used
    expect(content).toContain("type: 'json_object'");
    
    // Verify the response_format structure is correct
    expect(content).toMatch(/response_format:\s*{\s*type:\s*['"]json_object['"]\s*}/);
  });
  
  it('should not have the complex json_schema structure', async () => {
    const fs = await import('fs/promises');
    const content = await fs.readFile('server/ai-document-parser.ts', 'utf-8');
    
    // Verify the old json_schema structure is removed
    expect(content).not.toContain('json_schema:');
    expect(content).not.toContain('strict: true');
    expect(content).not.toContain('additionalProperties: false');
  });
});
