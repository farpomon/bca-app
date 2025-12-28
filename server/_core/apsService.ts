/**
 * Autodesk Platform Services (APS) Service
 * 
 * Provides complete model management functionality including:
 * - Bucket management
 * - File upload to APS (using S3 signed URLs)
 * - Model translation (SVF2 format for Forge Viewer)
 * - Translation status tracking
 * 
 * Updated: Uses new S3 signed URL workflow instead of deprecated resumable endpoint
 */

import { getApsToken } from './aps';

const APS_BASE_URL = 'https://developer.api.autodesk.com';

// Bucket region options
export type BucketRegion = 'US' | 'EMEA';

// Bucket retention policy
export type BucketPolicy = 'transient' | 'temporary' | 'persistent';

interface CreateBucketResponse {
  bucketKey: string;
  bucketOwner: string;
  createdDate: number;
  permissions: Array<{ authId: string; access: string }>;
  policyKey: string;
}

interface UploadObjectResponse {
  bucketKey: string;
  objectId: string;
  objectKey: string;
  sha1: string;
  size: number;
  location: string;
}

interface SignedS3UploadResponse {
  uploadKey: string;
  uploadExpiration: string;
  urlExpiration: string;
  urls: string[];
}

interface CompleteUploadResponse {
  bucketKey: string;
  objectId: string;
  objectKey: string;
  size: number;
  sha1: string;
  contentType: string;
  location: string;
}

interface TranslationJobResponse {
  result: string;
  urn: string;
  acceptedJobs?: {
    output: {
      formats: Array<{
        type: string;
        views: string[];
      }>;
    };
  };
}

interface TranslationStatusResponse {
  type: string;
  hasThumbnail: string;
  status: string;
  progress: string;
  region: string;
  urn: string;
  derivatives?: Array<{
    name: string;
    hasThumbnail: string;
    status: string;
    progress: string;
    outputType: string;
    children?: Array<{
      guid: string;
      type: string;
      role: string;
      name: string;
      status: string;
      progress: string;
      urn?: string;
    }>;
  }>;
}

/**
 * Generate a unique bucket key based on app ID
 * Bucket keys must be globally unique, 3-128 chars, lowercase alphanumeric and dashes
 */
