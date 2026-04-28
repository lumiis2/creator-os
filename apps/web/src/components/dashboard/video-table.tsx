"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, Clock3 } from "lucide-react";
import type { VideosResponse } from "@/hooks/use-analytics";

interface VideoTableProps {
  videos: VideosResponse["data"];
}

function formatPublishedAt(value: string | null): string {
  if (!value) return "Publish date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Publish date unavailable";
  return `Published ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function isRecentUpload(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= 48 * 60 * 60 * 1000;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function VideoTable({ videos }: VideoTableProps) {
  const router = useRouter();

  if (!videos.length) {
    return <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">No videos yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/70 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
      <table className="w-full text-sm">
        <thead className="bg-zinc-950/80 text-zinc-400">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Title</th>
            <th className="px-4 py-2 text-right font-medium">Views</th>
            <th className="px-4 py-2 text-right font-medium">Avg View Duration</th>
            <th className="px-4 py-2 text-right font-medium">Likes</th>
            <th className="px-4 py-2 text-right font-medium">Comments</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video) => {
            const recent = isRecentUpload(video.publishedAt);

            return (
              <tr
                key={video.id}
                className="cursor-pointer border-t border-zinc-800 transition hover:bg-zinc-800/40"
                onClick={() => router.push(`/dashboard/video/${video.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-20 overflow-hidden rounded-md border border-zinc-700 bg-zinc-950">
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnailUrl} alt={video.title ?? "Video thumbnail"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">No thumb</div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-medium text-zinc-100">{video.title ?? "Untitled"}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                        <CalendarClock className="h-3 w-3" />
                        <span>{formatPublishedAt(video.publishedAt)}</span>
                      </div>
                    </div>

                    {recent ? (
                      <span className="rounded-full border border-blue-400/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                        Recent Upload
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{video.views?.toLocaleString() ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5 text-zinc-200">
                    <Clock3 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{formatDuration(video.averageViewDurationSeconds)}</span>
                    <span className="text-zinc-400">({video.averageViewPercentage.toFixed(1)}%)</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{video.likes?.toLocaleString() ?? "-"}</td>
                <td className="px-4 py-3 text-right">{video.comments?.toLocaleString() ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
