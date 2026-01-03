import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";
import { projectDocuments, assessmentDocuments } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Documents router for managing project and assessment document attachments
 * Supports upload, list, and delete operations for reference documents
 */

export const documentsRouter = router({
  /**
   * Upload a document to a project
   * - Validates user has access to the project
   * - Uploads file to S3
   * - Creates database record
   */
  uploadProjectDocument: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded file data
        mimeType: z.string(),
        fileSize: z.number(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, fileName, fileData, mimeType, fileSize, description } = input;

      // Verify user has access to the project
      const isAdmin = ctx.user.role === "admin";
      const project = await db.getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access to it",
        });
      }

      // Upload file to S3
      const fileBuffer = Buffer.from(fileData, "base64");
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `project-documents/${projectId}/${timestamp}-${randomSuffix}-${fileName}`;

      const { url } = await storagePut(fileKey, fileBuffer, mimeType);

      // Create database record
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const result = await database.insert(projectDocuments).values({
        projectId,
        fileName,
        fileKey,
        url,
        mimeType,
        fileSize,
        uploadedBy: ctx.user.id,
        description: description || null,
      });

      return {
        success: true,
        documentId: (result as any).insertId ? Number((result as any).insertId) : 0,
        url,
      };
    }),

  /**
   * Upload a document to an assessment
   * - Validates user has access to the project
   * - Uploads file to S3
   * - Creates database record
   */
  uploadAssessmentDocument: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded file data
        mimeType: z.string(),
        fileSize: z.number(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { assessmentId, projectId, fileName, fileData, mimeType, fileSize, description } = input;

      // Verify user has access to the project
      const isAdmin = ctx.user.role === "admin";
      const project = await db.getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access to it",
        });
      }

      // Upload file to S3
      const fileBuffer = Buffer.from(fileData, "base64");
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `assessment-documents/${assessmentId}/${timestamp}-${randomSuffix}-${fileName}`;

      const { url } = await storagePut(fileKey, fileBuffer, mimeType);

      // Create database record
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const result = await database.insert(assessmentDocuments).values({
        assessmentId,
        projectId,
        fileName,
        fileKey,
        url,
        mimeType,
        fileSize,
        uploadedBy: ctx.user.id,
        description: description || null,
      });

      return {
        success: true,
        documentId: (result as any).insertId ? Number((result as any).insertId) : 0,
        url,
      };
    }),

  /**
   * List all documents for a project
   */
  listProjectDocuments: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;

      // Verify user has access to the project
      const isAdmin = ctx.user.role === "admin";
      const project = await db.getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access to it",
        });
      }

      const database = await db.getDb();
      if (!database) {
        return [];
      }

      const documents = await database
        .select()
        .from(projectDocuments)
        .where(eq(projectDocuments.projectId, projectId))
        .orderBy(projectDocuments.createdAt);

      return documents.map(doc => ({
        ...doc,
        createdAt: doc.createdAt || new Date().toISOString(),
      }));
    }),

  /**
   * List all documents for an assessment
   */
  listAssessmentDocuments: protectedProcedure
    .input(z.object({ assessmentId: z.number(), projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { assessmentId, projectId } = input;

      // Verify user has access to the project
      const isAdmin = ctx.user.role === "admin";
      const project = await db.getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access to it",
        });
      }

      const database = await db.getDb();
      if (!database) {
        return [];
      }

      const documents = await database
        .select()
        .from(assessmentDocuments)
        .where(
          and(
            eq(assessmentDocuments.assessmentId, assessmentId),
            eq(assessmentDocuments.projectId, projectId)
          )
        )
        .orderBy(assessmentDocuments.createdAt);

      return documents.map(doc => ({
        ...doc,
        createdAt: doc.createdAt || new Date().toISOString(),
      }));
    }),

  /**
   * Delete a project document
   * - Verifies user has access to the project
   * - Deletes from database (S3 file remains for backup purposes)
   */
  deleteProjectDocument: protectedProcedure
    .input(z.object({ documentId: z.number(), projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { documentId, projectId } = input;

      // Verify user has access to the project
      const isAdmin = ctx.user.role === "admin";
      const project = await db.getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access to it",
        });
      }

      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Delete from database
      await database
        .delete(projectDocuments)
        .where(
          and(
            eq(projectDocuments.id, documentId),
            eq(projectDocuments.projectId, projectId)
          )
        );

      return { success: true };
    }),

  /**
   * Delete an assessment document
   * - Verifies user has access to the project
   * - Deletes from database (S3 file remains for backup purposes)
   */
  deleteAssessmentDocument: protectedProcedure
    .input(z.object({ documentId: z.number(), projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { documentId, projectId } = input;

      // Verify user has access to the project
      const isAdmin = ctx.user.role === "admin";
      const project = await db.getProjectById(projectId, ctx.user.id, ctx.user.company, isAdmin);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access to it",
        });
      }

      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Delete from database
      await database
        .delete(assessmentDocuments)
        .where(
          and(
            eq(assessmentDocuments.id, documentId),
            eq(assessmentDocuments.projectId, projectId)
          )
        );

      return { success: true };
    }),
});
