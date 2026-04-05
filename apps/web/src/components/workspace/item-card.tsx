import type { WorkspaceItem } from "@/hooks/use-workspace";

interface ItemCardProps {
  item: WorkspaceItem;
  dragging?: boolean;
  onClick?: () => void;
}

export function ItemCard({ item, dragging = false, onClick }: ItemCardProps) {
  const preview = (item.body ?? "").trim();
  const shortPreview = preview.length > 140 ? `${preview.slice(0, 140)}…` : preview;
  const tags = (item as WorkspaceItem & { tags?: string[] | null }).tags ?? [];
  const platform = (item as WorkspaceItem & { platform?: string | null }).platform;
  const scheduledAt = (item as WorkspaceItem & { scheduledAt?: string | null }).scheduledAt;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-lg border border-border bg-card p-3 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        dragging ? "opacity-60" : "opacity-100",
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-white">{item.title}</div>

      {shortPreview ? <p className="mt-1 line-clamp-3 text-xs text-muted">{shortPreview}</p> : null}

      {tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {(platform || scheduledAt) ? (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
          {platform ? (
            <span className="rounded-md bg-background px-2 py-1">
              Platform: <strong className="text-white/90">{platform}</strong>
            </span>
          ) : null}
          {scheduledAt ? (
            <span className="rounded-md bg-background px-2 py-1">
              Scheduled: <strong className="text-white/90">{new Date(scheduledAt).toLocaleString()}</strong>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 text-[10px] uppercase tracking-wide text-muted">{item.stage}</div>
    </button>
  );
}
