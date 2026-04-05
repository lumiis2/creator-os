"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function mapLoginError(errorCode: string | null): string | null {
  if (!errorCode) return null;

  switch (errorCode) {
    case "AccessDenied":
      return "Access denied during sign-in. Please try again, or use email login.";
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
      return "Google sign-in failed. Check your Google OAuth credentials and allowed redirect URI.";
    case "account_setup_failed":
      return "We could not finish account setup. Please try again in a few seconds.";
    case "database_unavailable":
      return "Database is currently unavailable. Start your local Postgres service and try again.";
    case "Configuration":
      return "Authentication is misconfigured. Please verify environment variables.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginError = mapLoginError(searchParams.get("error"));
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onGoogle = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);
    if (!result || result.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <section className="w-full rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold text-white">CreatorOS</h1>
        <p className="mt-1 text-sm text-muted">Manage and grow your creator workflow</p>
        <p className="mt-4 text-xs text-muted">No integrations required to get started</p>

        {loginError && (
          <div className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {loginError}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onGoogle}
            className="w-full rounded-md border border-border px-4 py-2 text-sm font-semibold text-white hover:bg-background"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => setEmailMode(true)}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Login with Email
          </button>
        </div>

        {emailMode && (
          <form onSubmit={onEmailSubmit} className="mt-4 space-y-3">
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-muted">
          No account? <Link href="/register" className="text-white underline">Create one</Link>
        </p>
      </section>
    </main>
  );
}
