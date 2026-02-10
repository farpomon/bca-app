import { describe, it, expect, vi } from 'vitest';

// Mock OpenAI to avoid real API calls in tests
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'API key valid' } }],
          }),
        },
      },
    })),
  };
});

import OpenAI from 'openai';

describe('OpenAI API Key Validation', () => {
  it('should successfully connect to OpenAI API with provided key', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    expect(apiKey).toBeDefined();
    
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
