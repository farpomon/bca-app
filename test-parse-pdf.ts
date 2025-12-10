import { extractTextFromPDF, extractImagesFromPDF } from './server/ai-document-parser';
import fs from 'fs';

async function testParsePDF() {
  const pdfPath = '/home/ubuntu/upload/pasted_file_Z8aYWK_BCS2047[2025-06-20]BAI.pdf';
  
  console.log('Starting PDF parsing test...');
  console.log('File:', pdfPath);
  
  try {
    const buffer = fs.readFileSync(pdfPath);
    
    console.log('\n=== Extracting text ===');
    const text = await extractTextFromPDF(buffer);
    
    console.log('Text length:', text.length);
    console.log('\nFirst 1000 characters:');
    console.log(text.substring(0, 1000));
    
    console.log('\n=== Extracting images ===');
    const images = await extractImagesFromPDF(buffer);
    console.log('Number of images:', images.length);
    
    if (images.length > 0) {
      console.log('\nFirst 3 images:');
      images.slice(0, 3).forEach((img, i) => {
        console.log(`Image ${i + 1}:`, {
          page: img.pageNumber,
          mimeType: img.mimeType,
          size: img.buffer.length,
          contextPreview: img.context?.substring(0, 100)
        });
      });
    }
    
    // Save full text to file for inspection
    fs.writeFileSync('/tmp/parsed-text.txt', text);
    console.log('\nFull text saved to /tmp/parsed-text.txt');
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

testParsePDF();
