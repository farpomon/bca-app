/**
 * Report Data Snapshot Utilities
 * Manages data snapshots for consistent report generation
 */

import { DataSnapshot } from '@shared/reportTypes';

/**
 * Create a simple hash of data for change detection
 */
function createDataHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Create a snapshot of current dashboard data
 */
export function createDataSnapshot(dashboardData: any): DataSnapshot {
  return {
    timestamp: new Date(),
    dataHash: createDataHash(dashboardData),
    portfolioMetrics: dashboardData?.overview || {},
    buildingData: dashboardData?.buildingComparison || [],
    uniformatData: dashboardData?.categoryCostBreakdown || [],
    capitalForecastData: dashboardData?.capitalForecast || [],
  };
}

/**
 * Check if data has changed since snapshot
 */
export function hasDataChanged(snapshot: DataSnapshot, currentData: any): boolean {
  const currentHash = createDataHash(currentData);
  return snapshot.dataHash !== currentHash;
}

/**
 * Get snapshot age in minutes
 */
export function getSnapshotAge(snapshot: DataSnapshot): number {
  const now = new Date();
  const diff = now.getTime() - snapshot.timestamp.getTime();
  return Math.floor(diff / 60000); // Convert to minutes
}

/**
 * Format snapshot timestamp for display
 */
export function formatSnapshotTimestamp(snapshot: DataSnapshot): string {
  return snapshot.timestamp.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Store snapshot in session storage for persistence across page reloads
 */
export function saveSnapshotToSession(key: string, snapshot: DataSnapshot): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      ...snapshot,
      timestamp: snapshot.timestamp.toISOString(),
    }));
  } catch (error) {
    console.warn('Failed to save snapshot to session storage:', error);
  }
}

/**
 * Load snapshot from session storage
 */
export function loadSnapshotFromSession(key: string): DataSnapshot | null {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp),
    };
  } catch (error) {
    console.warn('Failed to load snapshot from session storage:', error);
    return null;
  }
}

/**
 * Clear snapshot from session storage
 */
export function clearSnapshotFromSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear snapshot from session storage:', error);
  }
}

/**
 * Validate snapshot data completeness
 */
export function validateSnapshot(snapshot: DataSnapshot): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!snapshot.portfolioMetrics || Object.keys(snapshot.portfolioMetrics).length === 0) {
    missingFields.push('portfolioMetrics');
  }
  
  if (!snapshot.buildingData || snapshot.buildingData.length === 0) {
    missingFields.push('buildingData');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
