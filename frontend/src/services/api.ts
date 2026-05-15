import { supabase } from '../lib/supabase';

type ApiError = {
  error?: string;
  detail?: string;
};

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(options.headers || {});
  if (options.body) {
    headers.set('content-type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as T | ApiError;
  if (!response.ok) {
    const message = payload.error || payload.detail || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}
