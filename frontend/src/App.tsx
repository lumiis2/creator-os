import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import './styles.css';

type AuthMeResponse = {
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

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authMeResult, setAuthMeResult] = useState<AuthMeResponse | null>(null);
  const [authMeError, setAuthMeError] = useState<string | null>(null);
  const [authMeLoading, setAuthMeLoading] = useState(false);

  const loggedIn = useMemo(() => Boolean(session?.access_token), [session]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setError(error.message);
        return;
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSignup() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setSession(data.session);
      setUser(data.user ?? data.session?.user ?? null);
      setMessage('Signup feito. Se email confirmation estiver ativo, confirme a conta antes de logar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setSession(data.session);
      setUser(data.user ?? data.session?.user ?? null);
      setMessage('Login feito com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setMessage('Redirecionando para Google...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setAuthMeResult(null);
    setAuthMeError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setMessage('Logout feito com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestAuthMe() {
    setAuthMeLoading(true);
    setAuthMeError(null);
    setAuthMeResult(null);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error('No Supabase session token available. Faça login primeiro.');
      }

      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = (await response.json()) as AuthMeResponse | { detail?: string };
      if (!response.ok) {
        const detail = 'detail' in payload ? payload.detail : undefined;
        throw new Error(detail || `Request failed with status ${response.status}`);
      }

      setAuthMeResult(payload as AuthMeResponse);
    } catch (err) {
      setAuthMeError(err instanceof Error ? err.message : 'auth/me failed');
    } finally {
      setAuthMeLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card hero">
        <div>
          <p className="eyebrow">CreatorOS</p>
          <h1>Supabase Auth testbed</h1>
          <p className="muted">
            Minimal frontend to test Google login, email/password auth, logout, session restore,
            and backend verification via <code>/auth/me</code>.
          </p>
        </div>
        <div className={`status ${loggedIn ? 'status-ok' : 'status-warn'}`}>
          {loggedIn ? 'Logged in' : 'Logged out'}
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Auth actions</h2>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </label>

          <div className="actions">
            <button onClick={handleSignup} disabled={loading || !email || !password}>
              Signup
            </button>
            <button onClick={handleLogin} disabled={loading || !email || !password}>
              Login
            </button>
            <button onClick={handleGoogleLogin} disabled={loading} className="secondary">
              Login with Google
            </button>
            <button onClick={handleLogout} disabled={loading || !loggedIn} className="ghost">
              Logout
            </button>
          </div>

          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="card">
          <h2>Session</h2>
          <div className="meta">
            <div><span>User</span><strong>{user?.email ?? 'none'}</strong></div>
            <div><span>User ID</span><strong>{user?.id ?? '—'}</strong></div>
            <div><span>Access token</span><strong>{session?.access_token ? 'present' : 'missing'}</strong></div>
          </div>
          <button onClick={handleTestAuthMe} disabled={!loggedIn || authMeLoading}>
            {authMeLoading ? 'Testing /auth/me...' : 'Test /auth/me'}
          </button>
          {authMeError ? <p className="error">{authMeError}</p> : null}
        </div>
      </section>

      <section className="card">
        <h2>Backend /auth/me response</h2>
        <pre>{authMeResult ? pretty(authMeResult) : 'No response yet.'}</pre>
      </section>

      <section className="card">
        <h2>Current session JSON</h2>
        <pre>{session ? pretty(session) : 'No session loaded.'}</pre>
      </section>
    </main>
  );
}
