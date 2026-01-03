import { Request, Response } from 'express';
import multer from 'multer';
import { storagePut } from '../storage';
import * as modelsDb from '../db/models.db';
import { sdk } from '../_core/sdk';
import {
  createBucket,
  uploadObject,
  translateModel,
  objectIdToUrn,
  generateBucketKey,
} from '../_core/apsService';

// Default bucket key for the application
const APP_BUCKET_KEY = process.env.APS_BUCKET_KEY || generateBucketKey('bca-models');

// Supported model formats
const SUPPORTED_FORMATS = ['glb', 'gltf', 'fbx', 'obj', 'skp', 'rvt', 'rfa', 'dwg', 'dxf', 'ifc', 'nwd', 'nwc'];

// Configure multer for memory storage with larger file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for 3D models
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext && SUPPORTED_FORMATS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`));
    }
  },
});

export const uploadModelHandler = upload.single('file');

export async function handleModelUpload(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    // Authenticate user
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (authError) {
      console.error('[Model Upload] Authentication failed:', authError);
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse form data
    const projectId = parseInt(req.body.projectId);
    const assetId = req.body.assetId ? parseInt(req.body.assetId) : null;
    const name = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, '');
    const description = req.body.description || '';
    const uploadToAps = req.body.uploadToAps !== 'false'; // Default to true
    
    // Get format from file extension
    const format = req.file.originalname.split('.').pop()?.toLowerCase() || 'unknown';

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    console.log(`[Model Upload] Starting upload for project ${projectId}, format: ${format}, user: ${user.id}`);
    console.log(`[Model Upload] File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    const buffer = req.file.buffer;
    const fileSize = buffer.length;

    // Upload to S3 for backup/storage
    const timestamp = Date.now();
    const fileKey = `models/${projectId}/${timestamp}-${name}.${format}`;
    console.log(`[Model Upload] Starting S3 upload with key: ${fileKey}`);
    
    const s3StartTime = Date.now();
    const { url } = await storagePut(fileKey, buffer, `model/${format}`);
    console.log(`[Model Upload] S3 upload successful in ${Date.now() - s3StartTime}ms, URL: ${url}`);

    // Create initial database record
    const modelData: any = {
      projectId,
      assetId,
      name,
      description,
      fileUrl: url,
      fileKey,
      fileSize,
      format,
      version: 1,
      isActive: 1,
      metadata: null,
      uploadedBy: user.id,
    };

    // If APS upload is requested, upload to APS and start translation
    if (uploadToAps) {
      try {
        console.log(`[Model Upload] Starting APS upload...`);
        const apsStartTime = Date.now();
        
        // Ensure bucket exists
        await createBucket(APP_BUCKET_KEY);
        
        // Generate unique object key
        const apsObjectKey = `${projectId}/${timestamp}-${name}.${format}`;
        
        // Upload to APS
        const uploadResult = await uploadObject(
          APP_BUCKET_KEY,
          apsObjectKey,
          buffer,
          `application/octet-stream`
        );
        console.log(`[Model Upload] APS upload successful in ${Date.now() - apsStartTime}ms, objectId: ${uploadResult.objectId}`);
        
        // Convert to URN and start translation
        const urn = objectIdToUrn(uploadResult.objectId);
        console.log(`[Model Upload] Starting translation for URN: ${urn}`);
        
        const translationResult = await translateModel(urn);
        console.log(`[Model Upload] Translation started, result: ${translationResult.result}`);
        
        // Add APS data to model record
        modelData.apsObjectKey = apsObjectKey;
        modelData.apsBucketKey = APP_BUCKET_KEY;
        modelData.apsUrn = urn;
        modelData.apsTranslationStatus = 'in_progress';
        modelData.apsTranslationProgress = 0;
        modelData.apsUploadedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        modelData.apsTranslationStartedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      } catch (apsError) {
        console.error(`[Model Upload] APS upload failed:`, apsError);
        // Continue with S3-only upload, mark APS as failed
        modelData.apsTranslationStatus = 'failed';
        modelData.apsTranslationMessage = apsError instanceof Error ? apsError.message : 'APS upload failed';
      }
    }

    // Create database record
    await modelsDb.createFacilityModel(modelData);
    console.log(`[Model Upload] Database record created successfully in ${Date.now() - startTime}ms total`);

    return res.json({
      success: true,
      url,
      apsUrn: modelData.apsUrn,
      apsStatus: modelData.apsTranslationStatus,
    });
  } catch (error) {
    console.error(`[Model Upload] Error after ${Date.now() - startTime}ms:`, error);
    return res.status(500).json({ 
      error: 'Failed to upload model',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
