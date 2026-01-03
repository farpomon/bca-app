import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import type { UnitSystem } from '../../../shared/units';

interface UnitContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;
  isLoading: boolean;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

interface UnitProviderProps {
  children: ReactNode;
}

export function UnitProvider({ children }: UnitProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');
  const [isLoading, setIsLoading] = useState(true);

  const updatePreferenceMutation = trpc.settings.updateUnitPreference.useMutation();

  // Initialize from user preference or localStorage
  useEffect(() => {
    if (isAuthenticated && user) {
      // Use user's saved preference
      const userPref = (user as any).unitPreference as UnitSystem | undefined;
      if (userPref) {
        setUnitSystemState(userPref);
      }
      setIsLoading(false);
    } else {
      // Fall back to localStorage for non-authenticated users
      const stored = localStorage.getItem('unitPreference') as UnitSystem | null;
      if (stored && (stored === 'metric' || stored === 'imperial')) {
        setUnitSystemState(stored);
      }
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const setUnitSystem = useCallback((system: UnitSystem) => {
    setUnitSystemState(system);
    localStorage.setItem('unitPreference', system);
    
    // Save to server if authenticated
    if (isAuthenticated) {
      updatePreferenceMutation.mutate({ unitPreference: system });
    }
  }, [isAuthenticated, updatePreferenceMutation]);

  const toggleUnitSystem = useCallback(() => {
    const newSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    setUnitSystem(newSystem);
  }, [unitSystem, setUnitSystem]);

  return (
    <UnitContext.Provider value={{ unitSystem, setUnitSystem, toggleUnitSystem, isLoading }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnits(): UnitContextType {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnits must be used within a UnitProvider');
  }
  return context;
}

// Re-export utility functions for convenience
export { 
  formatArea, 
  formatLength, 
  formatTemperature, 
  formatVolume,
  formatWeight,
  formatCostPerArea,
  convertArea,
  convertLength,
  convertTemperature,
  convertVolume,
  convertWeight,
  convertCostPerArea,
  getAreaUnit,
  getLengthUnit,
  getTemperatureUnit,
  getVolumeUnit,
  getWeightUnit,
  getCostPerAreaUnit,
  getUnitSystemLabel,
  MEASUREMENT_TYPES,
} from '../../../shared/units';

export type { UnitSystem } from '../../../shared/units';
