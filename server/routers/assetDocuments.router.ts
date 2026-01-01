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
        deficiencyId: z.number().optional(),
        fileName: z.string(),
        fileContent: z.string(), // Base64 encoded file content
        mimeType: z.string(),
        category: z.string().optional(),
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
          deficiencyId: input.deficiencyId || null,
          fileName: input.fileName,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize,
          uploadedBy: ctx.user.id,
          category: input.category || null,
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
   * List all documents for an asset (excludes soft-deleted)
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

      const { isNull } = await import("drizzle-orm");
      
      const documents = await database
        .select()
        .from(assetDocuments)
        .where(
          and(
            eq(assetDocuments.assetId, input.assetId),
            isNull(assetDocuments.deletedAt)
          )
        );

      return documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        url: doc.url,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        category: doc.category,
        description: doc.description,
        createdAt: doc.createdAt,
        uploadedBy: doc.uploadedBy,
        deficiencyId: doc.deficiencyId,
      }));
    }),

  /**
   * Delete a document (soft delete)
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

      // Check if user is the uploader
      const isUploader = document.uploadedBy === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";
      const isSuperAdmin = ctx.user.isSuperAdmin === 1;
      
      // Get the asset to check project access
      const { projects } = await import("../../drizzle/schema");
      const [asset] = await database
        .select()
        .from(assets)
        .where(eq(assets.id, document.assetId))
        .limit(1);
        
      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      }
      
      const [project] = await database
        .select()
        .from(projects)
        .where(eq(projects.id, asset.projectId))
        .limit(1);
        
      // Allow delete if:
      // 1. User is the uploader
      // 2. User is super admin
      // 3. User is admin
      // 4. User is project owner
      // 5. User is in the same company
      const isProjectOwner = project && project.userId === ctx.user.id;
      const isSameCompany = project && ctx.user.company && project.company === ctx.user.company;
      const isSameCompanyId = project && ctx.user.companyId && project.companyId === ctx.user.companyId;
      
      if (!isUploader && !isSuperAdmin && !isAdmin && !isProjectOwner && !isSameCompany && !isSameCompanyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to delete this document" });
      }

      // Soft delete - set deletedAt timestamp
      await database
        .update(assetDocuments)
        .set({ deletedAt: new Date().toISOString(), deletedBy: ctx.user.id })
        .where(eq(assetDocuments.id, input.documentId));

      return { success: true };
    }),

  /**
   * Bulk delete documents (soft delete)
   */
  bulkDelete: protectedProcedure
    .input(
      z.object({
        documentIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const isAdmin = ctx.user.role === "admin";
      const isSuperAdmin = ctx.user.isSuperAdmin === 1;
      const { projects } = await import("../../drizzle/schema");

      // Verify access for each document
      for (const docId of input.documentIds) {
        const [document] = await database
          .select()
          .from(assetDocuments)
          .where(eq(assetDocuments.id, docId))
          .limit(1);

        if (!document) continue;

        const isUploader = document.uploadedBy === ctx.user.id;
        
        const [asset] = await database
          .select()
          .from(assets)
          .where(eq(assets.id, document.assetId))
          .limit(1);
          
        if (!asset) continue;
        
        const [project] = await database
          .select()
          .from(projects)
          .where(eq(projects.id, asset.projectId))
          .limit(1);
          
        const isProjectOwner = project && project.userId === ctx.user.id;
        const isSameCompany = project && ctx.user.company && project.company === ctx.user.company;
        const isSameCompanyId = project && ctx.user.companyId && project.companyId === ctx.user.companyId;
        
        if (!isUploader && !isSuperAdmin && !isAdmin && !isProjectOwner && !isSameCompany && !isSameCompanyId) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Not authorized to delete document ${docId}` });
        }
      }

      // Soft delete all documents
      const deletedAt = new Date().toISOString();
      for (const docId of input.documentIds) {
        await database
          .update(assetDocuments)
          .set({ deletedAt, deletedBy: ctx.user.id })
          .where(eq(assetDocuments.id, docId));
      }

      return { success: true, deletedCount: input.documentIds.length };
    }),

  /**
   * Get recently deleted documents for an asset
   */
  recentlyDeleted: protectedProcedure
    .input(
      z.object({
        assetId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { isNotNull, desc } = await import("drizzle-orm");
      
      const documents = await database
        .select()
        .from(assetDocuments)
        .where(
          and(
            eq(assetDocuments.assetId, input.assetId),
            isNotNull(assetDocuments.deletedAt)
          )
        )
        .orderBy(desc(assetDocuments.deletedAt));

      return documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        url: doc.url,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        category: doc.category,
        description: doc.description,
        createdAt: doc.createdAt,
        deletedAt: doc.deletedAt,
        uploadedBy: doc.uploadedBy,
        deficiencyId: doc.deficiencyId,
      }));
    }),

  /**
   * Restore a soft-deleted document
   */
  restore: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { isNotNull } = await import("drizzle-orm");
      
      // Get deleted document
      const [document] = await database
        .select()
        .from(assetDocuments)
        .where(
          and(
            eq(assetDocuments.id, input.documentId),
            isNotNull(assetDocuments.deletedAt)
          )
        )
        .limit(1);

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found in recently deleted" });
      }

      // Verify access
      const isUploader = document.uploadedBy === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";
      const isSuperAdmin = ctx.user.isSuperAdmin === 1;
      
      if (!isUploader && !isSuperAdmin && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to restore this document" });
      }

      // Restore document
      await database
        .update(assetDocuments)
        .set({ deletedAt: null, deletedBy: null })
        .where(eq(assetDocuments.id, input.documentId));

      return { success: true };
    }),

  /**
   * Permanently delete a document
   */
  permanentDelete: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { isNotNull } = await import("drizzle-orm");
      
      // Get deleted document
      const [document] = await database
        .select()
        .from(assetDocuments)
        .where(
          and(
            eq(assetDocuments.id, input.documentId),
            isNotNull(assetDocuments.deletedAt)
          )
        )
        .limit(1);

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      // Verify access
      const isAdmin = ctx.user.role === "admin";
      const isSuperAdmin = ctx.user.isSuperAdmin === 1;
      
      if (!isSuperAdmin && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to permanently delete this document" });
      }

      // Permanently delete
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
