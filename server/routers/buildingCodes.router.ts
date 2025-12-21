import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as buildingCodesDb from "../db-building-codes";

export const buildingCodesRouter = router({
  /**
   * Get all active building codes
   */
  list: protectedProcedure.query(async () => {
    try {
      return await buildingCodesDb.getActiveBuildingCodes();
    } catch (error) {
      console.error("Error fetching building codes:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch building codes",
      });
    }
  }),

  /**
   * Get latest building code for a jurisdiction
   */
  getLatest: protectedProcedure
    .input(z.object({ jurisdiction: z.string() }))
    .query(async ({ input }) => {
      try {
        return await buildingCodesDb.getLatestBuildingCode(input.jurisdiction);
      } catch (error) {
        console.error("Error fetching latest building code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch latest building code",
        });
      }
    }),
});
