import { useState, useEffect, useCallback } from 'react';
import { getElectronAPI } from '@/lib/electron';
import type { Project, StoredValidation } from '@/lib/electron';

/**
 * Hook to track the count of unviewed (fresh) issue validations for a project.
 * Also provides a function to decrement the count when a validation is viewed.
 */
export function useUnviewedValidations(currentProject: Project | null) {
  const [count, setCount] = useState(0);

  // Load initial count
  useEffect(() => {
    if (!currentProject?.path) {
      setCount(0);
      return;
    }

    const loadCount = async () => {
      try {
        const api = getElectronAPI();
        if (api.github?.getValidations) {
          const result = await api.github.getValidations(currentProject.path);
          if (result.success && result.validations) {
            const unviewed = result.validations.filter((v: StoredValidation) => {
              if (v.viewedAt) return false;
              // Check if not stale (< 24 hours)
              const hoursSince =
                (Date.now() - new Date(v.validatedAt).getTime()) / (1000 * 60 * 60);
              return hoursSince <= 24;
            });
            setCount(unviewed.length);
          }
        }
      } catch (err) {
        console.error('[useUnviewedValidations] Failed to load count:', err);
      }
    };

    loadCount();

    // Subscribe to validation events to update count
    const api = getElectronAPI();
    if (api.github?.onValidationEvent) {
      const unsubscribe = api.github.onValidationEvent((event) => {
        if (event.projectPath === currentProject.path) {
          if (event.type === 'issue_validation_complete') {
            // New validation completed - increment count
            setCount((prev) => prev + 1);
          } else if (event.type === 'issue_validation_viewed') {
            // Validation was viewed - decrement count
            setCount((prev) => Math.max(0, prev - 1));
          }
        }
      });
      return () => unsubscribe();
    }
  }, [currentProject?.path]);

  // Function to decrement count when a validation is viewed
  const decrementCount = useCallback(() => {
    setCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Function to refresh count (e.g., after marking as viewed)
  const refreshCount = useCallback(async () => {
    if (!currentProject?.path) return;

    try {
      const api = getElectronAPI();
      if (api.github?.getValidations) {
        const result = await api.github.getValidations(currentProject.path);
        if (result.success && result.validations) {
          const unviewed = result.validations.filter((v: StoredValidation) => {
            if (v.viewedAt) return false;
            const hoursSince = (Date.now() - new Date(v.validatedAt).getTime()) / (1000 * 60 * 60);
            return hoursSince <= 24;
          });
          setCount(unviewed.length);
        }
      }
    } catch (err) {
      console.error('[useUnviewedValidations] Failed to refresh count:', err);
    }
  }, [currentProject?.path]);

  return { count, decrementCount, refreshCount };
}
