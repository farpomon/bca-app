import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { storagePut } from "../storage";

/**
 * Offline Sync Router
 * 
 * Handles syncing of offline data (assessments, photos, deficiencies) from IndexedDB to server.
 * These endpoints are called by the sync engine when connection is restored.
 */

export const offlineSyncRouter = router({
  /**
   * Sync offline assessment to server
   * Creates or updates an assessment that was created while offline
   */
  syncAssessment: protectedProcedure
    .input(z.object({
      // Offline metadata
      offlineId: z.string(), // Temporary ID from IndexedDB
      createdAt: z.string(), // ISO timestamp when created offline
      
      // Assessment data
      projectId: z.number(),
      assetId: z.number().optional(),
      componentCode: z.string().optional(),
      condition: z.enum(["good", "fair", "poor", "not_assessed"]).optional(),
      status: z.enum(["initial", "active", "completed"]).optional(),
      conditionPercentage: z.string().optional(),
      componentName: z.string().optional(),
      componentLocation: z.string().optional(),
      observations: z.string().optional(),
      recommendations: z.string().optional(),
      remainingUsefulLife: z.number().optional(),
      expectedUsefulLife: z.number().optional(),
      reviewYear: z.number().optional(),
      lastTimeAction: z.number().optional(),
      estimatedRepairCost: z.number().optional(),
      replacementValue: z.number().optional(),
      actionYear: z.number().optional(),
      hasValidationOverrides: z.number().optional(),
      validationWarnings: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { offlineId, createdAt, ...assessmentData } = input;
      
      // Verify project ownership
      const isAdmin = ctx.user.role === 'admin';
      const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new Error("Project not found or access denied");
      }
      
      // Check for existing assessment with same component code (conflict detection)
      let existingAssessment = null;
      if (input.componentCode) {
        existingAssessment = await db.getAssessmentByComponent(input.projectId, input.componentCode);
      }
      
      // Server-wins conflict resolution
      // If assessment exists and was modified after offline creation, keep server version
      if (existingAssessment) {
        const serverModifiedAt = new Date(existingAssessment.assessedAt || existingAssessment.createdAt);
        const offlineCreatedAt = new Date(createdAt);
        
        if (serverModifiedAt > offlineCreatedAt) {
          // Server version is newer, return existing ID without updating
          return {
            assessmentId: existingAssessment.id,
            conflict: true,
            resolution: "server_wins",
            message: "Server version is newer, offline changes discarded"
          };
        }
      }
      
      // No conflict or offline version is newer, proceed with upsert
      const assessmentId = await db.upsertAssessment({
        ...assessmentData,
        assessedAt: createdAt, // Use offline creation time
      });
      
      // Log to component history
      const { logAssessmentChange } = await import("../componentHistoryService");
      
      if (input.componentCode) {
        await logAssessmentChange({
          projectId: input.projectId,
          componentCode: input.componentCode,
          assessmentId,
          userId: ctx.user.id,
          userName: ctx.user.name || undefined,
          isNew: !existingAssessment,
          changes: undefined, // Could implement change detection here
          richTextFields: {
            ...(input.observations && { observations: input.observations }),
            ...(input.recommendations && { recommendations: input.recommendations }),
          },
        });
      }
      
      return {
        assessmentId,
        conflict: false,
        offlineId, // Return for mapping in sync engine
      };
    }),

  /**
   * Sync offline photo to server
   * Uploads photo blob that was stored in IndexedDB while offline
   */
  syncPhoto: protectedProcedure
    .input(z.object({
      // Offline metadata
      offlineId: z.string(), // Temporary ID from IndexedDB
      createdAt: z.string(), // ISO timestamp when created offline
      
      // Photo data
      assessmentId: z.number().optional(), // May be null if assessment not synced yet
      projectId: z.number(),
      fileName: z.string(),
      caption: z.string().optional(),
      photoBlob: z.string(), // Base64 encoded blob
      mimeType: z.string(),
      
      // GPS data (if captured)
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      altitude: z.number().optional(),
      locationAccuracy: z.number().optional(),
      
      // OCR data (if processed offline)
      ocrText: z.string().optional(),
      ocrConfidence: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { offlineId, createdAt, photoBlob, ...photoData } = input;
      
      // Verify project ownership
      const isAdmin = ctx.user.role === 'admin';
      const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new Error("Project not found or access denied");
      }
      
      // Convert base64 to buffer
      const buffer = Buffer.from(photoBlob, 'base64');
      
      // Upload to S3
      const fileKey = `projects/${input.projectId}/photos/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      // Save photo metadata to database
      const photoId = await db.createPhoto({
        assessmentId: input.assessmentId || null,
        projectId: input.projectId,
        url,
        fileKey,
        caption: input.caption || null,
        mimeType: input.mimeType,
        createdAt: createdAt, // Use offline creation time
        latitude: input.latitude?.toString() || null,
        longitude: input.longitude?.toString() || null,
        altitude: input.altitude?.toString() || null,
        locationAccuracy: input.locationAccuracy?.toString() || null,
        ocrText: input.ocrText || null,
        ocrConfidence: input.ocrConfidence?.toString() || null,
      });
      
      return {
        photoId,
        url,
        offlineId, // Return for mapping in sync engine
      };
    }),

  /**
   * Batch sync multiple assessments at once
   * More efficient than individual syncs for large queues
   */
  batchSyncAssessments: protectedProcedure
    .input(z.object({
      assessments: z.array(z.object({
        offlineId: z.string(),
        createdAt: z.string(),
        projectId: z.number(),
        assetId: z.number().optional(),
        componentCode: z.string().optional(),
        condition: z.enum(["good", "fair", "poor", "not_assessed"]).optional(),
        status: z.enum(["initial", "active", "completed"]).optional(),
        conditionPercentage: z.string().optional(),
        componentName: z.string().optional(),
        componentLocation: z.string().optional(),
        observations: z.string().optional(),
        recommendations: z.string().optional(),
        remainingUsefulLife: z.number().optional(),
        expectedUsefulLife: z.number().optional(),
        reviewYear: z.number().optional(),
        lastTimeAction: z.number().optional(),
        estimatedRepairCost: z.number().optional(),
        replacementValue: z.number().optional(),
        actionYear: z.number().optional(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      
      for (const assessment of input.assessments) {
        try {
          const { offlineId, createdAt, ...assessmentData } = assessment;
          
          // Verify project ownership
          const isAdmin = ctx.user.role === 'admin';
          const project = await db.getProjectById(assessment.projectId, ctx.user.id, ctx.user.company, isAdmin);
          if (!project) {
            results.push({
              offlineId,
              success: false,
              error: "Project not found or access denied"
            });
            continue;
          }
          
          // Upsert assessment
          const assessmentId = await db.upsertAssessment({
            ...assessmentData,
            assessedAt: createdAt,
          });
          
          results.push({
            offlineId,
            success: true,
            assessmentId,
          });
        } catch (error) {
          results.push({
            offlineId: assessment.offlineId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      
      return {
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      };
    }),

  /**
   * Batch sync multiple photos at once
   */
  batchSyncPhotos: protectedProcedure
    .input(z.object({
      photos: z.array(z.object({
        offlineId: z.string(),
        createdAt: z.string(),
        assessmentId: z.number().optional(),
        projectId: z.number(),
        fileName: z.string(),
        caption: z.string().optional(),
        photoBlob: z.string(),
        mimeType: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        altitude: z.number().optional(),
        locationAccuracy: z.number().optional(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      
      for (const photo of input.photos) {
        try {
          const { offlineId, createdAt, photoBlob, ...photoData } = photo;
          
          // Verify project ownership
          const isAdmin = ctx.user.role === 'admin';
          const project = await db.getProjectById(photo.projectId, ctx.user.id, ctx.user.company, isAdmin);
          if (!project) {
            results.push({
              offlineId,
              success: false,
              error: "Project not found or access denied"
            });
            continue;
          }
          
          // Convert base64 to buffer
          const buffer = Buffer.from(photoBlob, 'base64');
          
          // Upload to S3
          const fileKey = `projects/${photo.projectId}/photos/${Date.now()}-${photo.fileName}`;
          const { url } = await storagePut(fileKey, buffer, photo.mimeType);
          
          // Save to database
          const photoId = await db.createPhoto({
            assessmentId: photo.assessmentId || null,
            projectId: photo.projectId,
            url,
            fileKey,
            caption: photo.caption || null,
            mimeType: photo.mimeType,
            createdAt: createdAt,
            latitude: photo.latitude?.toString() || null,
            longitude: photo.longitude?.toString() || null,
            altitude: photo.altitude?.toString() || null,
            locationAccuracy: photo.locationAccuracy?.toString() || null,
          });
          
          results.push({
            offlineId,
            success: true,
            photoId,
            url,
          });
        } catch (error) {
          results.push({
            offlineId: photo.offlineId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      
      return {
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      };
    }),
});
