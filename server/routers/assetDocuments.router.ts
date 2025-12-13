/**
 * Asset Documents Router
 * Handles document uploads and management for assets
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { assetDocuments, assets } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";

export const assetDocumentsRouter = router({
  /**
   * Upload document for an asset
   */
  upload: protectedProcedure
    .input(
      z.object({
        assetId: z.number(),
        projectId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // Base64 encoded file content
        mimeType: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify asset exists and user has access
      const [asset] = await database
        .select()
        .from(assets)
        .where(and(eq(assets.id, input.assetId), eq(assets.projectId, input.projectId)))
        .limit(1);

      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      }

      // Decode base64 content
      const fileBuffer = Buffer.from(input.fileContent, "base64");
      const fileSize = fileBuffer.length;

      // Validate file size (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (fileSize > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File size exceeds 10MB limit",
        });
      }

      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileKey = `asset-documents/${input.projectId}/${input.assetId}/${timestamp}-${randomSuffix}-${sanitizedFileName}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

      // Save metadata to database
      await database
        .insert(assetDocuments)
        .values({
          assetId: input.assetId,
          projectId: input.projectId,
          fileName: input.fileName,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize,
          uploadedBy: ctx.user.id,
          description: input.description || null,
        });

      // Get the inserted document
      const [insertedDoc] = await database
        .select()
        .from(assetDocuments)
        .where(eq(assetDocuments.fileKey, fileKey))
        .limit(1);

      return {
        id: insertedDoc?.id || 0,
        url,
        fileName: input.fileName,
        fileSize,
      };
    }),

  /**
   * List all documents for an asset
   */
  list: protectedProcedure
    .input(
      z.object({
        assetId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const documents = await database
        .select()
        .from(assetDocuments)
        .where(eq(assetDocuments.assetId, input.assetId));

      return documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        url: doc.url,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        description: doc.description,
        createdAt: doc.createdAt,
        uploadedBy: doc.uploadedBy,
      }));
    }),

  /**
   * Delete a document
   */
  delete: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get document to verify ownership
      const [document] = await database
        .select()
        .from(assetDocuments)
        .where(eq(assetDocuments.id, input.documentId))
        .limit(1);

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      // Only allow deletion by uploader or admin
      if (document.uploadedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to delete this document" });
      }

      // Delete from database (S3 cleanup can be done separately if needed)
      await database.delete(assetDocuments).where(eq(assetDocuments.id, input.documentId));

      return { success: true };
    }),

  /**
   * Get document count for an asset
   */
  getCount: protectedProcedure
    .input(
      z.object({
        assetId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const documents = await database
        .select()
        .from(assetDocuments)
        .where(eq(assetDocuments.assetId, input.assetId));

      return { count: documents.length };
    }),
});
