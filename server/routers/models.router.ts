import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import * as modelsDb from "../db/models.db";

export const modelsRouter = router({
  // Upload a new 3D model
  upload: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        fileData: z.string(), // Base64 encoded file data
        format: z.enum(["glb", "gltf", "fbx", "obj"]),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Decode base64 file data
      const buffer = Buffer.from(input.fileData, "base64");
      const fileSize = buffer.length;

      // Validate file size (max 500MB)
      if (fileSize > 500 * 1024 * 1024) {
        throw new Error("File size exceeds 500MB limit");
      }

      // Upload to S3
      const fileKey = `models/${input.projectId}/${Date.now()}-${input.name}.${input.format}`;
      const { url } = await storagePut(fileKey, buffer, `model/${input.format}`);

      // Create database record
      await modelsDb.createFacilityModel({
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
      });

      return { success: true, url };
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
