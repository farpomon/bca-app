/**
 * Chunked Upload Service
 * Handles large file uploads by splitting them into chunks
 * Supports pause/resume and automatic retry
 */

import { storagePut } from "./storage";
import crypto from "crypto";

interface ChunkedUploadSession {
  sessionId: string;
  filename: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  chunks: Map<number, Buffer>;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'completing' | 'complete' | 'error';
}

// In-memory session store (in production, use Redis)
const sessions = new Map<string, ChunkedUploadSession>();

// Session timeout: 1 hour
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS) {
      console.log(`[ChunkedUpload] Cleaning up expired session: ${sessionId}`);
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function initChunkedUpload(
  filename: string,
  totalSize: number,
  chunkSize: number,
  metadata?: Record<string, any>
): { sessionId: string; totalChunks: number } {
  const sessionId = generateSessionId();
  const totalChunks = Math.ceil(totalSize / chunkSize);
  
  const session: ChunkedUploadSession = {
    sessionId,
    filename,
    totalSize,
    chunkSize,
    totalChunks,
    uploadedChunks: new Set(),
    chunks: new Map(),
    metadata,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    status: 'active',
  };
  
  sessions.set(sessionId, session);
  
  console.log(`[ChunkedUpload] Initialized session ${sessionId} for ${filename} (${totalChunks} chunks)`);
  
  return { sessionId, totalChunks };
}

export function getSession(sessionId: string): ChunkedUploadSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // Update last activity
  session.lastActivityAt = new Date();
  return session;
}

export function uploadChunk(
  sessionId: string,
  chunkIndex: number,
  chunkData: Buffer
): { success: boolean; uploadedChunks: number; totalChunks: number; error?: string } {
  const session = getSession(sessionId);
  
  if (!session) {
    return { success: false, uploadedChunks: 0, totalChunks: 0, error: 'Session not found or expired' };
  }
  
  if (session.status !== 'active') {
    return { success: false, uploadedChunks: session.uploadedChunks.size, totalChunks: session.totalChunks, error: 'Session is not active' };
  }
  
  if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
    return { success: false, uploadedChunks: session.uploadedChunks.size, totalChunks: session.totalChunks, error: 'Invalid chunk index' };
  }
  
  // Store chunk
  session.chunks.set(chunkIndex, chunkData);
  session.uploadedChunks.add(chunkIndex);
  session.lastActivityAt = new Date();
  
  console.log(`[ChunkedUpload] Session ${sessionId}: chunk ${chunkIndex + 1}/${session.totalChunks} uploaded`);
  
  return {
    success: true,
    uploadedChunks: session.uploadedChunks.size,
    totalChunks: session.totalChunks,
  };
}

export async function completeChunkedUpload(
  sessionId: string
): Promise<{ success: boolean; file?: { url: string; fileKey: string; filename: string; size: number }; error?: string }> {
  const session = getSession(sessionId);
  
  if (!session) {
    return { success: false, error: 'Session not found or expired' };
  }
  
  // Check all chunks are uploaded
  if (session.uploadedChunks.size !== session.totalChunks) {
    const missing = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.uploadedChunks.has(i)) {
        missing.push(i);
      }
    }
    return { success: false, error: `Missing chunks: ${missing.join(', ')}` };
  }
  
  session.status = 'completing';
  
  try {
    // Combine all chunks
    const chunks: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = session.chunks.get(i);
      if (!chunk) {
        return { success: false, error: `Chunk ${i} data not found` };
      }
      chunks.push(chunk);
    }
    
    const fileBuffer = Buffer.concat(chunks);
    
    // Verify size
    if (fileBuffer.length !== session.totalSize) {
      console.warn(`[ChunkedUpload] Size mismatch: expected ${session.totalSize}, got ${fileBuffer.length}`);
    }
    
    // Upload to S3
    const timestamp = Date.now();
    const safeFilename = session.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `chunked-uploads/${timestamp}-${safeFilename}`;
    
    // Determine content type
    const ext = session.filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') contentType = 'application/pdf';
    else if (ext === 'doc') contentType = 'application/msword';
    else if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    const { url } = await storagePut(fileKey, fileBuffer, contentType);
    
    session.status = 'complete';
    
    // Clean up session data (keep metadata for a while)
    session.chunks.clear();
    
    console.log(`[ChunkedUpload] Session ${sessionId} completed: ${url}`);
    
    return {
      success: true,
      file: {
        url,
        fileKey,
        filename: session.filename,
        size: fileBuffer.length,
      },
    };
  } catch (error) {
    session.status = 'error';
    console.error(`[ChunkedUpload] Session ${sessionId} failed:`, error);
    return { success: false, error: (error as Error).message };
  }
}

export function cancelChunkedUpload(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  sessions.delete(sessionId);
  console.log(`[ChunkedUpload] Session ${sessionId} cancelled`);
  return true;
}

export function getSessionStatus(sessionId: string): {
  exists: boolean;
  status?: string;
  uploadedChunks?: number;
  totalChunks?: number;
  filename?: string;
  missingChunks?: number[];
} {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { exists: false };
  }
  
  const missingChunks: number[] = [];
  for (let i = 0; i < session.totalChunks; i++) {
    if (!session.uploadedChunks.has(i)) {
      missingChunks.push(i);
    }
  }
  
  return {
    exists: true,
    status: session.status,
    uploadedChunks: session.uploadedChunks.size,
    totalChunks: session.totalChunks,
    filename: session.filename,
    missingChunks,
  };
}
