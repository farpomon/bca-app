import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAssetTimeline, createTimelineEvent } from "./timeline.service";
import { getDb } from "../db";
import {
  projects,
  assets,
  assessments,
  deficiencies,
  photos,
  maintenanceEntries,
  assetTimelineEvents,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Timeline Service", () => {
  let testProjectId: number;
  let testAssetId: number;
  let testAssessmentId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test project
    const projectResult = await db.insert(projects).values({
      name: "Timeline Test Project",
      clientName: "Test Client",
      location: "Test Location",
      status: "in_progress",
      companyId: 1,
      userId: 1,
      createdBy: 1,
    });
    const projectInsertId = (projectResult as any).insertId || (projectResult as any)[0]?.insertId;
    testProjectId = Number(projectInsertId);
    
    if (isNaN(testProjectId)) {
      throw new Error("Failed to create test project - invalid insertId");
    }

    // Create test asset
    const assetResult = await db.insert(assets).values({
      projectId: testProjectId,
      name: "Test Asset",
      assetType: "Building",
      address: "Test Location",
    });
    const assetInsertId = (assetResult as any).insertId || (assetResult as any)[0]?.insertId;
    testAssetId = Number(assetInsertId);
    
    if (isNaN(testAssetId)) {
      throw new Error("Failed to create test asset - invalid insertId");
    }

    // Create test assessment
    const assessmentResult = await db.insert(assessments).values({
      projectId: testProjectId,
      assetId: testAssetId,
      componentCode: "A1010",
      componentName: "Foundation",
      condition: "good",
      createdBy: 1,
    });
    const assessmentInsertId = (assessmentResult as any).insertId || (assessmentResult as any)[0]?.insertId;
    testAssessmentId = Number(assessmentInsertId);
    
    if (isNaN(testAssessmentId)) {
      throw new Error("Failed to create test assessment - invalid insertId");
    }

    // Create test deficiency
    await db.insert(deficiencies).values({
      projectId: testProjectId,
      assessmentId: testAssessmentId,
      componentCode: "A1010",
      title: "Test Deficiency",
      description: "Test deficiency description",
      priority: "medium_term",
      status: "open",
    });

    // Create test photo
    await db.insert(photos).values({
      projectId: testProjectId,
      assetId: testAssetId,
      fileKey: "test-key",
      url: "https://example.com/photo.jpg",
      caption: "Test Photo",
    });

    // Create test maintenance entry
    await db.insert(maintenanceEntries).values({
      projectId: testProjectId,
      assessmentId: testAssessmentId,
      componentName: "Foundation",
      entryType: "identified",
      actionType: "repair",
      description: "Test maintenance",
      status: "planned",
      createdBy: 1,
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(assetTimelineEvents).where(eq(assetTimelineEvents.projectId, testProjectId));
    await db.delete(maintenanceEntries).where(eq(maintenanceEntries.projectId, testProjectId));
    await db.delete(photos).where(eq(photos.projectId, testProjectId));
    await db.delete(deficiencies).where(eq(deficiencies.projectId, testProjectId));
    await db.delete(assessments).where(eq(assessments.projectId, testProjectId));
    await db.delete(assets).where(eq(assets.projectId, testProjectId));
    await db.delete(projects).where(eq(projects.id, testProjectId));
  });

  it("should aggregate timeline events from multiple sources", async () => {
    const timeline = await getAssetTimeline(testAssetId, testProjectId);

    expect(timeline).toBeDefined();
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);

    // Should include assessment event
    const assessmentEvent = timeline.find((e) => e.eventType === "assessment");
    expect(assessmentEvent).toBeDefined();
    expect(assessmentEvent?.title).toContain("Foundation");

    // Should include deficiency event
    const deficiencyEvent = timeline.find((e) => e.eventType === "deficiency");
    expect(deficiencyEvent).toBeDefined();
    expect(deficiencyEvent?.title).toContain("Test Deficiency");

    // Should include document event (photo)
    const documentEvent = timeline.find((e) => e.eventType === "document");
    expect(documentEvent).toBeDefined();
    expect(documentEvent?.title).toContain("Photo");

    // Should include maintenance/schedule event
    const maintenanceEvent = timeline.find(
      (e) => e.eventType === "maintenance" || e.eventType === "schedule"
    );
    expect(maintenanceEvent).toBeDefined();
  });

  it("should filter events by event type", async () => {
    const timeline = await getAssetTimeline(testAssetId, testProjectId, {
      eventTypes: ["assessment"],
    });

    expect(timeline.every((e) => e.eventType === "assessment")).toBe(true);
  });

  it("should filter events by date range", async () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeline = await getAssetTimeline(testAssetId, testProjectId, {
      startDate: yesterday.toISOString(),
      endDate: tomorrow.toISOString(),
    });

    expect(timeline).toBeDefined();
    expect(Array.isArray(timeline)).toBe(true);
    // All events should be within the date range
    timeline.forEach((event) => {
      const eventDate = new Date(event.eventDate);
      expect(eventDate >= yesterday).toBe(true);
      expect(eventDate <= tomorrow).toBe(true);
    });
  });

  it("should filter events by search query", async () => {
    const timeline = await getAssetTimeline(testAssetId, testProjectId, {
      searchQuery: "Foundation",
    });

    expect(timeline.length).toBeGreaterThan(0);
    timeline.forEach((event) => {
      const matchesTitle = event.title.toLowerCase().includes("foundation");
      const matchesDescription =
        event.description && event.description.toLowerCase().includes("foundation");
      expect(matchesTitle || matchesDescription).toBe(true);
    });
  });

  it("should sort events by date descending", async () => {
    const timeline = await getAssetTimeline(testAssetId, testProjectId);

    if (timeline.length > 1) {
      for (let i = 0; i < timeline.length - 1; i++) {
        const currentDate = new Date(timeline[i].eventDate);
        const nextDate = new Date(timeline[i + 1].eventDate);
        expect(currentDate >= nextDate).toBe(true);
      }
    }
  });

  it("should create custom timeline event", async () => {
    const customEvent = await createTimelineEvent({
      assetId: testAssetId,
      projectId: testProjectId,
      eventType: "custom",
      eventDate: new Date().toISOString(),
      title: "Custom Test Event",
      description: "This is a custom timeline event",
      metadata: JSON.stringify({ testKey: "testValue" }),
      createdBy: 1,
    });

    expect(customEvent).toBeDefined();
    expect(customEvent.eventType).toBe("custom");
    expect(customEvent.title).toBe("Custom Test Event");
    expect(customEvent.description).toBe("This is a custom timeline event");

    // Verify it appears in timeline
    const timeline = await getAssetTimeline(testAssetId, testProjectId);
    const foundEvent = timeline.find((e) => e.id === customEvent.id);
    expect(foundEvent).toBeDefined();
  });

  it("should handle empty timeline gracefully", async () => {
    // Create a new asset with no events
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const emptyAssetResult = await db.insert(assets).values({
      projectId: testProjectId,
      name: "Empty Asset",
      assetType: "Building",
      address: "Test Location",
    });
    const emptyAssetInsertId = (emptyAssetResult as any).insertId || (emptyAssetResult as any)[0]?.insertId;
    const emptyAssetId = Number(emptyAssetInsertId);

    const timeline = await getAssetTimeline(emptyAssetId, testProjectId);

    expect(timeline).toBeDefined();
    expect(Array.isArray(timeline)).toBe(true);
    // Empty asset should have no events (or minimal events from project-level data)
    expect(timeline.length).toBeLessThanOrEqual(2);

    // Clean up
    await db.delete(assets).where(eq(assets.id, emptyAssetId));
  });
});
