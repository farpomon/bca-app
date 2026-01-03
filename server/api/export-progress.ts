import { Request, Response } from 'express';
import crypto from 'crypto';

/**
 * Server-Sent Events (SSE) for Bulk Export Progress
 * 
 * Provides real-time progress updates for long-running export operations.
 * Supports cancellation and multiple concurrent exports.
 */

export interface ExportProgress {
  exportId: string;
  status: 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';
  progress: number; // 0-100
  currentItem: number;
  totalItems: number;
  currentItemName?: string;
  message?: string;
  result?: {
    url?: string;
    filename?: string;
    size?: number;
  };
  error?: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
}

// Active export sessions
const exportSessions = new Map<string, ExportProgress>();

// SSE clients subscribed to export progress
const sseClients = new Map<string, Set<Response>>();

// Export timeout (30 minutes)
const EXPORT_TIMEOUT = 30 * 60 * 1000;

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Cleanup old export sessions
setInterval(() => {
  const now = Date.now();
  const staleExports: string[] = [];
  
  for (const [id, session] of exportSessions) {
    if (now - session.updatedAt > EXPORT_TIMEOUT) {
      staleExports.push(id);
    }
  }
  
  for (const id of staleExports) {
    exportSessions.delete(id);
    sseClients.delete(id);
  }
  
  if (staleExports.length > 0) {
    console.log(`[ExportProgress] Cleaned up ${staleExports.length} stale export sessions`);
  }
}, CLEANUP_INTERVAL);

/**
 * Create a new export session
 */
export function createExportSession(totalItems: number, userId?: number): string {
  const exportId = crypto.randomUUID();
  
  const session: ExportProgress = {
    exportId,
    status: 'pending',
    progress: 0,
    currentItem: 0,
    totalItems,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  exportSessions.set(exportId, session);
  sseClients.set(exportId, new Set());
  
  console.log(`[ExportProgress] Created export session ${exportId} with ${totalItems} items`);
  
  return exportId;
}

/**
 * Update export progress
 */
export function updateExportProgress(
  exportId: string,
  update: Partial<Omit<ExportProgress, 'exportId' | 'startedAt'>>
): void {
  const session = exportSessions.get(exportId);
  
  if (!session) {
    console.warn(`[ExportProgress] Session ${exportId} not found`);
    return;
  }
  
  // Update session
  Object.assign(session, update, { updatedAt: Date.now() });
  
  // Calculate progress if not explicitly set
  if (update.currentItem !== undefined && update.progress === undefined) {
    session.progress = Math.round((session.currentItem / session.totalItems) * 100);
  }
  
  // Notify all SSE clients
  const clients = sseClients.get(exportId);
  if (clients) {
    const eventData = JSON.stringify(session);
    
    for (const client of clients) {
      try {
        client.write(`data: ${eventData}\n\n`);
      } catch (error) {
        console.error(`[ExportProgress] Failed to send SSE to client:`, error);
        clients.delete(client);
      }
    }
  }
}

/**
 * Complete export session
 */
export function completeExport(
  exportId: string,
  result: { url?: string; filename?: string; size?: number }
): void {
  updateExportProgress(exportId, {
    status: 'complete',
    progress: 100,
    result,
    completedAt: Date.now(),
  });
  
  // Close all SSE connections after a short delay
  setTimeout(() => {
    const clients = sseClients.get(exportId);
    if (clients) {
      for (const client of clients) {
        try {
          client.end();
        } catch (error) {
          // Client may already be closed
        }
      }
      sseClients.delete(exportId);
    }
  }, 5000);
}

/**
 * Mark export as failed
 */
export function failExport(exportId: string, error: string): void {
  updateExportProgress(exportId, {
    status: 'error',
    error,
    completedAt: Date.now(),
  });
}

/**
 * Cancel export
 */
export function cancelExport(exportId: string): boolean {
  const session = exportSessions.get(exportId);
  
  if (!session || session.status === 'complete' || session.status === 'error') {
    return false;
  }
  
  updateExportProgress(exportId, {
    status: 'cancelled',
    message: 'Export cancelled by user',
    completedAt: Date.now(),
  });
  
  return true;
}

/**
 * Check if export is cancelled
 */
export function isExportCancelled(exportId: string): boolean {
  const session = exportSessions.get(exportId);
  return session?.status === 'cancelled';
}

/**
 * Get export session status
 */
export function getExportStatus(exportId: string): ExportProgress | null {
  return exportSessions.get(exportId) || null;
}

/**
 * SSE endpoint handler - subscribe to export progress
 */
export function handleExportProgressSSE(req: Request, res: Response): void {
  const { exportId } = req.params;
  
  const session = exportSessions.get(exportId);
  
  if (!session) {
    res.status(404).json({ error: 'Export session not found' });
    return;
  }
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial state
  res.write(`data: ${JSON.stringify(session)}\n\n`);
  
  // Add client to subscribers
  const clients = sseClients.get(exportId);
  if (clients) {
    clients.add(res);
  }
  
  // Handle client disconnect
  req.on('close', () => {
    const clients = sseClients.get(exportId);
    if (clients) {
      clients.delete(res);
    }
  });
  
  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
}

/**
 * REST endpoint - get export status
 */
export function handleGetExportStatus(req: Request, res: Response): void {
  const { exportId } = req.params;
  
  const session = exportSessions.get(exportId);
  
  if (!session) {
    res.status(404).json({ error: 'Export session not found' });
    return;
  }
  
  res.json(session);
}

/**
 * REST endpoint - cancel export
 */
export function handleCancelExport(req: Request, res: Response): void {
  const { exportId } = req.params;
  
  const success = cancelExport(exportId);
  
  if (success) {
    res.json({ success: true, message: 'Export cancelled' });
  } else {
    res.status(400).json({ 
      success: false, 
      error: 'Cannot cancel export - not found or already completed' 
    });
  }
}

/**
 * REST endpoint - create export session (for testing)
 */
export function handleCreateExportSession(req: Request, res: Response): void {
  const { totalItems = 10 } = req.body;
  
  const exportId = createExportSession(totalItems);
  
  res.json({
    exportId,
    message: 'Export session created',
    sseUrl: `/api/export/progress/${exportId}/stream`,
  });
}
