import { describe, expect, it } from "vitest";
import { dataToExcelStreaming, bulkProjectsToExcelStreaming } from "./export-utils-streaming";

describe("Streaming Excel Export", () => {
  describe("dataToExcelStreaming", () => {
    it("should generate valid Excel buffer for assessments and deficiencies", async () => {
      const data = {
        projectName: "Test Project",
        assessments: [
          {
            id: 1,
            assetId: 100,
            componentCode: "B30",
            componentName: "Roofing",
            componentLocation: "Main Building",
            condition: "good",
            status: "active",
            conditionPercentage: 85,
            observations: "Roof is in good condition",
            recommendations: "Regular maintenance recommended",
            remainingUsefulLife: 15,
            expectedUsefulLife: 25,
            reviewYear: 2024,
            lastTimeAction: 2020,
            estimatedRepairCost: 5000,
            replacementValue: 50000,
            actionYear: 2025,
            conditionScore: 85,
            ciScore: 0.85,
            fciScore: 0.1,
            assessedAt: new Date(),
            createdAt: new Date(),
          },
        ],
        deficiencies: [
          {
            id: 1,
            assessmentId: 1,
            componentCode: "B30",
            title: "Minor crack",
            description: "Small crack in roofing membrane",
            severity: "low",
            priority: "medium_term",
            location: "North section",
            estimatedCost: 500,
            recommendedAction: "Seal crack",
            timeline: "Within 6 months",
            createdAt: new Date(),
          },
        ],
      };

      const buffer = await dataToExcelStreaming(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000); // Valid Excel files are substantial
      
      // Check for XLSX magic bytes (PK zip header)
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
    });

    it("should handle empty assessments and deficiencies", async () => {
      const data = {
        projectName: "Empty Project",
        assessments: [],
        deficiencies: [],
      };

      const buffer = await dataToExcelStreaming(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100); // Even empty Excel has headers
    });

    it("should handle null/undefined values gracefully", async () => {
      const data = {
        projectName: "Null Values Project",
        assessments: [
          {
            id: 1,
            assetId: null,
            componentCode: undefined,
            componentName: "Test",
            componentLocation: null,
            condition: null,
            status: null,
            conditionPercentage: null,
            observations: null,
            recommendations: null,
            remainingUsefulLife: null,
            expectedUsefulLife: null,
            reviewYear: null,
            lastTimeAction: null,
            estimatedRepairCost: null,
            replacementValue: null,
            actionYear: null,
            conditionScore: null,
            ciScore: null,
            fciScore: null,
            assessedAt: null,
            createdAt: null,
          },
        ],
        deficiencies: [],
      };

      const buffer = await dataToExcelStreaming(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });

  describe("bulkProjectsToExcelStreaming", () => {
    it("should generate valid Excel buffer for multiple projects", async () => {
      const projects = [
        {
          project: {
            id: 1,
            name: "Project A",
            status: "active",
            clientName: "Client A",
            address: "123 Main St",
            propertyType: "commercial",
            createdAt: new Date(),
          },
          assessments: [
            {
              id: 1,
              componentCode: "B30",
              componentName: "Roofing",
              componentLocation: "Main",
              condition: "good",
              status: "active",
              conditionPercentage: 80,
              observations: "Good condition",
              estimatedRepairCost: 1000,
              replacementValue: 10000,
            },
          ],
          deficiencies: [],
        },
        {
          project: {
            id: 2,
            name: "Project B",
            status: "completed",
            clientName: "Client B",
            address: "456 Oak Ave",
            propertyType: "residential",
            createdAt: new Date(),
          },
          assessments: [],
          deficiencies: [
            {
              id: 1,
              componentCode: "C10",
              title: "Wall damage",
              description: "Crack in wall",
              severity: "medium",
              priority: "short_term",
              location: "East wall",
              estimatedCost: 2000,
              recommendedAction: "Repair crack",
            },
          ],
        },
      ];

      const buffer = await bulkProjectsToExcelStreaming(projects);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(2000); // Multiple sheets = larger file
      
      // Check for XLSX magic bytes
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it("should handle empty projects array", async () => {
      const buffer = await bulkProjectsToExcelStreaming([]);

      expect(buffer).toBeInstanceOf(Buffer);
      // Even with no projects, should have summary sheet
      expect(buffer.length).toBeGreaterThan(100);
    });

    it("should handle projects with long names (31 char limit)", async () => {
      const projects = [
        {
          project: {
            id: 1,
            name: "This is a very long project name that exceeds the Excel sheet name limit",
            status: "active",
            clientName: "Client",
            address: "Address",
            propertyType: "commercial",
            createdAt: new Date(),
          },
          assessments: [],
          deficiencies: [],
        },
      ];

      const buffer = await bulkProjectsToExcelStreaming(projects);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });
});
