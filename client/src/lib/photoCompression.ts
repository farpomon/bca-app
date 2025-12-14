/**
 * Photo Compression Utility
 * 
 * Compresses photos for efficient offline storage while maintaining quality.
 * Reduces file size by 50-70% for faster sync when connection returns.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  mimeType?: string;
}

export interface CompressionResult {
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Percentage saved
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  mimeType: "image/jpeg",
};

/**
 * Compress an image file or blob
 */
export async function compressPhoto(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Load image
  const img = await loadImage(file);
  
  // Calculate new dimensions
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight
  );
  
  // Create canvas and compress
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  
  // Draw image with high quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert to blob
  const compressedBlob = await canvasToBlob(canvas, opts.mimeType, opts.quality);
  
  const originalSize = file.size;
  const compressedSize = compressedBlob.size;
  const compressionRatio = Math.round(((originalSize - compressedSize) / originalSize) * 100);
  
  return {
    compressedBlob,
    originalSize,
    compressedSize,
    compressionRatio,
    width,
    height,
  };
}

/**
 * Load image from file or blob
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;
  
  // If image is smaller than max dimensions, keep original size
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  
  // Calculate aspect ratio
  const aspectRatio = width / height;
  
  // Resize based on which dimension exceeds the limit more
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Convert canvas to blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Batch compress multiple photos
 */
export async function compressPhotos(
  files: (File | Blob)[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await compressPhoto(files[i], options);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }
  
  return results;
}

/**
 * Check if file needs compression
 */
export function shouldCompress(file: File | Blob, maxSize: number = 2 * 1024 * 1024): boolean {
  return file.size > maxSize;
}

/**
 * Get optimal compression settings based on file size
 */
export function getOptimalCompressionOptions(fileSize: number): CompressionOptions {
  // Very large files (>5MB) - aggressive compression
  if (fileSize > 5 * 1024 * 1024) {
    return {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.7,
      mimeType: "image/jpeg",
    };
  }
  
  // Large files (2-5MB) - moderate compression
  if (fileSize > 2 * 1024 * 1024) {
    return {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.75,
      mimeType: "image/jpeg",
    };
  }
  
  // Medium files (1-2MB) - light compression
  if (fileSize > 1 * 1024 * 1024) {
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      mimeType: "image/jpeg",
    };
  }
  
  // Small files - minimal compression
  return {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    mimeType: "image/jpeg",
  };
}

/**
 * Format compression ratio as percentage
 */
export function formatCompressionRatio(ratio: number): string {
  return `${ratio}% smaller`;
}

/**
 * Estimate compression time (rough estimate)
 */
export function estimateCompressionTime(fileSize: number): number {
  // Rough estimate: ~100ms per MB
  const sizeInMB = fileSize / (1024 * 1024);
  return Math.ceil(sizeInMB * 100);
}
