/**
 * Streaming Utilities for Memory-Efficient File Transfers
 * 
 * These utilities help reduce memory usage when handling large files
 * by using streaming and chunked transfers instead of loading entire
 * files into memory.
 */

import { Readable, PassThrough } from 'stream';

/**
 * Configuration for chunked file processing
 */
export const CHUNK_CONFIG = {
  // Default chunk size for streaming (64KB)
  DEFAULT_CHUNK_SIZE: 64 * 1024,
  // Maximum size for direct base64 encoding (1MB)
  // Files larger than this should use chunked upload
  MAX_DIRECT_BASE64_SIZE: 1 * 1024 * 1024,
  // Maximum file size for uploads (10MB)
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024,
};

/**
 * Convert a buffer to base64 in chunks to reduce peak memory usage
 * For very large buffers, this prevents the 33% memory spike from
 * creating a single large base64 string
 */
export function bufferToBase64Chunked(buffer: Buffer, chunkSize: number = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE): string {
  if (buffer.length <= chunkSize) {
    return buffer.toString('base64');
  }
  
  const chunks: string[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
    chunks.push(chunk.toString('base64'));
  }
  
  return chunks.join('');
}

/**
 * Convert base64 string to buffer in chunks
 * Useful for processing large base64 inputs without loading entire string
 */
export function base64ToBufferChunked(base64: string, chunkSize: number = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE * 4 / 3): Buffer {
  if (base64.length <= chunkSize) {
    return Buffer.from(base64, 'base64');
  }
  
  // Base64 chunks must be multiples of 4 characters
  const alignedChunkSize = Math.floor(chunkSize / 4) * 4;
  const chunks: Buffer[] = [];
  
  for (let i = 0; i < base64.length; i += alignedChunkSize) {
    const chunk = base64.slice(i, Math.min(i + alignedChunkSize, base64.length));
    chunks.push(Buffer.from(chunk, 'base64'));
  }
  
  return Buffer.concat(chunks);
}

/**
 * Create a readable stream from a buffer for streaming responses
 * This allows sending large files without loading them entirely in memory
 */
export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
  return stream;
}

/**
 * Collect stream chunks into a buffer
 * Use with caution - this will load the entire stream into memory
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Process a buffer in chunks with a callback
 * Useful for processing large files without loading them entirely
 */
export async function processBufferInChunks(
  buffer: Buffer,
  chunkSize: number,
  processor: (chunk: Buffer, index: number) => Promise<void>
): Promise<void> {
  const totalChunks = Math.ceil(buffer.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, buffer.length);
    const chunk = buffer.subarray(start, end);
    await processor(chunk, i);
  }
}

/**
 * Calculate the memory overhead of base64 encoding
 * Base64 encoding increases size by approximately 33%
 */
export function calculateBase64Size(originalSize: number): number {
  return Math.ceil(originalSize * 4 / 3);
}

/**
 * Check if a file should use chunked upload based on size
 */
export function shouldUseChunkedUpload(fileSize: number): boolean {
  return fileSize > CHUNK_CONFIG.MAX_DIRECT_BASE64_SIZE;
}

/**
 * Memory-efficient file info extractor
 * Gets file metadata without loading entire file
 */
export interface FileInfo {
  size: number;
  base64Size: number;
  shouldChunk: boolean;
  recommendedChunks: number;
}

export function getFileInfo(buffer: Buffer): FileInfo {
  const size = buffer.length;
  return {
    size,
    base64Size: calculateBase64Size(size),
    shouldChunk: shouldUseChunkedUpload(size),
    recommendedChunks: Math.ceil(size / CHUNK_CONFIG.DEFAULT_CHUNK_SIZE),
  };
}

/**
 * Create a transform stream that converts binary to base64 in chunks
 * Useful for streaming large files as base64 without memory spikes
 */
export function createBase64TransformStream(): PassThrough {
  let buffer = Buffer.alloc(0);
  
  const transform = new PassThrough({
    transform(chunk: Buffer, encoding, callback) {
      // Accumulate chunks until we have a multiple of 3 bytes
      // (required for proper base64 encoding)
      buffer = Buffer.concat([buffer, chunk]);
      
      const remainder = buffer.length % 3;
      const toEncode = buffer.subarray(0, buffer.length - remainder);
      buffer = buffer.subarray(buffer.length - remainder);
      
      if (toEncode.length > 0) {
        this.push(toEncode.toString('base64'));
      }
      
      callback();
    },
    flush(callback) {
      // Encode any remaining bytes
      if (buffer.length > 0) {
        this.push(buffer.toString('base64'));
      }
      callback();
    }
  });
  
  return transform;
}
