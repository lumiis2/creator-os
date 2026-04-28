"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Film } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RetentionChart } from "@/components/dashboard/retention-chart";
import { useAnalytics } from "@/hooks/use-analytics";

function formatHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0.0";
  return value.toFixed(1);
}

export default function VideoDetailPage() {
  const params = useParams<{ id: string }>();
  const videoId = params?.id;
  const { videos } = useAnalytics({ platform: "youtube", videoId });

  if (videos.isLoading) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">Loading video analytics...</div>;
  }

  if (videos.error || !videos.data?.selectedVideo) {
    return (
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Failed to load video details.
        </div>
      </div>
    );
  }

  const selectedVideo = videos.data.selectedVideo;
  const kpis = [
    { label: "Views", value: selectedVideo.views.toLocaleString(), sub: "Video-level" },
    { label: "Watch Time (Hours)", value: formatHours(selectedVideo.watchTimeHours), sub: "Accumulated" },
    { label: "Subs Gained", value: selectedVideo.subsGained.toLocaleString(), sub: "Estimated" },
    { label: "Likes", value: selectedVideo.likes.toLocaleString(), sub: "Engagement" },
  ];

  return (
    <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="h-24 w-40 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            {selectedVideo.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedVideo.thumbnailUrl} alt={selectedVideo.title ?? "Video thumbnail"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500">
                <Film className="h-5 w-5" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">{selectedVideo.title ?? "Untitled video"}</h1>
            <p className="mt-1 text-sm text-zinc-400">Video ID: {selectedVideo.id}</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <KpiCard items={kpis} />

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-100">Audience Retention Curve</h2>
        <RetentionChart data={selectedVideo.retentionCurve} />
      </section>
    </div>
  );
}
