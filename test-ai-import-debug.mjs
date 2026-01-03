import { readFileSync } from 'fs';

// Simulate the AI import with the actual document
const testFile = '/home/ubuntu/upload/LMS582 [2024-08-07] BAI.docx';

try {
  const fileBuffer = readFileSync(testFile);
  const base64Content = fileBuffer.toString('base64');
  
  console.log('File size:', fileBuffer.length, 'bytes');
  console.log('Base64 length:', base64Content.length);
  console.log('MIME type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  
  // Now let's test the actual endpoint
  const response = await fetch('http://localhost:3000/api/trpc/assets.aiImport', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: 1,
      fileContent: base64Content,
      fileName: 'LMS582 [2024-08-07] BAI.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
  });
  
  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
