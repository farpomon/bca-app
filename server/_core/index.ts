import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleAudioUpload, uploadAudio } from "../audioUpload";
import { serveStatic, setupVite } from "./vite";
import {
  configureSecurityHeaders,
  apiRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  validateInput,
  logSecurityEvents,
  configureCORS,
  limitRequestSize,
} from "./security";
import { startBackupScheduler } from "../services/backupScheduler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Trust proxy - needed for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  
  // Security middleware - MUST be first
  app.use(configureSecurityHeaders());
  app.use(configureCORS());
  app.use(logSecurityEvents);
  app.use(limitRequestSize(50)); // 50MB max request size
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Input validation middleware
  app.use(validateInput);
  // OAuth callback under /api/oauth/callback (with rate limiting)
  app.use("/api/oauth", authRateLimiter);
  registerOAuthRoutes(app);
  
  // Health monitoring endpoints
  const { handleMemoryHealth, handleForceGC } = await import('../api/health-memory');
  app.get("/api/health/memory", handleMemoryHealth);
  app.post("/api/health/gc", handleForceGC);
  
  // Chunked upload endpoints for large files (resumable)
  const { 
    initUploadSession, 
    uploadChunk, 
    getUploadStatus, 
    completeUpload, 
    cancelUpload,
    chunkUploadMiddleware 
  } = await import('../api/chunked-upload');
  app.post("/api/upload/chunked/init", express.json(), initUploadSession);
  app.post("/api/upload/chunked/:sessionId/chunk", chunkUploadMiddleware, uploadChunk);
  app.get("/api/upload/chunked/:sessionId/status", getUploadStatus);
  app.post("/api/upload/chunked/:sessionId/complete", completeUpload);
  app.delete("/api/upload/chunked/:sessionId", cancelUpload);
  
  // Export progress SSE endpoints
  const {
    handleExportProgressSSE,
    handleGetExportStatus,
    handleCancelExport,
    handleCreateExportSession,
  } = await import('../api/export-progress');
  app.get("/api/export/progress/:exportId/stream", handleExportProgressSSE);
  app.get("/api/export/progress/:exportId", handleGetExportStatus);
  app.post("/api/export/progress/:exportId/cancel", handleCancelExport);
  app.post("/api/export/progress/create", express.json(), handleCreateExportSession);
  
  // Audio upload endpoint (with rate limiting)
  app.post("/api/upload-audio", uploadRateLimiter, handleAudioUpload, uploadAudio);
  
  // Photo upload endpoint (with rate limiting)
  const { uploadPhotoHandler, handlePhotoUpload } = await import('../api/upload-photo');
  app.post("/api/upload-photo", uploadRateLimiter, uploadPhotoHandler, handlePhotoUpload);
  
  // Document upload endpoint for AI import (with rate limiting)
  const { uploadMiddleware, handleUpload } = await import('./upload-handler');
  app.post("/api/upload", uploadRateLimiter, uploadMiddleware, handleUpload);
  
  // 3D Model upload endpoint (with rate limiting) - uses multipart form data for large files
  const { uploadModelHandler, handleModelUpload } = await import('../api/upload-model');
  app.post("/api/upload-model", uploadRateLimiter, uploadModelHandler, handleModelUpload);
  // tRPC API (with rate limiting)
  app.use("/api/trpc", apiRateLimiter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Start backup scheduler for automated daily backups
    startBackupScheduler();
  });
}

startServer().catch(console.error);
