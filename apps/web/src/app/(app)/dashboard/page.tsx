"use client";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { VideoTable } from "@/components/dashboard/video-table";
import { ViewsChart } from "@/components/dashboard/views-chart";
import { useAnalytics } from "@/hooks/use-analytics";

export default function DashboardPage() {
  const { snapshot, trends, videos, syncMutation } = useAnalytics();

  if (snapshot.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button
          onClick={() => syncMutation.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          {syncMutation.isPending ? "Syncing..." : "Sync analytics"}
        </button>
      </div>

      {syncMutation.error && (
        <div className="text-sm text-red-400">
          {(syncMutation.error as Error).message || "Analytics sync failed."}
        </div>
      )}

      {syncMutation.isSuccess && !syncMutation.isPending && (
        <div className="text-sm text-green-400">Analytics synced successfully.</div>
      )}

      {snapshot.error && <div className="text-sm text-red-400">Failed to load snapshot.</div>}

      {snapshot.data?.data ? (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Views (7d)" value={snapshot.data.data.views7d.toLocaleString()} sub={snapshot.data.data.views7dChange === null ? "No comparison" : `${snapshot.data.data.views7dChange.toFixed(1)}% vs prev`} />
          <KpiCard label="Subscribers" value={snapshot.data.data.subscribers.toLocaleString()} sub={`+${snapshot.data.data.subsGained7d} this week`} />
          <KpiCard label="Engagement" value={snapshot.data.data.avgEngagementRate7d ? `${snapshot.data.data.avgEngagementRate7d.toFixed(1)}%` : "-"} sub={snapshot.data.data.platform} />
          <KpiCard label="Total Views" value={snapshot.data.data.totalViews.toLocaleString()} sub={`As of ${snapshot.data.data.dataAsOf}`} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted">No analytics yet. Trigger a sync.</div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Views trend</h2>
        {trends.isLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-card" />
        ) : (
          <ViewsChart data={trends.data?.data ?? []} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Top videos</h2>
        {videos.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-card" />
        ) : (
          <VideoTable videos={videos.data?.data ?? []} />
        )}
      </div>
    </div>
  );
}
