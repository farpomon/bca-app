/**
 * RSMeans tRPC Router
 * 
 * Provides tRPC procedures for accessing RSMeans construction cost data.
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import * as rsmeans from './rsmeans';

export const rsmeansRouter = router({
  /**
   * Get API status (whether real API or mock data is being used)
   */
  getStatus: publicProcedure.query(() => {
    return rsmeans.getAPIStatus();
  }),

  /**
   * Get all available locations
   */
  getLocations: protectedProcedure
    .input(z.object({
      searchTerm: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return rsmeans.getLocations(input?.searchTerm);
    }),

  /**
   * Get a single location by ID
   */
  getLocation: protectedProcedure
    .input(z.object({
      locationId: z.string(),
    }))
    .query(async ({ input }) => {
      return rsmeans.getLocation(input.locationId);
    }),

  /**
   * Get available cost data catalogs
   */
  getCatalogs: protectedProcedure
    .input(z.object({
      releaseId: z.string().optional(),
      locationId: z.string().optional(),
      laborType: z.enum(['std', 'opn', 'fmr', 'res']).optional(),
      measurementSystem: z.enum(['imp', 'met']).optional(),
    }).optional())
    .query(async ({ input }) => {
      return rsmeans.getCatalogs(input);
    }),

  /**
   * Get divisions (CSI MasterFormat hierarchy)
   */
  getDivisions: protectedProcedure
    .input(z.object({
      catalogId: z.string(),
      parentDivisionId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return rsmeans.getDivisions(input.catalogId, input.parentDivisionId);
    }),

  /**
   * Search cost lines
   */
  searchCostLines: protectedProcedure
    .input(z.object({
      catalogId: z.string(),
      searchTerm: z.string().optional(),
      divisionCode: z.string().optional(),
      offset: z.number().optional(),
      limit: z.number().min(1).max(100).optional(),
      costLineType: z.enum(['unknown', 'install', 'demo', 'trade', 'equipment']).optional(),
    }))
    .query(async ({ input }) => {
      return rsmeans.searchCostLines(input);
    }),

  /**
   * Get a single cost line by ID
   */
  getCostLine: protectedProcedure
    .input(z.object({
      catalogId: z.string(),
      costLineId: z.string(),
    }))
    .query(async ({ input }) => {
      return rsmeans.getCostLine(input.catalogId, input.costLineId);
    }),

  /**
   * Get cost factors for a location
   */
  getCostFactors: protectedProcedure
    .input(z.object({
      locationId: z.string(),
      releaseId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return rsmeans.getCostFactors(input.locationId, input.releaseId);
    }),

  /**
   * Get all cost factors
   */
  getAllCostFactors: protectedProcedure.query(async () => {
    return rsmeans.getAllCostFactors();
  }),

  /**
   * Calculate localized cost for a cost line
   */
  calculateCost: protectedProcedure
    .input(z.object({
      catalogId: z.string(),
      costLineId: z.string(),
      locationId: z.string(),
      quantity: z.number().positive(),
    }))
    .query(async ({ input }) => {
      const [costLine, costFactor] = await Promise.all([
        rsmeans.getCostLine(input.catalogId, input.costLineId),
        rsmeans.getCostFactors(input.locationId),
      ]);

      if (!costLine) {
        throw new Error('Cost line not found');
      }

      if (!costFactor) {
        throw new Error('Cost factor not found for location');
      }

      const calculated = rsmeans.calculateLocalizedCost(costLine, costFactor, input.quantity);

      return {
        costLine,
        costFactor,
        quantity: input.quantity,
        ...calculated,
      };
    }),

  /**
   * Batch calculate costs for multiple items
   */
  batchCalculateCosts: protectedProcedure
    .input(z.object({
      catalogId: z.string(),
      locationId: z.string(),
      items: z.array(z.object({
        costLineId: z.string(),
        quantity: z.number().positive(),
      })),
    }))
    .mutation(async ({ input }) => {
      const costFactor = await rsmeans.getCostFactors(input.locationId);
      
      if (!costFactor) {
        throw new Error('Cost factor not found for location');
      }

      const results = await Promise.all(
        input.items.map(async (item) => {
          const costLine = await rsmeans.getCostLine(input.catalogId, item.costLineId);
          
          if (!costLine) {
            return {
              costLineId: item.costLineId,
              error: 'Cost line not found',
              success: false,
            };
          }

          const calculated = rsmeans.calculateLocalizedCost(costLine, costFactor, item.quantity);

          return {
            costLineId: item.costLineId,
            costLine,
            quantity: item.quantity,
            ...calculated,
            success: true,
          };
        })
      );

      const successfulItems = results.filter(r => r.success);
      const totalCost = successfulItems.reduce((sum, r) => sum + (r.totalCost || 0), 0);

      return {
        locationId: input.locationId,
        costFactor,
        items: results,
        summary: {
          totalItems: input.items.length,
          successfulItems: successfulItems.length,
          failedItems: results.filter(r => !r.success).length,
          totalCost: Math.round(totalCost * 100) / 100,
        },
      };
    }),

  /**
   * Get cost estimate for a building component (UNIFORMAT II mapping)
   */
  getComponentCostEstimate: protectedProcedure
    .input(z.object({
      componentCode: z.string(), // UNIFORMAT II code like B2010
      locationId: z.string(),
      quantity: z.number().positive(),
      unit: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // Map UNIFORMAT II codes to RSMeans divisions
      const uniformatToRSMeans: Record<string, string[]> = {
        // Substructure
        'A10': ['03', '31'], // Foundations -> Concrete, Earthwork
        'A1010': ['03'], // Standard Foundations
        'A1020': ['03'], // Special Foundations
        'A1030': ['31'], // Slab on Grade
        'A20': ['02', '31'], // Basement Construction
        
        // Shell
        'B10': ['03', '04', '05'], // Superstructure
        'B1010': ['03', '05'], // Floor Construction
        'B1020': ['03', '05'], // Roof Construction
        'B20': ['04', '07'], // Exterior Enclosure
        'B2010': ['04', '07'], // Exterior Walls
        'B2020': ['08'], // Exterior Windows
        'B2030': ['08'], // Exterior Doors
        'B30': ['07'], // Roofing
        'B3010': ['07'], // Roof Coverings
        'B3020': ['07'], // Roof Openings
        
        // Interiors
        'C10': ['09'], // Interior Construction
        'C1010': ['09'], // Partitions
        'C1020': ['08'], // Interior Doors
        'C1030': ['06', '09'], // Fittings
        'C20': ['14'], // Stairs
        'C30': ['09'], // Interior Finishes
        'C3010': ['09'], // Wall Finishes
        'C3020': ['09'], // Floor Finishes
        'C3030': ['09'], // Ceiling Finishes
        
        // Services
        'D10': ['22'], // Conveying
        'D20': ['22'], // Plumbing
        'D2010': ['22'], // Plumbing Fixtures
        'D2020': ['22'], // Domestic Water Distribution
        'D2030': ['22'], // Sanitary Waste
        'D2040': ['22'], // Rain Water Drainage
        'D30': ['23'], // HVAC
        'D3010': ['23'], // Energy Supply
        'D3020': ['23'], // Heat Generating Systems
        'D3030': ['23'], // Cooling Generating Systems
        'D3040': ['23'], // Distribution Systems
        'D3050': ['23'], // Terminal & Package Units
        'D3060': ['23'], // Controls & Instrumentation
        'D40': ['21'], // Fire Protection
        'D4010': ['21'], // Sprinklers
        'D4020': ['21'], // Standpipes
        'D4030': ['21'], // Fire Protection Specialties
        'D50': ['26', '27', '28'], // Electrical
        'D5010': ['26'], // Electrical Service & Distribution
        'D5020': ['26'], // Lighting & Branch Wiring
        'D5030': ['27'], // Communications & Security
        
        // Equipment & Furnishings
        'E10': ['11'], // Equipment
        'E20': ['12'], // Furnishings
        
        // Special Construction
        'F10': ['13'], // Special Construction
        'F20': ['13'], // Selective Building Demolition
        
        // Building Sitework
        'G10': ['31', '32'], // Site Preparation
        'G20': ['32'], // Site Improvements
        'G30': ['32'], // Site Mechanical Utilities
        'G40': ['26'], // Site Electrical Utilities
        'G90': ['32', '33'], // Other Site Construction
      };

      // Get relevant division codes
      const divisionCodes = uniformatToRSMeans[input.componentCode] || 
                           uniformatToRSMeans[input.componentCode.substring(0, 3)] ||
                           uniformatToRSMeans[input.componentCode.substring(0, 2)] ||
                           [];

      if (divisionCodes.length === 0) {
        return {
          componentCode: input.componentCode,
          locationId: input.locationId,
          quantity: input.quantity,
          estimatedCost: null,
          message: 'No RSMeans mapping found for this UNIFORMAT II code',
          suggestedDivisions: [],
        };
      }

      // Get cost factor for location
      const costFactor = await rsmeans.getCostFactors(input.locationId);

      // Search for relevant cost lines
      const searchResults = await Promise.all(
        divisionCodes.map(code => 
          rsmeans.searchCostLines({
            catalogId: 'unit-2024-std-imp',
            divisionCode: code,
            limit: 10,
          })
        )
      );

      // Flatten and dedupe results
      const allCostLines = searchResults.flatMap(r => r.items);

      return {
        componentCode: input.componentCode,
        locationId: input.locationId,
        quantity: input.quantity,
        costFactor,
        relatedDivisions: divisionCodes,
        suggestedCostLines: allCostLines.slice(0, 20),
        message: `Found ${allCostLines.length} related cost lines in divisions: ${divisionCodes.join(', ')}`,
      };
    }),
});

export type RSMeansRouter = typeof rsmeansRouter;
