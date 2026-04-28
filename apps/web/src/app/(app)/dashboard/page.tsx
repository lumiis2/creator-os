"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { AudiencePersonaWidget } from "@/components/dashboard/audience-persona-widget";
import { ConversionFunnelCard } from "@/components/dashboard/conversion-funnel-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { InstagramInsightsGrid } from "@/components/dashboard/instagram-insights-grid";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PlatformSelector } from "@/components/dashboard/platform-selector";
import { RetentionMilestoneCard } from "@/components/dashboard/retention-milestone-card";
import { TrafficSourceDonut } from "@/components/dashboard/traffic-source-donut";
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

  const studioData = useMemo(() => {
    const snapshotData = snapshot.data?.data;

    return {
      impressions: snapshotData?.impressions ?? 0,
      ctr: snapshotData?.reach?.ctr ?? 0,
      totalViews: snapshotData?.totalViews ?? 0,
      trafficSources: snapshotData?.trafficSources ?? [],
      demographics: snapshotData?.demographics ?? [],
      averageViewPercentage: snapshotData?.averageViewPercentage ?? 0,
      averageViewDuration: snapshotData?.retention?.averageViewDuration ?? 0,
    };
  }, [snapshot.data?.data]);

  if (snapshot.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] md:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-xs uppercase tracking-[0.14em] text-zinc-400">
            <Sparkles className="h-3.5 w-3.5" />
            Creator Intelligence Studio
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
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
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">No analytics yet. Trigger a sync.</div>
      )}

      {platform === "youtube" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ConversionFunnelCard
            impressions={studioData.impressions}
            ctr={studioData.ctr}
            totalViews={studioData.totalViews}
          />
          <RetentionMilestoneCard
            averageViewPercentage={studioData.averageViewPercentage}
            averageViewDuration={studioData.averageViewDuration}
          />
          <AudiencePersonaWidget demographics={studioData.demographics} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">
            {platform === "instagram" ? "Instagram insights trend" : platform === "combined" ? "Omnichannel trend" : "Views trend"}
          </h2>
          {trends.isLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-zinc-900" />
          ) : (
            <ViewsChart data={trends.data?.data ?? []} mode={platform} />
          )}
        </div>

        {platform === "youtube" && <TrafficSourceDonut data={studioData.trafficSources} />}
      </div>

      {platform === "instagram" && (
        <InstagramInsightsGrid
          last7d={instagramInsights.data?.windows.last7d ?? []}
          last30d={instagramInsights.data?.windows.last30d ?? []}
        />
      )}

      {platform === "youtube" && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">Top videos</h2>
          {videos.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-zinc-900" />
          ) : (
            <VideoTable videos={videos.data?.data ?? []} />
          )}
        </div>
      )}
    </div>
  );
}
