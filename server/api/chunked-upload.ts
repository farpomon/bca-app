import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { storagePut } from '../storage';

/**
 * Chunked File Upload Handler
 * 
 * Supports resumable uploads for large documents (>1MB).
 * Uses session-based chunk tracking for reliable uploads.
 */

interface UploadSession {
  id: string;
  filename: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  createdAt: number;
  lastActivity: number;
  tempDir: string;
  userId?: number;
  metadata?: Record<string, unknown>;
}

// In-memory session store (consider Redis for production scaling)
const uploadSessions = new Map<string, UploadSession>();

// Cleanup interval for stale sessions (1 hour)
const SESSION_TIMEOUT = 60 * 60 * 1000;
const CLEANUP_INTERVAL = 15 * 60 * 1000;

// Default chunk size: 1MB
const DEFAULT_CHUNK_SIZE = 1024 * 1024;

// Temp directory for chunks
const TEMP_DIR = '/tmp/bca-uploads';

// Ensure temp directory exists
async function ensureTempDir(): Promise<void> {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('[ChunkedUpload] Failed to create temp directory:', error);
  }
}

// Initialize temp directory
ensureTempDir();

// Cleanup stale sessions periodically
setInterval(async () => {
  const now = Date.now();
  const staleSessions: string[] = [];
  
  for (const [id, session] of uploadSessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      staleSessions.push(id);
    }
  }
  
  for (const id of staleSessions) {
    const session = uploadSessions.get(id);
    if (session) {
      try {
        await fs.rm(session.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`[ChunkedUpload] Failed to cleanup session ${id}:`, error);
      }
      uploadSessions.delete(id);
    }
  }
  
  if (staleSessions.length > 0) {
    console.log(`[ChunkedUpload] Cleaned up ${staleSessions.length} stale sessions`);
  }
}, CLEANUP_INTERVAL);

// Multer configuration for chunk uploads
const storage = multer.memoryStorage();
export const chunkUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: DEFAULT_CHUNK_SIZE * 2, // Allow some overhead
  },
}).single('chunk');

/**
 * Initialize a new upload session
 */
