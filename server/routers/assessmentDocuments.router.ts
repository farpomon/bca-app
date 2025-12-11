import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";

export const assessmentDocumentsRouter = router({
  /**
   * Upload a document and attach it to an assessment
   */
  upload: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded file data
        mimeType: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileSize = fileBuffer.length;

        // Upload to S3
        const fileKey = `${ctx.user.id}/assessment-docs/${input.assessmentId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Save to database
        await db.createAssessmentDocument({
          assessmentId: input.assessmentId,
          projectId: input.projectId,
          fileName: input.fileName,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize,
          uploadedBy: ctx.user.id,
          description: input.description || null,
        });

        return { success: true, url };
      } catch (error) {
        console.error("[Assessment Documents] Upload failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload document",
        });
      }
    }),

  /**
   * Get all documents for an assessment
   */
  list: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAssessmentDocuments(input.assessmentId);
    }),

  /**
   * Get all documents for a project
   */
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await db.getProjectDocuments(input.projectId);
    }),

  /**
   * Delete a document
   */
  delete: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.deleteAssessmentDocument(input.documentId, ctx.user.id);
      } catch (error: any) {
        throw new TRPCError({
          code: error.message === "Unauthorized" ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete document",
        });
      }
    }),
});
