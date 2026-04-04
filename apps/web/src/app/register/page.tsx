"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const registerRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!registerRes.ok) {
      const body = await registerRes.json().catch(() => ({ error: "Registration failed" }));
      setLoading(false);
      setError(body.error ?? "Registration failed");
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);
    if (!signInResult || signInResult.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <div className="w-full rounded-xl border border-border bg-card p-6">
        <h1 className="mb-1 text-2xl font-semibold text-white">Create account</h1>
        <p className="mb-6 text-sm text-muted">Start using CreatorOS locally.</p>

        <form onSubmit={onSubmit} className="space-y-4">
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
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted">
          Already have an account? <Link href="/login" className="text-white underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