export function generateBucketKey(prefix: string = 'bca-app'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Create a new bucket in APS for storing models
 */
export async function createBucket(
  bucketKey: string,
  region: BucketRegion = 'US',
  policy: BucketPolicy = 'persistent'
): Promise<CreateBucketResponse> {
  const { accessToken } = await getApsToken(['bucket:create', 'bucket:read', 'data:write']);

  const response = await fetch(`${APS_BASE_URL}/oss/v2/buckets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'x-ads-region': region,
    },
    body: JSON.stringify({
      bucketKey,
      policyKey: policy,
    }),
  });

  if (!response.ok) {
    // Bucket might already exist - try to get it
    if (response.status === 409) {
      return getBucket(bucketKey);
    }
    const errorText = await response.text();
    throw new Error(`Failed to create bucket: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get bucket details
 */
export async function getBucket(bucketKey: string): Promise<CreateBucketResponse> {
  const { accessToken } = await getApsToken(['bucket:read']);

  const response = await fetch(`${APS_BASE_URL}/oss/v2/buckets/${bucketKey}/details`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get bucket: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get signed S3 URLs for uploading an object
 * This is the new recommended approach (replaces deprecated resumable endpoint)
 */
async function getSignedS3UploadUrls(
  bucketKey: string,
  objectKey: string,
  accessToken: string,
  parts: number = 1,
  uploadKey?: string,
  firstPart: number = 1
): Promise<SignedS3UploadResponse> {
  const params = new URLSearchParams({
    parts: parts.toString(),
    firstPart: firstPart.toString(),
  });
  
  if (uploadKey) {
    params.append('uploadKey', uploadKey);
  }

  const response = await fetch(
    `${APS_BASE_URL}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload?${params}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get signed S3 upload URLs: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Complete the S3 upload by notifying APS
 */
async function completeS3Upload(
  bucketKey: string,
  objectKey: string,
  accessToken: string,
  uploadKey: string,
  size: number,
  eTags: Array<{ partNumber: number; eTag: string }>
): Promise<CompleteUploadResponse> {
  const response = await fetch(
    `${APS_BASE_URL}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        uploadKey,
        size,
        eTags,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to complete S3 upload: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Upload a file to APS bucket using S3 signed URLs
 * For files > 5MB, uses multipart upload with signed URLs
 */
export async function uploadObject(
  bucketKey: string,
  objectKey: string,
  fileBuffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<UploadObjectResponse> {
  const { accessToken } = await getApsToken(['data:write', 'data:read', 'data:create']);

  const fileSize = fileBuffer.length;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum for multipart
  
  // Calculate number of parts needed
  const numParts = Math.ceil(fileSize / CHUNK_SIZE);
  
  if (numParts === 1) {
    // Single part upload
    return uploadObjectSinglePart(bucketKey, objectKey, fileBuffer, contentType, accessToken);
  }
  
  // Multipart upload using S3 signed URLs
  return uploadObjectMultipart(bucketKey, objectKey, fileBuffer, contentType, accessToken, numParts);
}

/**
 * Single part upload for small files using S3 signed URL
 */
async function uploadObjectSinglePart(
  bucketKey: string,
  objectKey: string,
  fileBuffer: Buffer,
  contentType: string,
  accessToken: string
): Promise<UploadObjectResponse> {
  // Get signed URL for single part upload
  const signedUrlResponse = await getSignedS3UploadUrls(bucketKey, objectKey, accessToken, 1);
  
  if (!signedUrlResponse.urls || signedUrlResponse.urls.length === 0) {
    throw new Error('No signed URL returned from APS');
  }
  
  const signedUrl = signedUrlResponse.urls[0];
  
  // Upload directly to S3
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
    },
    body: fileBuffer,
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload to S3: ${uploadResponse.status} - ${errorText}`);
  }
  
  // Get ETag from response
  const eTag = uploadResponse.headers.get('ETag') || '';
  
  // Complete the upload
  const completeResponse = await completeS3Upload(
    bucketKey,
    objectKey,
    accessToken,
    signedUrlResponse.uploadKey,
    fileBuffer.length,
    [{ partNumber: 1, eTag: eTag.replace(/"/g, '') }]
  );
  
  return {
    bucketKey: completeResponse.bucketKey,
    objectId: completeResponse.objectId,
    objectKey: completeResponse.objectKey,
    sha1: completeResponse.sha1,
    size: completeResponse.size,
    location: completeResponse.location,
  };
}

/**
 * Multipart upload for large files using S3 signed URLs
 */
async function uploadObjectMultipart(
  bucketKey: string,
  objectKey: string,
  fileBuffer: Buffer,
  contentType: string,
  accessToken: string,
  numParts: number
): Promise<UploadObjectResponse> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const MAX_URLS_PER_REQUEST = 25; // APS returns max 25 URLs per request
  const fileSize = fileBuffer.length;
  
  const eTags: Array<{ partNumber: number; eTag: string }> = [];
  let uploadKey: string | undefined;
  
  // Upload in batches of up to 25 parts
  for (let batchStart = 0; batchStart < numParts; batchStart += MAX_URLS_PER_REQUEST) {
    const batchSize = Math.min(MAX_URLS_PER_REQUEST, numParts - batchStart);
    const firstPart = batchStart + 1; // Parts are 1-indexed
    
    // Get signed URLs for this batch
    const signedUrlResponse = await getSignedS3UploadUrls(
      bucketKey,
      objectKey,
      accessToken,
      batchSize,
      uploadKey,
      firstPart
    );
    
    // Store uploadKey for subsequent requests
    uploadKey = signedUrlResponse.uploadKey;
    
    if (!signedUrlResponse.urls || signedUrlResponse.urls.length === 0) {
      throw new Error(`No signed URLs returned for batch starting at part ${firstPart}`);
    }
    
    // Upload each part in this batch
    for (let i = 0; i < signedUrlResponse.urls.length; i++) {
      const partNumber = batchStart + i + 1;
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = fileBuffer.slice(start, end);
      const signedUrl = signedUrlResponse.urls[i];
      
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': chunk.length.toString(),
        },
        body: chunk,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to upload part ${partNumber}/${numParts}: ${uploadResponse.status} - ${errorText}`);
      }
      
      // Get ETag from response
      const eTag = uploadResponse.headers.get('ETag') || '';
      eTags.push({ partNumber, eTag: eTag.replace(/"/g, '') });
    }
  }
  
  // Complete the multipart upload
  if (!uploadKey) {
    throw new Error('Upload key not received from APS');
  }
  
  const completeResponse = await completeS3Upload(
    bucketKey,
    objectKey,
    accessToken,
    uploadKey,
    fileSize,
    eTags
  );
  
  return {
    bucketKey: completeResponse.bucketKey,
    objectId: completeResponse.objectId,
    objectKey: completeResponse.objectKey,
    sha1: completeResponse.sha1,
    size: completeResponse.size,
    location: completeResponse.location,
  };
}

/**
 * Convert object ID to base64-encoded URN for translation
 */
export function objectIdToUrn(objectId: string): string {
  return Buffer.from(objectId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Start model translation job to SVF2 format
 */
export async function translateModel(
  urn: string,
  rootFilename?: string
): Promise<TranslationJobResponse> {
  const { accessToken } = await getApsToken(['data:read', 'data:write', 'data:create']);

  const body: {
    input: { urn: string; compressedUrn?: boolean; rootFilename?: string };
    output: { formats: Array<{ type: string; views: string[] }> };
  } = {
    input: {
      urn,
      compressedUrn: false,
    },
    output: {
      formats: [
        {
          type: 'svf2',
          views: ['2d', '3d'],
        },
      ],
    },
  };

  // For ZIP files containing multiple files, specify the root file
  if (rootFilename) {
    body.input.rootFilename = rootFilename;
  }

  const response = await fetch(`${APS_BASE_URL}/modelderivative/v2/designdata/job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'x-ads-force': 'true', // Force re-translation if already exists
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to start translation: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Check translation job status
 */
export async function getTranslationStatus(urn: string): Promise<TranslationStatusResponse> {
  const { accessToken } = await getApsToken(['data:read']);

  const response = await fetch(`${APS_BASE_URL}/modelderivative/v2/designdata/${urn}/manifest`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get translation status: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Parse translation progress from status response
 */
export function parseTranslationProgress(status: TranslationStatusResponse): {
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'timeout';
  progress: number;
  message: string;
} {
  const progressStr = status.progress || '0%';
  const progress = parseInt(progressStr.replace('%', ''), 10) || 0;

  switch (status.status) {
    case 'pending':
      return { status: 'pending', progress: 0, message: 'Translation pending' };
    case 'inprogress':
      return { status: 'in_progress', progress, message: `Translation in progress: ${progress}%` };
    case 'success':
      return { status: 'success', progress: 100, message: 'Translation completed successfully' };
    case 'failed':
      return { status: 'failed', progress, message: 'Translation failed' };
    case 'timeout':
      return { status: 'timeout', progress, message: 'Translation timed out' };
    default:
      return { status: 'in_progress', progress, message: `Status: ${status.status}` };
  }
}

/**
 * Delete an object from a bucket
 */
export async function deleteObject(bucketKey: string, objectKey: string): Promise<void> {
  const { accessToken } = await getApsToken(['data:write']);

  const response = await fetch(
    `${APS_BASE_URL}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete object: ${response.status} - ${errorText}`);
  }
}

/**
 * Get a signed URL for downloading an object
 */
export async function getSignedUrl(
  bucketKey: string,
  objectKey: string,
  access: 'read' | 'write' | 'readwrite' = 'read',
  minutesExpiration: number = 60
): Promise<string> {
  const { accessToken } = await getApsToken(['data:read', 'data:write']);

  const response = await fetch(
    `${APS_BASE_URL}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3${access === 'read' ? 'download' : 'upload'}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get signed URL: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.url || data.urls?.[0];
}

/**
 * Complete workflow: Upload file and start translation
 */
export async function uploadAndTranslateModel(
  bucketKey: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<{
  objectKey: string;
  objectId: string;
  urn: string;
  translationUrn: string;
}> {
  // Upload the file
  const uploadResult = await uploadObject(bucketKey, fileName, fileBuffer, contentType);
  
  // Convert object ID to URN
  const urn = objectIdToUrn(uploadResult.objectId);
  
  // Start translation
  const translationResult = await translateModel(urn);
  
  return {
    objectKey: uploadResult.objectKey,
    objectId: uploadResult.objectId,
    urn,
    translationUrn: translationResult.urn,
  };
}
