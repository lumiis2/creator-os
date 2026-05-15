import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.access_token && profile) {
      navigate(profile.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [session?.access_token, profile, navigate]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate('/onboarding');
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/onboarding' },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
    setLoading(false);
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to continue your CreatorOS onboarding.</p>
        <form onSubmit={handleLogin}>
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
            <button type="submit" disabled={loading || !email || !password}>
              Sign in
            </button>
            <button type="button" className="secondary" onClick={handleGoogleLogin} disabled={loading}>
              Continue with Google
            </button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
