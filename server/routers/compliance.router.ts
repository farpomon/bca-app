import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { 
  userConsents, 
  dataResidencySettings, 
  dataAccessRequests,
  auditLog,
  users,
  projects,
  assessments
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

/**
 * Compliance router - Handles FOIP, data residency, consent management, and audit logging
 */
export const complianceRouter = router({
  /**
   * Get all data residency settings (public - for transparency)
   */
  getDataResidency: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    
    const settings = await db.select().from(dataResidencySettings).orderBy(dataResidencySettings.settingKey);
    
    return settings.reduce((acc, setting) => {
      acc[setting.settingKey] = {
        value: setting.settingValue,
        description: setting.description,
        updatedAt: setting.updatedAt,
      };
      return acc;
    }, {} as Record<string, any>);
  }),

  /**
   * Update data residency settings (admin only)
   */
  updateDataResidency: protectedProcedure
    .input(z.object({
      settingKey: z.string(),
      settingValue: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(dataResidencySettings).values({
        settingKey: input.settingKey,
        settingValue: input.settingValue,
        description: input.description || null,
        updatedBy: ctx.user.id,
      }).onDuplicateKeyUpdate({
        set: {
          settingValue: input.settingValue,
          description: input.description || null,
          updatedBy: ctx.user.id,
        },
      });

      return { success: true };
    }),

  /**
   * Record user consent
   */
  recordConsent: protectedProcedure
    .input(z.object({
      consentType: z.enum(["privacy_policy", "terms_of_service", "data_processing", "marketing", "analytics"]),
      consentVersion: z.string(),
      consentGiven: z.boolean(),
      consentText: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const ipAddress = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket.remoteAddress || null;
      const userAgent = ctx.req.headers['user-agent'] || null;

      await db.insert(userConsents).values({
        userId: ctx.user.id,
        consentType: input.consentType,
        consentVersion: input.consentVersion,
        consentGiven: input.consentGiven ? 1 : 0,
        consentText: input.consentText || null,
        ipAddress,
        userAgent,
      });

      return { success: true };
    }),

  /**
   * Get user's consent history
   */
  getMyConsents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, ctx.user.id))
      .orderBy(desc(userConsents.consentedAt));
  }),

  /**
   * Request data export (FOIP compliance)
   */
  requestDataExport: protectedProcedure
    .input(z.object({
      requestDetails: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.insert(dataAccessRequests).values({
        userId: ctx.user.id,
        requestType: "export",
        requestDetails: input.requestDetails || null,
      });

      return { success: true, requestId: result[0].insertId };
    }),

  /**
   * Request account deletion (FOIP compliance)
   */
  requestAccountDeletion: protectedProcedure
    .input(z.object({
      requestDetails: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.insert(dataAccessRequests).values({
        userId: ctx.user.id,
        requestType: "deletion",
        requestDetails: input.requestDetails || null,
      });

      return { success: true, requestId: result[0].insertId };
    }),

  /**
   * Get my data access requests
   */
  getMyDataRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return await db
      .select()
      .from(dataAccessRequests)
      .where(eq(dataAccessRequests.userId, ctx.user.id))
      .orderBy(desc(dataAccessRequests.requestedAt));
  }),

  /**
   * Get all data access requests (admin only)
   */
  getAllDataRequests: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return await db
      .select({
        request: dataAccessRequests,
        user: users,
      })
      .from(dataAccessRequests)
      .leftJoin(users, eq(dataAccessRequests.userId, users.id))
      .orderBy(desc(dataAccessRequests.requestedAt));
  }),

  /**
   * Process data access request (admin only)
   */
  processDataRequest: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      action: z.enum(["approve", "reject"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (input.action === "reject") {
        await db
          .update(dataAccessRequests)
          .set({
            status: "rejected",
            processedBy: ctx.user.id,
            processedAt: new Date().toISOString(),
            rejectionReason: input.rejectionReason || null,
          })
          .where(eq(dataAccessRequests.id, input.requestId));
      } else {
        // For approval, mark as processing - actual data export/deletion happens separately
        await db
          .update(dataAccessRequests)
          .set({
            status: "processing",
            processedBy: ctx.user.id,
            processedAt: new Date().toISOString(),
          })
          .where(eq(dataAccessRequests.id, input.requestId));
      }

      return { success: true };
    }),

  /**
   * Get audit log (admin only)
   */
  getAuditLog: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      userId: z.number().optional(),
      action: z.enum(["create", "update", "delete", "view", "export", "share"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.entityType) conditions.push(eq(auditLog.entityType, input.entityType));
      if (input.userId) conditions.push(eq(auditLog.userId, input.userId));
      if (input.action) conditions.push(eq(auditLog.action, input.action));
      if (input.startDate) conditions.push(gte(auditLog.createdAt, input.startDate.toISOString()));
      if (input.endDate) conditions.push(lte(auditLog.createdAt, input.endDate.toISOString()));

      const logs = await db
        .select({
          log: auditLog,
          user: users,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLog.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),

  /**
   * Get compliance dashboard metrics (admin only)
   */
  getComplianceMetrics: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Get total users
    const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get users with privacy consent
    const consentedUsersResult = await db
      .select({ count: sql<number>`count(DISTINCT userId)` })
      .from(userConsents)
      .where(and(
        eq(userConsents.consentType, "privacy_policy"),
        eq(userConsents.consentGiven, 1)
      ));
    const consentedUsers = consentedUsersResult[0]?.count || 0;

    // Get pending data requests
    const pendingRequestsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(dataAccessRequests)
      .where(eq(dataAccessRequests.status, "pending"));
    const pendingRequests = pendingRequestsResult[0]?.count || 0;

    // Get audit log entries (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAuditLogsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(gte(auditLog.createdAt, thirtyDaysAgo.toISOString()));
    const recentAuditLogs = recentAuditLogsResult[0]?.count || 0;

    return {
      totalUsers,
      consentedUsers,
      consentRate: totalUsers > 0 ? ((consentedUsers / totalUsers) * 100).toFixed(1) : "0",
      pendingDataRequests: pendingRequests,
      auditLogsLast30Days: recentAuditLogs,
    };
  }),

  /**
   * Check component compliance against building code using AI
   */
  checkComponent: protectedProcedure
    .input(
      z.object({
        componentName: z.string(),
        componentLocation: z.string().optional(),
        condition: z.string().optional(),
        observations: z.string().optional(),
        buildingCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const buildingCodeNames: Record<string, string> = {
        "nbc-2025": "National Building Code of Canada 2025 (Proposed)",
        "nbc-2020": "National Building Code of Canada 2020",
        "nbc-2015": "National Building Code of Canada 2015",
        "obc-2024": "Ontario Building Code 2024 (Effective January 1, 2025)",
        "obc-2012": "Ontario Building Code 2012",
        "bcbc-2024": "British Columbia Building Code 2024",
        "bcbc-2018": "British Columbia Building Code 2018",
        "abc-2023": "Alberta Building Code 2023 (Effective May 1, 2024)",
        "abc-2019": "Alberta Building Code 2019",
        "ibc-2024": "International Building Code 2024",
        "ibc-2021": "International Building Code 2021",
        "ibc-2018": "International Building Code 2018",
      };

      const buildingCodeName = buildingCodeNames[input.buildingCode] || input.buildingCode;

      const prompt = `You are a building code compliance expert. Analyze the following building component against ${buildingCodeName}.

Component Information:
- Name: ${input.componentName}
${input.componentLocation ? `- Location: ${input.componentLocation}` : ""}
${input.condition ? `- Current Condition: ${input.condition}` : ""}
${input.observations ? `- Observations: ${input.observations}` : ""}

Building Code: ${buildingCodeName}

Task: Determine if this component is compliant with the selected building code. Consider:
1. Current condition and any observed deficiencies
2. Relevant building code requirements for this type of component
3. Safety and structural integrity standards
4. Maintenance and lifecycle requirements

IMPORTANT: For EVERY non-compliant finding, you MUST provide a specific reason explaining WHY the component fails to meet the building code requirements. Reference specific code sections where applicable.

Format your response as JSON with the following structure:
{
  "compliant": true or false,
  "details": "Brief overall summary of the compliance assessment",
  "nonComplianceReasons": [
    {
      "reason": "Specific reason why this component is non-compliant",
      "codeReference": "Relevant building code section (e.g., NBC 2020 Section 9.3.2.1)",
      "severity": "high or medium or low",
      "recommendation": "Specific action to address this issue"
    }
  ],
  "complianceNotes": "Additional notes about compliant aspects or areas that meet requirements (if any)"
}

If the component is COMPLIANT, set compliant to true, provide a positive summary in details, and leave nonComplianceReasons as an empty array.
If the component is NON-COMPLIANT, set compliant to false and populate the nonComplianceReasons array with ALL specific reasons for non-compliance.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a building code compliance expert. Provide accurate, professional assessments based on building codes and standards.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: {
            type: "json_object",
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from AI service");
        }

        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const result = JSON.parse(contentStr);
        
        return {
          compliant: result.compliant === true,
          details: result.details || "No details provided",
          nonComplianceReasons: result.nonComplianceReasons || [],
          complianceNotes: result.complianceNotes || null,
        };
      } catch (error) {
        console.error("Compliance check error:", error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to check compliance. Please try again." 
        });
      }
    }),
});
