import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  type MfaTimeRestriction,
} from './mfaTimeRestrictions';

// Mock getUserTimeRestrictions to avoid database calls
const mockGetUserTimeRestrictions = vi.hoisted(() => vi.fn());

vi.mock('./mfaTimeRestrictions', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getUserTimeRestrictions: mockGetUserTimeRestrictions,
  };
});

import { checkMfaTimeRestriction } from './mfaTimeRestrictions';

describe('MFA Time Restrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkMfaTimeRestriction', () => {
    it('should return false when no restrictions exist', async () => {
      mockGetUserTimeRestrictions.mockResolvedValue([]);

      const result = await checkMfaTimeRestriction(1);
      expect(result).toBe(false);
    });

    it('should return true for "always" restriction type', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'always',
        startTime: null,
        endTime: null,
        daysOfWeek: null,
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      const result = await checkMfaTimeRestriction(1);
      expect(result).toBe(true);
    });

    it('should return false for "never" restriction type', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'never',
        startTime: null,
        endTime: null,
        daysOfWeek: null,
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      const result = await checkMfaTimeRestriction(1);
      expect(result).toBe(false);
    });

    it('should correctly evaluate business hours (Monday 10 AM)', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'business_hours',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // Monday, 10:00 AM UTC
      const testTime = new Date('2024-01-08T10:00:00Z'); // Monday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(true);
    });

    it('should correctly evaluate business hours (Saturday - outside)', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'business_hours',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // Saturday, 10:00 AM UTC
      const testTime = new Date('2024-01-13T10:00:00Z'); // Saturday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(false);
    });

    it('should correctly evaluate after hours (Monday 6 PM)', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'after_hours',
        startTime: '17:00',
        endTime: '09:00',
        daysOfWeek: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // Monday, 6:00 PM UTC (after hours)
      const testTime = new Date('2024-01-08T18:00:00Z'); // Monday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(true);
    });

    it('should correctly evaluate after hours (Saturday - weekend)', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'after_hours',
        startTime: '17:00',
        endTime: '09:00',
        daysOfWeek: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // Saturday, 10:00 AM UTC (weekend = after hours)
      const testTime = new Date('2024-01-13T10:00:00Z'); // Saturday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(true);
    });

    it('should correctly evaluate custom schedule (Tuesday 2 PM)', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'custom_schedule',
        startTime: '13:00',
        endTime: '15:00',
        daysOfWeek: JSON.stringify(['tuesday', 'thursday']),
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // Tuesday, 2:00 PM UTC
      const testTime = new Date('2024-01-09T14:00:00Z'); // Tuesday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(true);
    });

    it('should correctly evaluate custom schedule (Wednesday - wrong day)', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'custom_schedule',
        startTime: '13:00',
        endTime: '15:00',
        daysOfWeek: JSON.stringify(['tuesday', 'thursday']),
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // Wednesday, 2:00 PM UTC (not in allowed days)
      const testTime = new Date('2024-01-10T14:00:00Z'); // Wednesday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(false);
    });

    it('should handle time ranges that cross midnight', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'custom_schedule',
        startTime: '22:00',
        endTime: '06:00',
        daysOfWeek: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        timezone: 'UTC',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // Monday, 11:00 PM UTC (within range)
      const testTime1 = new Date('2024-01-08T23:00:00Z');
      const result1 = await checkMfaTimeRestriction(1, testTime1);
      expect(result1).toBe(true);

      // Tuesday, 2:00 AM UTC (within range, after midnight)
      const testTime2 = new Date('2024-01-09T02:00:00Z');
      const result2 = await checkMfaTimeRestriction(1, testTime2);
      expect(result2).toBe(true);

      // Tuesday, 10:00 AM UTC (outside range)
      const testTime3 = new Date('2024-01-09T10:00:00Z');
      const result3 = await checkMfaTimeRestriction(1, testTime3);
      expect(result3).toBe(false);
    });

    it('should handle multiple restrictions (any match returns true)', async () => {
      const restrictions: MfaTimeRestriction[] = [
        {
          id: 1,
          userId: 1,
          restrictionType: 'business_hours',
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
          timezone: 'UTC',
          isActive: 1,
          description: null,
          createdBy: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: 1,
          restrictionType: 'custom_schedule',
          startTime: '20:00',
          endTime: '22:00',
          daysOfWeek: JSON.stringify(['saturday', 'sunday']),
          timezone: 'UTC',
          isActive: 1,
          description: null,
          createdBy: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockGetUserTimeRestrictions.mockResolvedValue(restrictions);

      // Saturday, 9:00 PM UTC (matches second restriction)
      const testTime = new Date('2024-01-13T21:00:00Z'); // Saturday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(true);
    });

    it('should handle timezone conversions (Pacific Time)', async () => {
      const restriction: MfaTimeRestriction = {
        id: 1,
        userId: 1,
        restrictionType: 'business_hours',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        timezone: 'America/Vancouver',
        isActive: 1,
        description: null,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetUserTimeRestrictions.mockResolvedValue([restriction]);

      // 5:00 PM UTC = 9:00 AM Pacific (PST, UTC-8)
      // This is during business hours in Pacific timezone
      const testTime = new Date('2024-01-08T17:00:00Z'); // Monday
      const result = await checkMfaTimeRestriction(1, testTime);
      expect(result).toBe(true);
    });
  });
});
