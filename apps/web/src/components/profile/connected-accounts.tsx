"use client";

import { useState } from "react";
import type { Connection } from "@/hooks/use-profile";

interface ConnectedAccountsProps {
  connections: Connection[];
}

export function ConnectedAccounts({ connections }: ConnectedAccountsProps) {
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncingMeta, setSyncingMeta] = useState(false);

  const connectYouTube = async () => {
    setConnectError(null);
    try {
      const res = await fetch("/api/profile/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to start YouTube connection");
      }

      const body = await res.json() as { connectUrl?: string };
      if (!body.connectUrl) {
        throw new Error("Missing connect URL for YouTube connection");
      }

      window.location.href = body.connectUrl;
    } catch {
      setConnectError("Failed to start YouTube connection");
    }
  };

  const connectMeta = async () => {
    setConnectError(null);
    try {
      window.location.href = "/api/connect/meta";
    } catch {
      setConnectError("Failed to start Meta connection");
    }
  };

  const syncMetaNow = async () => {
    setConnectError(null);
    setSyncingMeta(true);
    try {
      const res = await fetch("/api/sync/meta", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Meta sync failed");
      }
      window.location.reload();
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Meta sync failed");
    } finally {
      setSyncingMeta(false);
    }
  };

  const hasMetaConnection = connections.some((c) => c.platform === "facebook" || c.platform === "instagram");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Connected accounts</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={connectMeta}
            className="rounded-md border border-border px-2 py-1 text-xs"
          >
            Connect Instagram & Facebook
          </button>
          <button
            onClick={connectYouTube}
            className="rounded-md border border-border px-2 py-1 text-xs"
          >
            Connect YouTube
          </button>
          <button
            onClick={syncMetaNow}
            disabled={!hasMetaConnection || syncingMeta}
            className="rounded-md border border-border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingMeta ? "Syncing..." : "Sync Meta"}
          </button>
        </div>
      </div>
      {connectError && <p className="text-xs text-red-400">{connectError}</p>}
      {connections.length ? (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div>
                <div className="font-medium capitalize">{conn.platform}</div>
                {conn.displayName && <div className="text-xs text-muted">{conn.displayName}</div>}
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
