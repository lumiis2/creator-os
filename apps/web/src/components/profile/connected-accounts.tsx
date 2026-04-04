"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import type { Connection } from "@/hooks/use-profile";

interface ConnectedAccountsProps {
  connections: Connection[];
}

export function ConnectedAccounts({ connections }: ConnectedAccountsProps) {
  const [connectError, setConnectError] = useState<string | null>(null);

  const connectYouTube = async () => {
    setConnectError(null);
    try {
      await signIn(
        "google",
        { callbackUrl: "/profile" },
        {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      );
    } catch {
      setConnectError("Failed to start YouTube connection");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Connected accounts</h2>
        <button
          onClick={connectYouTube}
          className="rounded-md border border-border px-2 py-1 text-xs"
        >
          Connect YouTube
        </button>
      </div>
      {connectError && <p className="text-xs text-red-400">{connectError}</p>}
      {connections.length ? (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div>
                <div className="font-medium capitalize">{conn.platform}</div>
                <div className="text-xs text-muted">Status: {conn.status}</div>
              </div>
              <div className="text-xs text-muted">
                {conn.lastSyncedAt ? `Last synced ${new Date(conn.lastSyncedAt).toLocaleDateString()}` : "Not synced"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No connected accounts yet.</p>
      )}
    </div>
  );
}
