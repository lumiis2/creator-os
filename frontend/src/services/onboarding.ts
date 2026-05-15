import { apiFetch } from './api';

export type OnboardingState = {
  id: string;
  profile_id: string;
  version: string;
  current_step: string | null;
  completed_steps: string[];
  payload: Record<string, unknown>;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at: string | null;
  last_saved_at: string;
  metadata: Record<string, unknown>;
};

export type OnboardingUpdate = {
  version?: string;
  current_step?: string | null;
  completed_steps?: string[];
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type OnboardingCompleteResponse = {
  state: OnboardingState;
};

export type SocialConnection = {
  id: string;
  profile_id: string;
  platform: string;
  platform_handle: string;
  platform_user_id: string;
  status: string;
  platform_account_type?: string | null;
  platform_account_name?: string | null;
  platform_account_url?: string | null;
  platform_metadata: Record<string, unknown>;
  niche_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OnboardingSocialStatus = {
  profile_id: string;
  connections: SocialConnection[];
};

export async function fetchOnboardingState(): Promise<OnboardingState> {
  return apiFetch<OnboardingState>('/onboarding/state');
}

export async function patchOnboardingState(payload: OnboardingUpdate): Promise<OnboardingState> {
  return apiFetch<OnboardingState>('/onboarding/state', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function completeOnboarding(): Promise<OnboardingCompleteResponse> {
  return apiFetch<OnboardingCompleteResponse>('/onboarding/complete', {
    method: 'POST',
  });
}

export async function fetchOnboardingSocialStatus(): Promise<OnboardingSocialStatus> {
  return apiFetch<OnboardingSocialStatus>('/onboarding/social/status');
}
