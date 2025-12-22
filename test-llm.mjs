import fetch from 'node-fetch';

async function testLLM() {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL || 'https://forge.manus.im';
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  
  console.log('API URL:', apiUrl);
  console.log('API Key exists:', !!apiKey);
  
  const payload = {
    model: 'gemini-2.5-flash',
    messages: [
      {
        role: 'system',
        content: 'You are a building code compliance expert. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this building component for compliance: Exterior Walls - Condition: Good (80%). Return JSON with status (compliant/non_compliant/needs_review), issues array, and summary.'
          },
          {
            type: 'file_url',
            file_url: {
              url: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663028353512/WXKmoGNIHyZlOCST.pdf',
              mime_type: 'application/pdf'
            }
          }
        ]
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 32768,
    thinking: { budget_tokens: 128 }
  };
  
  console.log('Sending request...');
  
  try {
    const response = await fetch(apiUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('Success! Response:', JSON.stringify(result, null, 2).substring(0, 2000));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLLM();
