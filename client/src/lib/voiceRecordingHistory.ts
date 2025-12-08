/**
 * Voice Recording History Management
 * 
 * Manages local storage of voice transcriptions for reuse
 */

export interface VoiceRecording {
  id: string;
  text: string;
  timestamp: number;
  duration?: number; // in seconds
  context?: string; // e.g., "Assessment", "Project Notes", "Observations"
  preview: string; // First 100 chars for display
}

const STORAGE_KEY = "bca_voice_recordings";
const MAX_RECORDINGS = 50;

/**
 * Get all voice recordings from localStorage
 */
export function getRecordings(): VoiceRecording[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const recordings = JSON.parse(stored) as VoiceRecording[];
    // Sort by timestamp descending (newest first)
    return recordings.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error loading voice recordings:", error);
    return [];
  }
}

/**
 * Save a new voice recording
 */
export function saveRecording(
  text: string,
  duration?: number,
  context?: string
): VoiceRecording {
  const recording: VoiceRecording = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    timestamp: Date.now(),
    duration,
    context,
    preview: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
  };

  try {
    const recordings = getRecordings();
    recordings.unshift(recording); // Add to beginning
    
    // Enforce max limit
    const trimmed = recordings.slice(0, MAX_RECORDINGS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return recording;
  } catch (error) {
    console.error("Error saving voice recording:", error);
    throw error;
  }
}

/**
 * Delete a specific recording by ID
 */
export function deleteRecording(id: string): void {
  try {
    const recordings = getRecordings();
    const filtered = recordings.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting voice recording:", error);
    throw error;
  }
}

/**
 * Clear all voice recordings
 */
export function clearAllRecordings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing voice recordings:", error);
    throw error;
  }
}

/**
 * Search recordings by text content
 */
export function searchRecordings(query: string): VoiceRecording[] {
  const recordings = getRecordings();
  const lowerQuery = query.toLowerCase();
  
  return recordings.filter(r =>
    r.text.toLowerCase().includes(lowerQuery) ||
    (r.context && r.context.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get recordings by context
 */
export function getRecordingsByContext(context: string): VoiceRecording[] {
  const recordings = getRecordings();
  return recordings.filter(r => r.context === context);
}

/**
 * Get recording count
 */
export function getRecordingCount(): number {
  return getRecordings().length;
}

/**
 * Format timestamp for display
 */
export function formatRecordingTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format duration for display
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