export async function initUploadSession(req: Request, res: Response): Promise<void> {
  try {
    const { filename, totalSize, chunkSize = DEFAULT_CHUNK_SIZE, metadata } = req.body;
    
    if (!filename || !totalSize) {
      res.status(400).json({
        error: 'Missing required fields: filename, totalSize',
      });
      return;
    }
    
    const sessionId = crypto.randomUUID();
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const tempDir = path.join(TEMP_DIR, sessionId);
    
    await fs.mkdir(tempDir, { recursive: true });
    
    const session: UploadSession = {
      id: sessionId,
      filename,
      totalSize,
      chunkSize,
      totalChunks,
      receivedChunks: new Set(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      tempDir,
      userId: (req as any).user?.id,
      metadata,
    };
    
    uploadSessions.set(sessionId, session);
    
    res.json({
      sessionId,
      chunkSize,
      totalChunks,
      message: 'Upload session initialized',
    });
  } catch (error) {
    console.error('[ChunkedUpload] Failed to initialize session:', error);
    res.status(500).json({
      error: 'Failed to initialize upload session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Upload a single chunk
 */
export async function uploadChunk(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const chunkIndex = parseInt(req.body.chunkIndex, 10);
    const chunk = req.file?.buffer;
    
    if (!sessionId || isNaN(chunkIndex) || !chunk) {
      res.status(400).json({
        error: 'Missing required fields: sessionId, chunkIndex, chunk',
      });
      return;
    }
    
    const session = uploadSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({
        error: 'Upload session not found or expired',
      });
      return;
    }
    
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      res.status(400).json({
        error: `Invalid chunk index: ${chunkIndex}. Expected 0-${session.totalChunks - 1}`,
      });
      return;
    }
    
    // Save chunk to temp file
    const chunkPath = path.join(session.tempDir, `chunk_${chunkIndex.toString().padStart(6, '0')}`);
    await fs.writeFile(chunkPath, chunk);
    
    session.receivedChunks.add(chunkIndex);
    session.lastActivity = Date.now();
    
    const progress = (session.receivedChunks.size / session.totalChunks) * 100;
    const isComplete = session.receivedChunks.size === session.totalChunks;
    
    res.json({
      success: true,
      chunkIndex,
      receivedChunks: session.receivedChunks.size,
      totalChunks: session.totalChunks,
      progress: parseFloat(progress.toFixed(2)),
      isComplete,
    });
  } catch (error) {
    console.error('[ChunkedUpload] Failed to upload chunk:', error);
    res.status(500).json({
      error: 'Failed to upload chunk',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get upload session status (for resuming)
 */
export async function getUploadStatus(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const session = uploadSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({
        error: 'Upload session not found or expired',
      });
      return;
    }
    
    const missingChunks: number[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.receivedChunks.has(i)) {
        missingChunks.push(i);
      }
    }
    
    const progress = (session.receivedChunks.size / session.totalChunks) * 100;
    
    res.json({
      sessionId: session.id,
      filename: session.filename,
      totalSize: session.totalSize,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      receivedChunks: session.receivedChunks.size,
      missingChunks,
      progress: parseFloat(progress.toFixed(2)),
      isComplete: session.receivedChunks.size === session.totalChunks,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    });
  } catch (error) {
    console.error('[ChunkedUpload] Failed to get status:', error);
    res.status(500).json({
      error: 'Failed to get upload status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Complete upload and merge chunks
 */
export async function completeUpload(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const session = uploadSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({
        error: 'Upload session not found or expired',
      });
      return;
    }
    
    if (session.receivedChunks.size !== session.totalChunks) {
      const missingChunks: number[] = [];
      for (let i = 0; i < session.totalChunks; i++) {
        if (!session.receivedChunks.has(i)) {
          missingChunks.push(i);
        }
      }
      
      res.status(400).json({
        error: 'Upload incomplete',
        missingChunks,
        receivedChunks: session.receivedChunks.size,
        totalChunks: session.totalChunks,
      });
      return;
    }
    
    // Merge chunks into final file
    const finalPath = path.join(session.tempDir, session.filename);
    const writeStream = await fs.open(finalPath, 'w');
    
    try {
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join(session.tempDir, `chunk_${i.toString().padStart(6, '0')}`);
        const chunkData = await fs.readFile(chunkPath);
        await writeStream.write(chunkData);
      }
    } finally {
      await writeStream.close();
    }
    
    // Read the complete file
    const fileBuffer = await fs.readFile(finalPath);
    
    // Clean up temp files (keep final file for now)
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(session.tempDir, `chunk_${i.toString().padStart(6, '0')}`);
      await fs.unlink(chunkPath).catch(() => {});
    }
    
    // Store file info for retrieval
    const fileInfo = {
      sessionId: session.id,
      filename: session.filename,
      size: fileBuffer.length,
      path: finalPath,
      metadata: session.metadata,
      completedAt: Date.now(),
    };
    
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
    
    // Clean up temp directory
    await fs.rm(session.tempDir, { recursive: true, force: true }).catch(() => {});
    
    // Remove session from active sessions
    uploadSessions.delete(sessionId);
    
    res.json({
      success: true,
      file: {
        url,
        fileKey,
        filename: session.filename,
        size: fileBuffer.length,
        sessionId: session.id,
      },
      message: 'Upload completed successfully',
    });
  } catch (error) {
    console.error('[ChunkedUpload] Failed to complete upload:', error);
    res.status(500).json({
      error: 'Failed to complete upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Cancel and cleanup upload session
 */
export async function cancelUpload(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const session = uploadSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({
        error: 'Upload session not found or already cleaned up',
      });
      return;
    }
    
    // Clean up temp directory
    await fs.rm(session.tempDir, { recursive: true, force: true });
    uploadSessions.delete(sessionId);
    
    res.json({
      success: true,
      message: 'Upload session cancelled and cleaned up',
    });
  } catch (error) {
    console.error('[ChunkedUpload] Failed to cancel upload:', error);
    res.status(500).json({
      error: 'Failed to cancel upload',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get completed file buffer for processing
 */
export async function getCompletedFile(sessionId: string): Promise<Buffer | null> {
  const tempDir = path.join(TEMP_DIR, sessionId);
  
  try {
    const files = await fs.readdir(tempDir);
    const dataFile = files.find(f => !f.startsWith('chunk_'));
    
    if (dataFile) {
      return await fs.readFile(path.join(tempDir, dataFile));
    }
  } catch (error) {
    console.error(`[ChunkedUpload] Failed to get completed file for ${sessionId}:`, error);
  }
  
  return null;
}

/**
 * Cleanup completed file after processing
 */
export async function cleanupCompletedFile(sessionId: string): Promise<void> {
  const tempDir = path.join(TEMP_DIR, sessionId);
  
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`[ChunkedUpload] Failed to cleanup ${sessionId}:`, error);
  }
}
