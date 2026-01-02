import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DocumentParsingError } from './ai-document-parser';

// Constants for memory management
const MAX_PAGES_PER_BATCH = 10; // Process 10 pages at a time to limit memory
const MAX_TEXT_LENGTH = 100000; // Limit text to ~100KB for AI processing

/**
 * Extract text from PDF using streaming/chunked approach
 * Processes pages in batches to limit memory usage
 * 
 * Memory optimization:
 * - Loads PDF document once but processes pages in batches
 * - Releases page objects after extracting text
 * - Limits total text output to prevent memory bloat
 */
export async function extractTextFromPDFStreaming(buffer: Buffer): Promise<string> {
  console.log(`[PDF Parser Streaming] Starting PDF text extraction, size: ${buffer.length} bytes`);
  
  if (buffer.length === 0) {
    throw new DocumentParsingError('PDF file is empty');
  }
  
  // Create Uint8Array view without copying (memory efficient)
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  const loadingTask = pdfjsLib.getDocument({ 
    data,
    // Disable features we don't need to save memory
    disableFontFace: true,
    disableRange: true,
    disableStream: true,
  });
  
  const pdfDocument = await loadingTask.promise;
  
  if (!pdfDocument || pdfDocument.numPages === 0) {
    throw new DocumentParsingError('PDF has no pages or is corrupted');
  }
  
  const numPages = pdfDocument.numPages;
  console.log(`[PDF Parser Streaming] PDF has ${numPages} pages, processing in batches of ${MAX_PAGES_PER_BATCH}`);
  
  const textParts: string[] = [];
  let totalTextLength = 0;
  let truncated = false;
  
  // Process pages in batches
  for (let batchStart = 1; batchStart <= numPages && !truncated; batchStart += MAX_PAGES_PER_BATCH) {
    const batchEnd = Math.min(batchStart + MAX_PAGES_PER_BATCH - 1, numPages);
    console.log(`[PDF Parser Streaming] Processing pages ${batchStart}-${batchEnd}`);
    
    // Process batch of pages
    const batchPromises: Promise<string>[] = [];
    
    for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
      batchPromises.push(extractPageText(pdfDocument, pageNum));
    }
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Collect results and check text length
    for (let i = 0; i < batchResults.length && !truncated; i++) {
      const pageText = batchResults[i];
      const pageNum = batchStart + i;
      
      if (totalTextLength + pageText.length > MAX_TEXT_LENGTH) {
        // Truncate to stay within limits
        const remaining = MAX_TEXT_LENGTH - totalTextLength;
        if (remaining > 0) {
          textParts.push(`\n\n=== PAGE ${pageNum} (truncated) ===\n${pageText.substring(0, remaining)}`);
        }
        truncated = true;
        console.log(`[PDF Parser Streaming] Text limit reached at page ${pageNum}, truncating`);
      } else {
        textParts.push(`\n\n=== PAGE ${pageNum} ===\n${pageText}`);
        totalTextLength += pageText.length;
      }
    }
    
    // Force garbage collection hint between batches
    // Note: This is just a hint, actual GC is controlled by V8
    if (global.gc) {
      global.gc();
    }
  }
  
  // Cleanup
  await pdfDocument.destroy();
  
  const fullText = textParts.join('');
  
  if (fullText.trim().length === 0) {
    throw new DocumentParsingError('PDF contains no extractable text. The document may be scanned or image-based.');
  }
  
  console.log(`[PDF Parser Streaming] Successfully extracted ${fullText.length} characters${truncated ? ' (truncated)' : ''}`);
  return fullText;
}

/**
 * Extract text from a single PDF page
 * Releases page resources after extraction
 */
async function extractPageText(pdfDocument: any, pageNum: number): Promise<string> {
  try {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    // Release page resources
    page.cleanup();
    
    return pageText;
  } catch (pageError) {
    console.error(`[PDF Parser Streaming] Error extracting page ${pageNum}:`, pageError);
    throw new DocumentParsingError(
      `Failed to extract text from page ${pageNum}`,
      pageError instanceof Error ? pageError : undefined
    );
  }
}

/**
 * Extract text from Word document with memory optimization
 * mammoth already handles streaming internally for large documents
 */
export async function extractTextFromWordStreaming(buffer: Buffer): Promise<string> {
  console.log(`[Word Parser Streaming] Starting Word text extraction, size: ${buffer.length} bytes`);
  
  if (buffer.length === 0) {
    throw new DocumentParsingError('Word document is empty');
  }
  
  const result = await mammoth.extractRawText({ buffer });
  
  if (!result || !result.value) {
    throw new DocumentParsingError('Failed to extract text from Word document');
  }
  
  let text = result.value;
  
  // Truncate if too long
  if (text.length > MAX_TEXT_LENGTH) {
    console.log(`[Word Parser Streaming] Text truncated from ${text.length} to ${MAX_TEXT_LENGTH} characters`);
    text = text.substring(0, MAX_TEXT_LENGTH);
  }
  
  if (text.trim().length === 0) {
    throw new DocumentParsingError('Word document contains no extractable text');
  }
  
  console.log(`[Word Parser Streaming] Successfully extracted ${text.length} characters`);
  return text;
}

/**
 * Process document with memory-efficient streaming
 * Replaces the original extractTextFromPDF/extractTextFromWord calls
 */
export async function extractTextStreaming(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDFStreaming(buffer);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractTextFromWordStreaming(buffer);
  } else {
    throw new DocumentParsingError(`Unsupported document type: ${mimeType}`);
  }
}
