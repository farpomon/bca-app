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
      
      // Intelligent merge conflict resolution
      // If assessment exists, merge offline data with server data instead of discarding
      if (existingAssessment) {
        const serverModifiedAt = new Date(existingAssessment.assessedAt || existingAssessment.createdAt);
        const offlineCreatedAt = new Date(createdAt);
        
        if (serverModifiedAt > offlineCreatedAt) {
          // Server version is newer, but merge valuable offline data
          // Preserve offline observations/recommendations if server doesn't have them
          const mergedData: any = {};
          
          // Merge observations: use offline if server is empty
          if (input.observations && (!existingAssessment.observations || existingAssessment.observations.trim() === '')) {
            mergedData.observations = input.observations;
          }
          
          // Merge recommendations: use offline if server is empty
          if (input.recommendations && (!existingAssessment.recommendations || existingAssessment.recommendations.trim() === '')) {
            mergedData.recommendations = input.recommendations;
          }
          
          // Merge other fields: use offline if server is null/undefined/0
          if (input.estimatedRepairCost && !existingAssessment.estimatedRepairCost) {
            mergedData.estimatedRepairCost = input.estimatedRepairCost;
          }
          if (input.replacementValue && !existingAssessment.replacementValue) {
            mergedData.replacementValue = input.replacementValue;
          }
          
          // If we have data to merge, update the existing assessment
          if (Object.keys(mergedData).length > 0) {
            await db.upsertAssessment({
              id: existingAssessment.id,
              ...mergedData,
            });
            
            // Log the merge to component history
            const { logAssessmentChange } = await import("../componentHistoryService");
            if (input.componentCode) {
              await logAssessmentChange({
                projectId: input.projectId,
                componentCode: input.componentCode,
                assessmentId: existingAssessment.id,
                userId: ctx.user.id,
                userName: ctx.user.name || undefined,
                isNew: false,
                changes: undefined,
                richTextFields: {
                  ...(mergedData.observations && { observations: mergedData.observations }),
                  ...(mergedData.recommendations && { recommendations: mergedData.recommendations }),
                },
              });
            }
            
            return {
              assessmentId: existingAssessment.id,
              conflict: true,
              resolution: "merged",
              message: "Server version kept, offline data merged"
            };
          }
          
          // No data to merge, keep server version as-is
          return {
            assessmentId: existingAssessment.id,
            conflict: true,
            resolution: "server_wins",
            message: "Server version is newer, no offline data to merge"
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
      assetId: z.number().optional(), // Asset ID for asset-level photos
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
        assetId: input.assetId || null,
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
   * Sync offline deficiency to server
   * Creates a deficiency that was created while offline
   */
  syncDeficiency: protectedProcedure
    .input(z.object({
      // Offline metadata
      offlineId: z.string(), // Temporary ID from IndexedDB
      createdAt: z.string(), // ISO timestamp when created offline
      
      // Deficiency data
      projectId: z.number(),
      assessmentId: z.number().optional(),
      componentCode: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      priority: z.enum(["immediate", "short_term", "medium_term", "long_term"]).optional(),
      estimatedCost: z.number().optional(),
      status: z.enum(["open", "in_progress", "resolved", "deferred"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { offlineId, createdAt, ...deficiencyData } = input;
      
      // Verify project ownership
      const isAdmin = ctx.user.role === 'admin';
      const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.company, isAdmin);
      if (!project) {
        throw new Error("Project not found or access denied");
      }
      
      // Create deficiency with required fields
      const deficiencyId = await db.createDeficiency({
        projectId: input.projectId,
        componentCode: input.componentCode || "UNKNOWN",
        title: input.title || "Offline Deficiency",
        description: input.description || null,
        severity: input.severity || "medium",
        priority: input.priority || "medium_term",
        estimatedCost: input.estimatedCost || null,
        status: input.status || "open",
        assessmentId: input.assessmentId || null,
        createdAt: createdAt,
      });
      
      return {
        deficiencyId,
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
