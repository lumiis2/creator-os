import type { WorkspaceItem } from "@/hooks/use-workspace";

type WorkspaceStage = "idea" | "draft" | "script" | "editing" | "scheduled" | "published";

interface ItemCardProps {
  item: WorkspaceItem;
  dragging?: boolean;
  onClick?: () => void;
}

const STAGE_STYLE: Record<WorkspaceStage, string> = {
  idea: "border-zinc-600/60 bg-zinc-700/30 text-zinc-200",
  draft: "border-yellow-500/40 bg-yellow-500/15 text-yellow-200",
  script: "border-orange-500/40 bg-orange-500/15 text-orange-200",
  editing: "border-blue-500/40 bg-blue-500/15 text-blue-200",
  scheduled: "border-purple-500/40 bg-purple-500/15 text-purple-200",
  published: "border-green-500/40 bg-green-500/15 text-green-200",
};

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function ItemCard({ item, dragging = false, onClick }: ItemCardProps) {
  const stage = ((item.stage as WorkspaceStage) || "idea") as WorkspaceStage;
  const preview = (item.body ?? "").trim();
  const shortPreview = preview.length > 140 ? `${preview.slice(0, 140)}…` : preview;
  const tags = (item as WorkspaceItem & { tags?: string[] | null }).tags ?? [];
  const platform = (item as WorkspaceItem & { platform?: string | null }).platform;
  const editingDueAt = (item as WorkspaceItem & { editingDueAt?: string | null }).editingDueAt;
  const scheduledAt = (item as WorkspaceItem & { scheduledAt?: string | null }).scheduledAt;
  const publishedAt = (item as WorkspaceItem & { publishedAt?: string | null }).publishedAt;

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
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-white">{item.title}</div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${STAGE_STYLE[stage]}`}>
          {stage === "published" ? "✓ Published" : stage}
        </span>
      </div>

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

      {(platform || editingDueAt || scheduledAt || publishedAt) ? (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
          {platform ? (
            <span className="rounded-md bg-background px-2 py-1">
              Platform: <strong className="text-white/90">{platform}</strong>
            </span>
          ) : null}
          {editingDueAt ? (
            <span className="rounded-md bg-background px-2 py-1">
              Editing due: <strong className="text-white/90">{formatDateTime(editingDueAt)}</strong>
            </span>
          ) : null}
          {scheduledAt ? (
            <span className="rounded-md bg-background px-2 py-1">
              Scheduled: <strong className="text-white/90">{formatDateTime(scheduledAt)}</strong>
            </span>
          ) : null}
          {publishedAt ? (
            <span className="rounded-md bg-green-900/20 px-2 py-1 text-green-200">
              Published: <strong className="text-green-100">{formatDateTime(publishedAt)}</strong>
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
