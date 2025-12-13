import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";
import archiver from "archiver";
import fetch from "node-fetch";

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

  /**
   * Download all documents for an assessment as a ZIP file
   */
  downloadAllAsZip: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const documents = await db.getAssessmentDocuments(input.assessmentId);
        
        if (!documents || documents.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No documents found for this assessment",
          });
        }

        // Create a buffer to store the ZIP
        const chunks: Buffer[] = [];
        const archive = archiver("zip", { zlib: { level: 9 } });

        // Collect chunks
        archive.on("data", (chunk: Buffer) => chunks.push(chunk));

        // Handle errors
        archive.on("error", (err: Error) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `ZIP creation failed: ${err.message}`,
          });
        });

        // Download and add each document to the archive
        for (const doc of documents) {
          try {
            const response = await fetch(doc.url);
            if (!response.ok) {
              console.warn(`Failed to fetch document: ${doc.fileName}`);
              continue;
            }
            const buffer = await response.buffer();
            archive.append(buffer, { name: doc.fileName });
          } catch (error) {
            console.warn(`Error adding document to ZIP: ${doc.fileName}`, error);
          }
        }

        // Finalize the archive
        await archive.finalize();

        // Wait for all chunks to be collected
        await new Promise((resolve) => archive.on("end", resolve));

        // Combine chunks into a single buffer
        const zipBuffer = Buffer.concat(chunks);

        // Upload ZIP to S3
        const zipKey = `temp/assessment-${input.assessmentId}-docs-${Date.now()}.zip`;
        const { url } = await storagePut(zipKey, zipBuffer, "application/zip");

        return { url, fileName: `assessment-${input.assessmentId}-documents.zip` };
      } catch (error) {
        console.error("[Assessment Documents] ZIP download failed:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create ZIP file",
        });
      }
    }),
});
