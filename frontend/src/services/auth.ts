import { apiFetch } from './api';

export type AuthMeResponse = {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    auth_provider: string;
    created_at: string;
    updated_at: string;
  };
  profile: {
    id: string;
    user_id: string;
    niche: string | null;
    creator_goal: string | null;
    posting_frequency_goal: number | null;
    ai_behavior: Record<string, unknown>;
    ai_settings: Record<string, unknown>;
    global_strategy: string | null;
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
  };
};

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>('/auth/me');
}
