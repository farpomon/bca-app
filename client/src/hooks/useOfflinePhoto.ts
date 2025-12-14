/**
 * useOfflinePhoto Hook
 * 
 * React hook for managing offline photo uploads with automatic compression.
 * Queues photos locally when offline and syncs when connection returns.
 */

import { useState, useCallback, useEffect } from "react";
import { useOfflineSync } from "./useOfflineSync";
import {
  saveOfflinePhoto,
  getPhotosByAssessment,
  type OfflinePhoto,
} from "@/lib/offlineStorage";
import {
  compressPhoto,
  shouldCompress,
  getOptimalCompressionOptions,
  type CompressionResult,
} from "@/lib/photoCompression";
import { toast } from "sonner";

export interface PhotoUploadData {
  assessmentId: string; // Can be offline ID or real ID
  projectId: number;
  file: File;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
  };
}

export interface PhotoUploadResult {
  photoId: string;
  compressionResult?: CompressionResult;
  savedOffline: boolean;
}

export interface UseOfflinePhotoOptions {
  onUploadSuccess?: (result: PhotoUploadResult) => void;
  onUploadError?: (error: Error) => void;
  autoCompress?: boolean;
}

export interface UseOfflinePhotoReturn {
  uploadPhoto: (data: PhotoUploadData) => Promise<PhotoUploadResult>;
  uploadPhotos: (photos: PhotoUploadData[]) => Promise<PhotoUploadResult[]>;
  isUploading: boolean;
  uploadProgress: number;
  error: Error | null;
  getAssessmentPhotos: (assessmentId: string) => Promise<OfflinePhoto[]>;
  isOnline: boolean;
}

/**
 * Hook for managing offline-capable photo uploads
 */
export function useOfflinePhoto(options: UseOfflinePhotoOptions = {}): UseOfflinePhotoReturn {
  const { onUploadSuccess, onUploadError, autoCompress = true } = options;
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const { isOnline } = useOfflineSync();

  /**
   * Upload a single photo
   */
  const uploadPhoto = useCallback(
    async (data: PhotoUploadData): Promise<PhotoUploadResult> => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        let compressedBlob = data.file as Blob;
        let originalBlob = data.file as Blob;
        let compressionResult: CompressionResult | undefined;

        // Compress photo if needed
        if (autoCompress && shouldCompress(data.file)) {
          setUploadProgress(10);
          
          const options = getOptimalCompressionOptions(data.file.size);
          compressionResult = await compressPhoto(data.file, options);
          compressedBlob = compressionResult.compressedBlob;
          
          toast.info(
            `Photo compressed: ${compressionResult.compressionRatio}% smaller`,
            { duration: 2000 }
          );
          
          setUploadProgress(30);
        }

        // Save offline (always queue photos for reliability)
        const photoId = await saveOfflinePhoto({
          assessmentId: data.assessmentId,
          projectId: data.projectId,
          blob: compressedBlob,
          originalBlob: originalBlob,
          fileName: data.file.name,
          fileSize: compressedBlob.size,
          mimeType: data.file.type,
          caption: data.caption || null,
          latitude: data.location?.latitude || null,
          longitude: data.location?.longitude || null,
          altitude: data.location?.altitude || null,
          locationAccuracy: data.location?.accuracy || null,
        });

        setUploadProgress(100);

        const result: PhotoUploadResult = {
          photoId,
          compressionResult,
          savedOffline: !isOnline,
        };

        if (!isOnline) {
          toast.success(
            "Photo saved offline. Will upload when connection returns.",
            { duration: 4000 }
          );
        } else {
          toast.success("Photo queued for upload");
        }

        if (onUploadSuccess) {
          onUploadSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to upload photo");
        setError(error);
        
        toast.error("Failed to save photo. Please try again.");
        
        if (onUploadError) {
          onUploadError(error);
        }
        
        throw error;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [isOnline, autoCompress, onUploadSuccess, onUploadError]
  );

  /**
   * Upload multiple photos
   */
  const uploadPhotos = useCallback(
    async (photos: PhotoUploadData[]): Promise<PhotoUploadResult[]> => {
      setIsUploading(true);
      setError(null);

      const results: PhotoUploadResult[] = [];
      
      try {
        for (let i = 0; i < photos.length; i++) {
          const progress = Math.round(((i + 1) / photos.length) * 100);
          setUploadProgress(progress);
          
          const result = await uploadPhoto(photos[i]);
          results.push(result);
        }

        toast.success(`${photos.length} photos saved successfully`);
        
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to upload photos");
        setError(error);
        throw error;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [uploadPhoto]
  );

  /**
   * Get photos for an assessment (including offline photos)
   */
  const getAssessmentPhotos = useCallback(
    async (assessmentId: string): Promise<OfflinePhoto[]> => {
      try {
        return await getPhotosByAssessment(assessmentId);
      } catch (err) {
        console.error("Failed to load assessment photos:", err);
        return [];
      }
    },
    []
  );

  return {
    uploadPhoto,
    uploadPhotos,
    isUploading,
    uploadProgress,
    error,
    getAssessmentPhotos,
    isOnline,
  };
}

/**
 * Hook for photo preview from IndexedDB
 */
export function useOfflinePhotoPreview(photoId: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!photoId) {
      setPreviewUrl(null);
      return;
    }

    setIsLoading(true);

    try {
      const { getItem, STORES } = await import("@/lib/offlineStorage");
      const photo = await getItem<OfflinePhoto>(STORES.PHOTOS, photoId);
      
      if (photo) {
        const url = URL.createObjectURL(photo.blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error("Failed to load photo preview:", err);
    } finally {
      setIsLoading(false);
    }
  }, [photoId]);

  // Load preview when photoId changes
  useEffect(() => {
    loadPreview();
    
    // Cleanup: revoke object URL
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [photoId, loadPreview]);

  return {
    previewUrl,
    isLoading,
    reload: loadPreview,
  };
}

/**
 * Get current location with error handling
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: "Geolocation not supported",
      } as GeolocationPositionError);
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return {
    location,
    error,
    isLoading,
    getCurrentLocation,
  };
}
