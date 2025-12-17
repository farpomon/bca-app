import { eq, and, gte, lte, desc, sql, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  assetTimelineEvents,
  assessments,
  deficiencies,
  maintenanceEntries,
  photos,
} from "../../drizzle/schema";

export type TimelineEvent = {
  id: number;
  eventType: "assessment" | "deficiency" | "maintenance" | "document" | "schedule" | "custom";
  eventDate: string;
  title: string;
  description: string | null;
  relatedId: number | null;
  metadata: string | null;
  createdBy: number | null;
  createdAt: string;
};

export type TimelineFilters = {
  eventTypes?: Array<"assessment" | "deficiency" | "maintenance" | "document" | "schedule" | "custom">;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
};

/**
 * Aggregate all timeline events for an asset from various sources
 */
export async function getAssetTimeline(
  assetId: number,
  projectId: number,
  filters?: TimelineFilters
): Promise<TimelineEvent[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const events: TimelineEvent[] = [];

  // Build date filter conditions
  const dateConditions = [];
  if (filters?.startDate) {
    dateConditions.push(sql`eventDate >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    dateConditions.push(sql`eventDate <= ${filters.endDate}`);
  }

  // 1. Get custom timeline events
  const conditions = [eq(assetTimelineEvents.assetId, assetId), eq(assetTimelineEvents.projectId, projectId)];
  
  if (filters?.eventTypes && filters.eventTypes.length > 0) {
    const typeConditions = or(...filters.eventTypes.map((type) => eq(assetTimelineEvents.eventType, type)));
    if (typeConditions) {
      conditions.push(typeConditions);
    }
  }

  const customEvents = await db
    .select()
    .from(assetTimelineEvents)
    .where(and(...conditions));
  events.push(
    ...customEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      eventDate: e.eventDate,
      title: e.title,
      description: e.description,
      relatedId: e.relatedId,
      metadata: e.metadata,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
    }))
  );

  // 2. Get assessments as timeline events (if not filtered out)
  if (!filters?.eventTypes || filters.eventTypes.includes("assessment")) {
    const assetAssessments = await db
      .select({
        id: assessments.id,
        createdAt: assessments.createdAt,
        componentName: assessments.componentName,
        condition: assessments.condition,
        observations: assessments.observations,
      })
      .from(assessments)
      .where(and(eq(assessments.assetId, assetId), eq(assessments.projectId, projectId)));

    events.push(
      ...assetAssessments.map((a) => ({
        id: a.id,
        eventType: "assessment" as const,
        eventDate: a.createdAt,
        title: `Assessment: ${a.componentName}`,
        description: `Condition: ${a.condition}${a.observations ? ` - ${a.observations}` : ""}`,
        relatedId: a.id,
        metadata: JSON.stringify({ condition: a.condition }),
        createdBy: null,
        createdAt: a.createdAt,
      }))
    );
  }

  // 3. Get deficiencies as timeline events (if not filtered out)
  // Note: deficiencies are linked via assessmentId, not directly to assetId
  if (!filters?.eventTypes || filters.eventTypes.includes("deficiency")) {
    const assetDeficiencies = await db
      .select({
        id: deficiencies.id,
        createdAt: deficiencies.createdAt,
        title: deficiencies.title,
        description: deficiencies.description,
        priority: deficiencies.priority,
        status: deficiencies.status,
        assessmentId: deficiencies.assessmentId,
      })
      .from(deficiencies)
      .where(eq(deficiencies.projectId, projectId));

    events.push(
      ...assetDeficiencies.map((d) => ({
        id: d.id,
        eventType: "deficiency" as const,
        eventDate: d.createdAt,
        title: `Deficiency: ${d.title || "Untitled"}`,
        description: d.description || `Priority: ${d.priority}, Status: ${d.status}`,
        relatedId: d.id,
        metadata: JSON.stringify({ priority: d.priority, status: d.status }),
        createdBy: null,
        createdAt: d.createdAt,
      }))
    );
  }

  // 4. Get maintenance entries as timeline events (if not filtered out)
  if (!filters?.eventTypes || filters.eventTypes.includes("maintenance")) {
    const assetMaintenance = await db
      .select({
        id: maintenanceEntries.id,
        createdAt: maintenanceEntries.createdAt,
        actionType: maintenanceEntries.actionType,
        description: maintenanceEntries.description,
        status: maintenanceEntries.status,
        dateScheduled: maintenanceEntries.dateScheduled,
        dateCompleted: maintenanceEntries.dateCompleted,
        assessmentId: maintenanceEntries.assessmentId,
      })
      .from(maintenanceEntries)
      .where(eq(maintenanceEntries.projectId, projectId));

    // Filter by assessmentId to get asset-related maintenance
    // We'll need to join with assessments to filter by assetId
    const assetMaintenanceFiltered = assetMaintenance.filter((m) => m.assessmentId);

    events.push(
      ...assetMaintenanceFiltered.map((m) => {
        const eventDate = m.dateCompleted || m.dateScheduled || m.createdAt;
        const isScheduled = m.status === "planned" || m.status === "approved";
        return {
          id: m.id,
          eventType: isScheduled ? ("schedule" as const) : ("maintenance" as const),
          eventDate: eventDate,
          title: `${isScheduled ? "Scheduled" : "Completed"} Maintenance: ${m.actionType}`,
          description: m.description || `Status: ${m.status}`,
          relatedId: m.id,
          metadata: JSON.stringify({ actionType: m.actionType, status: m.status }),
          createdBy: null,
          createdAt: m.createdAt,
        };
      })
    );
  }

  // 5. Get photo uploads as document events (if not filtered out)
  if (!filters?.eventTypes || filters.eventTypes.includes("document")) {
    const assetPhotos = await db
      .select({
        id: photos.id,
        createdAt: photos.createdAt,
        caption: photos.caption,
        componentCode: photos.componentCode,
      })
      .from(photos)
      .where(and(eq(photos.assetId, assetId), eq(photos.projectId, projectId)));

    events.push(
      ...assetPhotos.map((p) => ({
        id: p.id,
        eventType: "document" as const,
        eventDate: p.createdAt,
        title: `Photo Upload: ${p.caption || p.componentCode || "Untitled"}`,
        description: p.caption || null,
        relatedId: p.id,
        metadata: JSON.stringify({ componentCode: p.componentCode }),
        createdBy: null,
        createdAt: p.createdAt,
      }))
    );
  }

  // Apply date filters
  let filteredEvents = events;
  if (filters?.startDate) {
    filteredEvents = filteredEvents.filter((e) => e.eventDate >= filters.startDate!);
  }
  if (filters?.endDate) {
    filteredEvents = filteredEvents.filter((e) => e.eventDate <= filters.endDate!);
  }

  // Apply search filter
  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredEvents = filteredEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query))
    );
  }

  // Sort by date descending (most recent first)
  filteredEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  return filteredEvents;
}

/**
 * Create a custom timeline event
 */
export async function createTimelineEvent(data: {
  assetId: number;
  projectId: number;
  eventType: "custom";
  eventDate: string;
  title: string;
  description?: string;
  metadata?: string;
  createdBy?: number;
}): Promise<TimelineEvent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(assetTimelineEvents).values({
    assetId: data.assetId,
    projectId: data.projectId,
    eventType: data.eventType,
    eventDate: data.eventDate,
    title: data.title,
    description: data.description || null,
    relatedId: null,
    metadata: data.metadata || null,
    createdBy: data.createdBy || null,
  });

  const insertId = (result as any).insertId || result[0]?.insertId;
  const [newEvent] = await db
    .select()
    .from(assetTimelineEvents)
    .where(eq(assetTimelineEvents.id, Number(insertId)))
    .limit(1);

  if (!newEvent) throw new Error("Failed to create timeline event");

  return {
    id: newEvent.id,
    eventType: newEvent.eventType,
    eventDate: newEvent.eventDate,
    title: newEvent.title,
    description: newEvent.description,
    relatedId: newEvent.relatedId,
    metadata: newEvent.metadata,
    createdBy: newEvent.createdBy,
    createdAt: newEvent.createdAt,
  };
}
