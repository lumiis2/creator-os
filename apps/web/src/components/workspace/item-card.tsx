import type { WorkspaceItem } from "@/hooks/use-workspace";

const stages = ["idea", "draft", "script", "scheduled", "published"];

interface ItemCardProps {
  item: WorkspaceItem;
  onStageChange: (stage: string) => void;
  onDelete: () => void;
}

export function ItemCard({ item, onStageChange, onDelete }: ItemCardProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <strong className="text-sm">{item.title}</strong>
        <select
          value={item.stage}
          onChange={(event) => onStageChange(event.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {stages.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>
      {item.body && <p className="text-sm text-muted">{item.body}</p>}
      <button onClick={onDelete} className="text-xs text-muted hover:text-white">
        Archive
      </button>
    </div>
  );
}
