import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { mfaTimeRestrictions } from "../../drizzle/schema";

export type RestrictionType = 'always' | 'business_hours' | 'after_hours' | 'custom_schedule' | 'never';

export interface MfaTimeRestriction {
  id: number;
  userId: number;
  restrictionType: RestrictionType;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string | null; // JSON array
  timezone: string | null;
  isActive: number;
  description: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeRestrictionInput {
  userId: number;
  restrictionType: RestrictionType;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string[];
  timezone?: string;
  description?: string;
  createdBy: number;
}

export interface UpdateTimeRestrictionInput {
  restrictionType?: RestrictionType;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: string[];
  timezone?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * Get all active time restrictions for a user
 */
export async function getUserTimeRestrictions(userId: number): Promise<MfaTimeRestriction[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const restrictions = await db
    .select()
    .from(mfaTimeRestrictions)
    .where(
      and(
        eq(mfaTimeRestrictions.userId, userId),
        eq(mfaTimeRestrictions.isActive, 1)
      )
    );

  return restrictions.map(r => ({
    ...r,
    startTime: r.startTime ?? null,
    endTime: r.endTime ?? null,
    daysOfWeek: r.daysOfWeek ?? null,
    timezone: r.timezone ?? null,
    description: r.description ?? null,
    createdBy: r.createdBy ?? null,
  }));
}

/**
 * Create a new time restriction for a user
 */
export async function createTimeRestriction(input: CreateTimeRestrictionInput): Promise<MfaTimeRestriction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const daysOfWeekJson = input.daysOfWeek ? JSON.stringify(input.daysOfWeek) : null;

  const result = await db.insert(mfaTimeRestrictions).values({
    userId: input.userId,
    restrictionType: input.restrictionType,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    daysOfWeek: daysOfWeekJson,
    timezone: input.timezone ?? 'UTC',
    description: input.description ?? null,
    createdBy: input.createdBy,
    isActive: 1,
  });

  const insertId = Number(result[0].insertId);
  const created = await db
    .select()
    .from(mfaTimeRestrictions)
    .where(eq(mfaTimeRestrictions.id, insertId))
    .limit(1);

  if (!created[0]) throw new Error("Failed to create time restriction");

  return {
    ...created[0],
    startTime: created[0].startTime ?? null,
    endTime: created[0].endTime ?? null,
    daysOfWeek: created[0].daysOfWeek ?? null,
    timezone: created[0].timezone ?? null,
    description: created[0].description ?? null,
    createdBy: created[0].createdBy ?? null,
  };
}

/**
 * Update an existing time restriction
 */
export async function updateTimeRestriction(
  restrictionId: number,
  input: UpdateTimeRestrictionInput
): Promise<MfaTimeRestriction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};

  if (input.restrictionType !== undefined) updateData.restrictionType = input.restrictionType;
  if (input.startTime !== undefined) updateData.startTime = input.startTime;
  if (input.endTime !== undefined) updateData.endTime = input.endTime;
  if (input.daysOfWeek !== undefined) updateData.daysOfWeek = JSON.stringify(input.daysOfWeek);
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

  await db
    .update(mfaTimeRestrictions)
    .set(updateData)
    .where(eq(mfaTimeRestrictions.id, restrictionId));

  const updated = await db
    .select()
    .from(mfaTimeRestrictions)
    .where(eq(mfaTimeRestrictions.id, restrictionId))
    .limit(1);

  if (!updated[0]) throw new Error("Time restriction not found");

  return {
    ...updated[0],
    startTime: updated[0].startTime ?? null,
    endTime: updated[0].endTime ?? null,
    daysOfWeek: updated[0].daysOfWeek ?? null,
    timezone: updated[0].timezone ?? null,
    description: updated[0].description ?? null,
    createdBy: updated[0].createdBy ?? null,
  };
}

/**
 * Delete a time restriction
 */
export async function deleteTimeRestriction(restrictionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(mfaTimeRestrictions)
    .where(eq(mfaTimeRestrictions.id, restrictionId));
}

/**
 * Check if MFA is required at the current time based on user's time restrictions
 * Returns true if MFA is required, false otherwise
 */
export async function checkMfaTimeRestriction(userId: number, currentTime?: Date): Promise<boolean> {
  const restrictions = await getUserTimeRestrictions(userId);

  // If no restrictions, MFA is not required by time rules
  if (restrictions.length === 0) return false;

  const now = currentTime || new Date();

  for (const restriction of restrictions) {
    const result = evaluateRestriction(restriction, now);
    
    // If any restriction says MFA is required, return true
    if (result) return true;
  }

  // No restrictions matched, MFA not required by time rules
  return false;
}

/**
 * Evaluate a single restriction against the current time
 */
function evaluateRestriction(restriction: MfaTimeRestriction, currentTime: Date): boolean {
  // Handle simple cases first
  if (restriction.restrictionType === 'always') return true;
  if (restriction.restrictionType === 'never') return false;

  // Get current time in user's timezone
  const timezone = restriction.timezone || 'UTC';
  const userTime = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
  
  const currentHour = userTime.getHours();
  const currentMinute = userTime.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = userTime.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayName = dayNames[dayOfWeek];

  // Check if current day is in allowed days
  let daysOfWeek: string[] = [];
  if (restriction.daysOfWeek) {
    try {
      daysOfWeek = JSON.parse(restriction.daysOfWeek);
    } catch (e) {
      console.error('Failed to parse daysOfWeek:', e);
      return false;
    }
  }

  // Business hours: Monday-Friday, 9 AM - 5 PM (default)
  if (restriction.restrictionType === 'business_hours') {
    const startTime = restriction.startTime || '09:00';
    const endTime = restriction.endTime || '17:00';
    const allowedDays = daysOfWeek.length > 0 
      ? daysOfWeek 
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    const isDayAllowed = allowedDays.includes(currentDayName);
    const isTimeInRange = isTimeInRange_helper(currentTimeStr, startTime, endTime);

    return isDayAllowed && isTimeInRange;
  }

  // After hours: opposite of business hours
  if (restriction.restrictionType === 'after_hours') {
    const startTime = restriction.startTime || '17:00';
    const endTime = restriction.endTime || '09:00';
    const businessDays = daysOfWeek.length > 0 
      ? daysOfWeek 
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // After hours includes weekends + non-business hours on weekdays
    const isWeekend = !businessDays.includes(currentDayName);
    const isAfterHours = isTimeInRange_helper(currentTimeStr, startTime, endTime);

    return isWeekend || isAfterHours;
  }

  // Custom schedule
  if (restriction.restrictionType === 'custom_schedule') {
    if (!restriction.startTime || !restriction.endTime) return false;

    const isDayAllowed = daysOfWeek.length === 0 || daysOfWeek.includes(currentDayName);
    const isTimeInRange = isTimeInRange_helper(currentTimeStr, restriction.startTime, restriction.endTime);

    return isDayAllowed && isTimeInRange;
  }

  return false;
}

/**
 * Helper to check if current time is within a time range
 * Handles ranges that cross midnight (e.g., 17:00 - 09:00)
 */
function isTimeInRange_helper(currentTime: string, startTime: string, endTime: string): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start <= end) {
    // Normal range (e.g., 09:00 - 17:00)
    return current >= start && current <= end;
  } else {
    // Range crosses midnight (e.g., 17:00 - 09:00)
    return current >= start || current <= end;
  }
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
