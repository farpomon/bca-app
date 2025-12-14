/**
 * useOfflineAssessment Hook
 * 
 * React hook for managing offline assessment creation and editing.
 * Automatically saves to IndexedDB when offline and syncs when online.
 */

import { useState, useCallback, useEffect } from "react";
import { useOfflineSync } from "./useOfflineSync";
import {
  saveOfflineAssessment,
  getAssessmentsByProject,
  type OfflineAssessment,
} from "@/lib/offlineStorage";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export interface AssessmentFormData {
  projectId: number;
  assetId: number;
  componentCode: string | null;
  componentName: string | null;
  componentLocation: string | null;
  condition: string | null;
  status: string | null;
  observations: string | null;
  recommendations: string | null;
  estimatedServiceLife: number | null;
  reviewYear: number | null;
  lastTimeAction: number | null;
  estimatedRepairCost: number | null;
  replacementValue: number | null;
  actionYear: number | null;
}

export interface UseOfflineAssessmentOptions {
  projectId: number;
  onSuccess?: (assessmentId: string | number) => void;
  onError?: (error: Error) => void;
}

export interface UseOfflineAssessmentReturn {
  saveAssessment: (data: AssessmentFormData) => Promise<string | number>;
  isSaving: boolean;
  error: Error | null;
  offlineAssessments: OfflineAssessment[];
  isOnline: boolean;
}

/**
 * Hook for managing offline-capable assessments
 */
export function useOfflineAssessment({
  projectId,
  onSuccess,
  onError,
}: UseOfflineAssessmentOptions): UseOfflineAssessmentReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offlineAssessments, setOfflineAssessments] = useState<OfflineAssessment[]>([]);
  
  const { isOnline } = useOfflineSync();
  
  // Use real tRPC mutation for online sync
  const createAssessmentMutation = trpc.assessments.upsert.useMutation();

  /**
   * Load offline assessments for this project
   */
  const loadOfflineAssessments = useCallback(async () => {
    try {
      const assessments = await getAssessmentsByProject(projectId);
      setOfflineAssessments(assessments);
    } catch (err) {
      console.error("Failed to load offline assessments:", err);
    }
  }, [projectId]);

  /**
   * Save assessment (online or offline)
   */
  const saveAssessment = useCallback(
    async (data: AssessmentFormData): Promise<string | number> => {
      setIsSaving(true);
      setError(null);

      try {
        if (isOnline) {
          // Save online via tRPC
          try {
            // Convert null to undefined for tRPC
            const tRPCData = {
              projectId: data.projectId,
              assetId: data.assetId,
              componentCode: data.componentCode ?? undefined,
              componentName: data.componentName ?? undefined,
              componentLocation: data.componentLocation ?? undefined,
              condition: (data.condition ?? undefined) as "good" | "fair" | "poor" | "not_assessed" | undefined,
              status: (data.status ?? undefined) as "initial" | "active" | "completed" | undefined,
              observations: data.observations ?? undefined,
              recommendations: data.recommendations ?? undefined,
              remainingUsefulLife: data.estimatedServiceLife ?? undefined,
              reviewYear: data.reviewYear ?? undefined,
              lastTimeAction: data.lastTimeAction ?? undefined,
              estimatedRepairCost: data.estimatedRepairCost ?? undefined,
              replacementValue: data.replacementValue ?? undefined,
              actionYear: data.actionYear ?? undefined,
            };
            const result = await createAssessmentMutation.mutateAsync(tRPCData);
            
            toast.success("Assessment saved successfully");
            
            if (onSuccess && result && 'id' in result) {
              onSuccess((result as any).id);
            }
            
            return result && 'id' in result ? (result as any).id : "temp_id";
          } catch (onlineError) {
            // If online save fails, fall back to offline
            console.warn("Online save failed, falling back to offline:", onlineError);
            const offlineId = await saveOfflineAssessment(data);
            
            toast.warning(
              "Saved offline. Will sync when backend is ready.",
              { duration: 4000 }
            );
            
            await loadOfflineAssessments();
            
            if (onSuccess) {
              onSuccess(offlineId);
            }
            
            return offlineId;
          }
        } else {
          // Save offline to IndexedDB
          const offlineId = await saveOfflineAssessment(data);
          
          toast.success(
            "Saved offline. Will sync when connection returns.",
            { duration: 4000 }
          );
          
          // Reload offline assessments
          await loadOfflineAssessments();
          
          if (onSuccess) {
            onSuccess(offlineId);
          }
          
          return offlineId;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to save assessment");
        setError(error);
        
        toast.error(
          isOnline
            ? "Failed to save assessment"
            : "Failed to save offline. Please try again."
        );
        
        if (onError) {
          onError(error);
        }
        
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [isOnline, createAssessmentMutation, onSuccess, onError, loadOfflineAssessments]
  );

  /**
   * Load offline assessments on mount and when project changes
   */
  useEffect(() => {
    loadOfflineAssessments();
  }, [loadOfflineAssessments]);

  /**
   * Reload offline assessments when coming back online
   */
  useEffect(() => {
    if (isOnline) {
      loadOfflineAssessments();
    }
  }, [isOnline, loadOfflineAssessments]);

  return {
    saveAssessment,
    isSaving,
    error,
    offlineAssessments,
    isOnline,
  };
}

/**
 * Hook for auto-saving assessment drafts
 */
export function useAssessmentAutoSave(
  data: Partial<AssessmentFormData>,
  options: {
    enabled?: boolean;
    interval?: number; // milliseconds
    onSave?: () => void;
  } = {}
) {
  const { enabled = true, interval = 30000, onSave } = options; // Default: 30 seconds
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const saveTimer = setInterval(async () => {
      try {
        // Save to localStorage as draft
        const draftKey = `assessment_draft_${data.projectId}_${data.assetId}`;
        localStorage.setItem(draftKey, JSON.stringify({
          ...data,
          savedAt: Date.now(),
        }));
        
        setLastSaved(Date.now());
        
        if (onSave) {
          onSave();
        }
      } catch (err) {
        console.error("Failed to auto-save draft:", err);
      }
    }, interval);

    return () => clearInterval(saveTimer);
  }, [data, enabled, interval, onSave]);

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback((): Partial<AssessmentFormData> | null => {
    try {
      const draftKey = `assessment_draft_${data.projectId}_${data.assetId}`;
      const saved = localStorage.getItem(draftKey);
      
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error("Failed to load draft:", err);
    }
    
    return null;
  }, [data.projectId, data.assetId]);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    try {
      const draftKey = `assessment_draft_${data.projectId}_${data.assetId}`;
      localStorage.removeItem(draftKey);
      setLastSaved(null);
    } catch (err) {
      console.error("Failed to clear draft:", err);
    }
  }, [data.projectId, data.assetId]);

  return {
    lastSaved,
    loadDraft,
    clearDraft,
  };
}
