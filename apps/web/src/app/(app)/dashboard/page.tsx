"use client";

import { useMemo, useState } from "react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { InstagramInsightsGrid } from "@/components/dashboard/instagram-insights-grid";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PlatformSelector } from "@/components/dashboard/platform-selector";
import { VideoTable } from "@/components/dashboard/video-table";
import { ViewsChart } from "@/components/dashboard/views-chart";
import { type DashboardPlatform, useAnalytics } from "@/hooks/use-analytics";

function metricValue(metrics: Array<{ name: string; value: number | null }> | undefined, name: string): number {
  return metrics?.find((m) => m.name === name)?.value ?? 0;
}

export default function DashboardPage() {
  const [platform, setPlatform] = useState<DashboardPlatform>("youtube");
  const { snapshot, trends, videos, instagramInsights, syncMutation } = useAnalytics(platform);

  const kpis = useMemo(() => {
    const data = snapshot.data?.data;
    if (!data) return [];

    if (platform === "instagram") {
      const seven = instagramInsights.data?.windows.last7d;
      const thirty = instagramInsights.data?.windows.last30d;

      return [
        {
          label: "Views (7d)",
          value: (instagramInsights.data?.mapped?.views7d ?? data.views7d).toLocaleString(),
          sub: data.views7dChange === null ? "No comparison" : `${data.views7dChange.toFixed(1)}% vs prev`,
        },
        {
          label: "Views (30d)",
          value: (instagramInsights.data?.mapped?.views30d ?? data.totalViews).toLocaleString(),
          sub: "Instagram account-level",
        },
        {
          label: "Reach (7d)",
          value: metricValue(seven, "reach").toLocaleString(),
          sub: `Reach (30d): ${metricValue(thirty, "reach").toLocaleString()}`,
        },
        {
          label: "Profile Views (7d)",
          value: metricValue(seven, "profile_views").toLocaleString(),
          sub: `Profile Views (30d): ${metricValue(thirty, "profile_views").toLocaleString()}`,
        },
      ];
    }

    return [
      {
        label: "Views (7d)",
        value: data.views7d.toLocaleString(),
        sub: data.views7dChange === null ? "No comparison" : `${data.views7dChange.toFixed(1)}% vs prev`,
      },
      {
        label: "Subscribers",
        value: data.subscribers.toLocaleString(),
        sub: `+${data.subsGained7d} this week`,
      },
      {
        label: "Engagement",
        value: data.avgEngagementRate7d ? `${data.avgEngagementRate7d.toFixed(1)}%` : "-",
        sub: data.platform,
      },
      {
        label: "Total Views",
        value: data.totalViews.toLocaleString(),
        sub: `As of ${data.dataAsOf}`,
      },
    ];
  }, [snapshot.data?.data, platform, instagramInsights.data]);

  if (snapshot.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <PlatformSelector value={platform} onChange={setPlatform} />
        </div>
        <button
          onClick={() => syncMutation.mutate(platform)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          {syncMutation.isPending ? "Syncing..." : `Sync ${platform}`}
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

      {kpis.length ? (
        <KpiCard items={kpis} />
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted">No analytics yet. Trigger a sync.</div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">
          {platform === "instagram" ? "Instagram insights trend" : platform === "combined" ? "Omnichannel trend" : "Views trend"}
        </h2>
        {trends.isLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-card" />
        ) : (
          <ViewsChart data={trends.data?.data ?? []} mode={platform} />
        )}
      </div>

      {platform === "instagram" && (
        <InstagramInsightsGrid
          last7d={instagramInsights.data?.windows.last7d ?? []}
          last30d={instagramInsights.data?.windows.last30d ?? []}
        />
      )}

      {platform === "youtube" && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Top videos</h2>
          {videos.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-card" />
          ) : (
            <VideoTable videos={videos.data?.data ?? []} />
          )}
        </div>
      )}
    </div>
  );
}
