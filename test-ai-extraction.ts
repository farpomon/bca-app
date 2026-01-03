import { extractTextFromPDF, extractBCADataFromText } from './server/ai-document-parser';
import fs from 'fs';

async function testAIExtraction() {
  const pdfPath = '/home/ubuntu/upload/pasted_file_Z8aYWK_BCS2047[2025-06-20]BAI.pdf';
  
  console.log('Starting AI extraction test...');
  
  try {
    const buffer = fs.readFileSync(pdfPath);
    const text = await extractTextFromPDF(buffer);
    console.log('Text extracted:', text.length, 'chars');
    
    console.log('Running AI extraction (this may take 30 seconds)...');
    const extracted = await extractBCADataFromText(text);
    
    console.log('Confidence:', extracted.confidence);
    console.log('Assessments:', extracted.assessments.length);
    console.log('Deficiencies:', extracted.deficiencies.length);
    
    fs.writeFileSync('/tmp/extracted-data.json', JSON.stringify(extracted, null, 2));
    console.log('Saved to /tmp/extracted-data.json');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAIExtraction();
