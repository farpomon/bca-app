import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import * as modelsDb from "../db/models.db";
import { getApsViewerToken } from "../_core/aps";
import {
  createBucket,
  uploadObject,
  translateModel,
  getTranslationStatus,
  parseTranslationProgress,
  objectIdToUrn,
  generateBucketKey,
} from "../_core/apsService";

// Default bucket key for the application
const APP_BUCKET_KEY = process.env.APS_BUCKET_KEY || generateBucketKey('bca-models');

export const modelsRouter = router({
  // Upload a new 3D model with optional APS integration
  upload: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        fileData: z.string(), // Base64 encoded file data
        format: z.enum(["glb", "gltf", "fbx", "obj", "skp", "rvt", "rfa", "dwg", "dxf", "ifc", "nwd", "nwc"]),
        metadata: z.any().optional(),
        uploadToAps: z.boolean().optional().default(true), // Whether to upload to APS for Forge Viewer
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[Model Upload] Starting upload for project ${input.projectId}, format: ${input.format}`);
        
        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;
        console.log(`[Model Upload] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        // Validate file size (max 500MB)
        if (fileSize > 500 * 1024 * 1024) {
          throw new Error("File size exceeds 500MB limit");
        }

        // Upload to S3 for backup/storage
        const timestamp = Date.now();
        const fileKey = `models/${input.projectId}/${timestamp}-${input.name}.${input.format}`;
        console.log(`[Model Upload] Uploading to S3 with key: ${fileKey}`);
        const { url } = await storagePut(fileKey, buffer, `model/${input.format}`);
        console.log(`[Model Upload] S3 upload successful, URL: ${url}`);

        // Create initial database record
        const modelData: any = {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          fileUrl: url,
          fileKey,
          fileSize,
          format: input.format,
          version: 1,
          isActive: 1,
          metadata: input.metadata,
          uploadedBy: ctx.user.id,
        };

        // If APS upload is requested, upload to APS and start translation
        if (input.uploadToAps) {
          try {
            console.log(`[Model Upload] Starting APS upload...`);
            
            // Ensure bucket exists
            await createBucket(APP_BUCKET_KEY);
            
            // Generate unique object key
            const apsObjectKey = `${input.projectId}/${timestamp}-${input.name}.${input.format}`;
            
            // Upload to APS
            const uploadResult = await uploadObject(
              APP_BUCKET_KEY,
              apsObjectKey,
              buffer,
              `application/octet-stream`
            );
            console.log(`[Model Upload] APS upload successful, objectId: ${uploadResult.objectId}`);
            
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
        console.log(`[Model Upload] Database record created successfully`);

        return { 
          success: true, 
          url,
          apsUrn: modelData.apsUrn,
          apsStatus: modelData.apsTranslationStatus,
        };
      } catch (error) {
        console.error(`[Model Upload] Error:`, error);
        throw new Error(`Failed to upload model: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get APS viewer token for client-side Forge Viewer
  getViewerToken: protectedProcedure
    .query(async () => {
      try {
        const token = await getApsViewerToken();
        return { accessToken: token };
      } catch (error) {
        console.error('[APS] Failed to get viewer token:', error);
        throw new Error('Failed to get viewer token');
      }
    }),

  // Check and update translation status for a model
  checkTranslationStatus: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const model = await modelsDb.getFacilityModel(input.id);
      if (!model) {
        throw new Error("Model not found");
      }

      if (!model.apsUrn) {
        return { 
          status: 'not_uploaded', 
          message: 'Model not uploaded to APS' 
        };
      }

      try {
        const statusResponse = await getTranslationStatus(model.apsUrn);
        const parsed = parseTranslationProgress(statusResponse);

        // Update database with latest status
        await modelsDb.updateFacilityModelApsData(input.id, {
          apsTranslationStatus: parsed.status,
          apsTranslationProgress: parsed.progress,
          apsTranslationMessage: parsed.message,
          ...(parsed.status === 'success' && {
            apsTranslationCompletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          }),
        });

        return {
          status: parsed.status,
          progress: parsed.progress,
          message: parsed.message,
          urn: model.apsUrn,
        };
      } catch (error) {
        console.error('[APS] Failed to check translation status:', error);
        throw new Error('Failed to check translation status');
      }
    }),

  // Retry failed translation
  retryTranslation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const model = await modelsDb.getFacilityModel(input.id);
      if (!model) {
        throw new Error("Model not found");
      }

      if (!model.apsUrn) {
        throw new Error("Model not uploaded to APS");
      }

      try {
        // Restart translation
        const translationResult = await translateModel(model.apsUrn);
        
        // Update database
        await modelsDb.updateFacilityModelApsData(input.id, {
          apsTranslationStatus: 'in_progress',
          apsTranslationProgress: 0,
          apsTranslationMessage: 'Translation restarted',
          apsTranslationStartedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          apsTranslationCompletedAt: null,
        });

        return { 
          success: true, 
          message: 'Translation restarted',
          result: translationResult.result,
        };
      } catch (error) {
        console.error('[APS] Failed to retry translation:', error);
        throw new Error('Failed to retry translation');
      }
    }),

  // Get a specific model
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const model = await modelsDb.getFacilityModel(input.id);
      if (!model) {
        throw new Error("Model not found");
      }
      return model;
    }),

  // List all models for a project
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await modelsDb.getProjectModels(input.projectId);
    }),

  // Get active model for a project
  getActive: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await modelsDb.getActiveProjectModel(input.projectId);
    }),

  // Update model metadata
  updateMetadata: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isActive, ...updates } = input;
      // Convert boolean isActive to number (tinyint)
      const dbUpdates: any = {
        ...updates,
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
      };
      await modelsDb.updateFacilityModel(id, dbUpdates);
      return { success: true };
    }),

  // Delete a model
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await modelsDb.deleteFacilityModel(input.id);
      return { success: true };
    }),

  // Annotations
  annotations: router({
    create: protectedProcedure
      .input(
        z.object({
          modelId: z.number(),
          projectId: z.number(),
          componentName: z.string().optional(),
          assessmentId: z.number().optional(),
          deficiencyId: z.number().optional(),
          maintenanceEntryId: z.number().optional(),
          annotationType: z.enum(["deficiency", "assessment", "maintenance", "note", "issue"]),
          title: z.string(),
          description: z.string().optional(),
          positionX: z.number(),
          positionY: z.number(),
          positionZ: z.number(),
          cameraPosition: z.any().optional(),
          cameraTarget: z.any().optional(),
          priority: z.enum(["immediate", "high", "medium", "low"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await modelsDb.createModelAnnotation({
          ...input,
          positionX: input.positionX.toString(),
          positionY: input.positionY.toString(),
          positionZ: input.positionZ.toString(),
          status: "open",
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        return await modelsDb.getModelAnnotations(input.modelId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const annotation = await modelsDb.getModelAnnotation(input.id);
        if (!annotation) {
          throw new Error("Annotation not found");
        }
        return annotation;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
          priority: z.enum(["immediate", "high", "medium", "low"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await modelsDb.updateModelAnnotation(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await modelsDb.deleteModelAnnotation(input.id);
        return { success: true };
      }),
  }),

  // Viewpoints
  viewpoints: router({
    save: protectedProcedure
      .input(
        z.object({
          modelId: z.number(),
          projectId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          cameraPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }),
          cameraTarget: z.object({ x: z.number(), y: z.number(), z: z.number() }),
          cameraZoom: z.number().optional(),
          visibleLayers: z.array(z.string()).optional(),
          isShared: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await modelsDb.createModelViewpoint({
          ...input,
          cameraZoom: input.cameraZoom?.toString(),
          createdBy: ctx.user.id,
          isShared: input.isShared ? 1 : 0,
        });
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        return await modelsDb.getModelViewpoints(input.modelId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const viewpoint = await modelsDb.getModelViewpoint(input.id);
        if (!viewpoint) {
          throw new Error("Viewpoint not found");
        }
        return viewpoint;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await modelsDb.deleteModelViewpoint(input.id);
        return { success: true };
      }),
  }),
});
