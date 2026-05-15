import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { completeOnboarding, fetchOnboardingState, patchOnboardingState } from '../services/onboarding';
import { useAuth } from './AuthContext';

export type OnboardingStepId = 'identity' | 'goals' | 'ai' | 'platforms' | 'finish';

export type OnboardingData = {
  niche: string;
  creator_goal: string;
  posting_frequency_goal: number | null;
  ai_behavior: Record<string, unknown>;
  ai_settings: Record<string, unknown>;
  global_strategy: string;
  platforms: string[];
};

type OnboardingContextValue = {
  loading: boolean;
  error: string | null;
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  data: OnboardingData;
  setCurrentStep: (step: OnboardingStepId) => void;
  updateData: (partial: Partial<OnboardingData>) => void;
  markStepComplete: (step: OnboardingStepId) => void;
  saveNow: () => Promise<void>;
  complete: () => Promise<void>;
};

const defaultData: OnboardingData = {
  niche: '',
  creator_goal: '',
  posting_frequency_goal: null,
  ai_behavior: {},
  ai_settings: {},
  global_strategy: '',
  platforms: [],
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStepId>('identity');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStepId[]>([]);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const debounceRef = useRef<number | null>(null);

  const hydrateFromBackend = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const state = await fetchOnboardingState();
      const payload = state.payload || {};
      setCurrentStep((state.current_step as OnboardingStepId) || 'identity');
      setCompletedSteps((state.completed_steps as OnboardingStepId[]) || []);
      setData({
        ...defaultData,
        ...payload,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    hydrateFromBackend();
  }, [hydrateFromBackend]);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const markStepComplete = useCallback((step: OnboardingStepId) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  }, []);

  const saveNow = useCallback(async () => {
    try {
      await patchOnboardingState({
        current_step: currentStep,
        completed_steps: completedSteps,
        payload: data as Record<string, unknown>,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save onboarding');
    }
  }, [currentStep, completedSteps, data]);

  useEffect(() => {
    if (!profile) return;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      saveNow();
    }, 800);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [profile, currentStep, completedSteps, data, saveNow]);

  const complete = useCallback(async () => {
    await completeOnboarding();
  }, []);

  const value = useMemo(
    () => ({
      loading,
      error,
      currentStep,
      completedSteps,
      data,
      setCurrentStep,
      updateData,
      markStepComplete,
      saveNow,
      complete,
    }),
    [loading, error, currentStep, completedSteps, data, updateData, markStepComplete, saveNow, complete],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
