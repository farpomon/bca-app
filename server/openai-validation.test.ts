import { describe, it, expect } from 'vitest';
import OpenAI from 'openai';

describe('OpenAI API Key Validation', () => {
  it('should successfully connect to OpenAI API with provided key', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^sk-/);
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Make a simple API call to verify the key works
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "API key valid"' }],
      max_tokens: 10,
    });
    
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0]?.message?.content).toBeDefined();
  }, 30000); // 30 second timeout for API call
});
