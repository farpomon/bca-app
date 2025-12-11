import { extractImagesFromPDF } from './server/ai-document-parser';
import { readFileSync } from 'fs';

async function test() {
  const pdfPath = '/home/ubuntu/upload/pasted_file_Z8aYWK_BCS2047[2025-06-20]BAI.pdf';
  const buffer = readFileSync(pdfPath);
  
  console.log('Extracting images from PDF...');
  const images = await extractImagesFromPDF(buffer);
  
  console.log(`Extracted ${images.length} images`);
  
  if (images.length > 0) {
    const firstImage = images[0];
    console.log('First image:');
    console.log('- Buffer size:', firstImage.buffer.length, 'bytes');
    console.log('- MIME type:', firstImage.mimeType);
    console.log('- Page:', firstImage.pageNumber);
    
    // Check if it's a valid PNG by checking magic bytes
    const isPNG = firstImage.buffer[0] === 0x89 && 
                  firstImage.buffer[1] === 0x50 && 
                  firstImage.buffer[2] === 0x4E && 
                  firstImage.buffer[3] === 0x47;
    console.log('- Valid PNG format:', isPNG);
  }
}

test().catch(console.error);
