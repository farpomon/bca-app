import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAssetTimeline, createTimelineEvent, TimelineFilters } from "../services/timeline.service";

export const timelineRouter = router({
  /**
   * Get timeline events for an asset
   */
  getAssetTimeline: protectedProcedure
    .input(
      z.object({
        assetId: z.number(),
        projectId: z.number(),
        filters: z
          .object({
            eventTypes: z
              .array(z.enum(["assessment", "deficiency", "maintenance", "document", "schedule", "custom"]))
              .optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            searchQuery: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { assetId, projectId, filters } = input;
      return await getAssetTimeline(assetId, projectId, filters as TimelineFilters);
    }),

  /**
   * Create a custom timeline event
   */
  createEvent: protectedProcedure
    .input(
      z.object({
        assetId: z.number(),
        projectId: z.number(),
        eventDate: z.string(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        metadata: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createTimelineEvent({
        assetId: input.assetId,
        projectId: input.projectId,
        eventType: "custom",
        eventDate: input.eventDate,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        createdBy: ctx.user.id,
      });
    }),
});
