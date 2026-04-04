import type { VideosResponse } from "@/hooks/use-analytics";

interface VideoTableProps {
  videos: VideosResponse["data"];
}

export function VideoTable({ videos }: VideoTableProps) {
  if (!videos.length) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">No videos yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-background text-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Title</th>
            <th className="px-4 py-2 text-right font-medium">Views</th>
            <th className="px-4 py-2 text-right font-medium">Likes</th>
            <th className="px-4 py-2 text-right font-medium">Comments</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video) => (
            <tr key={video.id} className="border-t border-border">
              <td className="px-4 py-2">{video.title ?? "Untitled"}</td>
              <td className="px-4 py-2 text-right">{video.views?.toLocaleString() ?? "-"}</td>
              <td className="px-4 py-2 text-right">{video.likes?.toLocaleString() ?? "-"}</td>
              <td className="px-4 py-2 text-right">{video.comments?.toLocaleString() ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
