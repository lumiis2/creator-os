"use client";

import { ItemCard } from "@/components/workspace/item-card";
import type { WorkspaceItem } from "@/hooks/use-workspace";

export const KANBAN_STAGES = ["idea", "draft", "script", "editing", "scheduled", "published"] as const;
export type KanbanStage = (typeof KANBAN_STAGES)[number];

const STAGE_LABELS: Record<KanbanStage, string> = {
  idea: "Ideas",
  draft: "Drafts",
  script: "Scripts",
  editing: "Editing",
  scheduled: "Scheduled",
  published: "Published",
};

interface KanbanBoardProps {
  items: WorkspaceItem[];
  draggedId: string | null;
  overStage: KanbanStage | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverStage: (stage: KanbanStage | null) => void;
  onDropToStage: (stage: KanbanStage) => Promise<void> | void;
  onCardClick: (item: WorkspaceItem) => void;
}

export function KanbanBoard({
  items,
  draggedId,
  overStage,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDropToStage,
  onCardClick,
}: KanbanBoardProps) {
  const grouped: Record<KanbanStage, WorkspaceItem[]> = {
    idea: [],
    draft: [],
    script: [],
    editing: [],
    scheduled: [],
    published: [],
  };

  for (const item of items) {
    const stage = (item.stage as KanbanStage) || "idea";
    if (KANBAN_STAGES.includes(stage)) {
      grouped[stage].push(item);
    } else {
      grouped.idea.push(item);
    }
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="grid min-w-[1320px] grid-cols-6 gap-3">
        {KANBAN_STAGES.map((stage) => {
          const stageItems = grouped[stage];
          const isOver = overStage === stage;

          return (
            <section
              key={stage}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOverStage(stage);
              }}
              onDragLeave={() => onDragOverStage(null)}
              onDrop={async (event) => {
                event.preventDefault();
                await onDropToStage(stage);
              }}
              className={[
                "rounded-xl border bg-card/60 p-3 transition-colors duration-200",
                isOver ? "border-primary bg-primary/10" : "border-border",
              ].join(" ")}
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
                <span className="rounded-md bg-background px-2 py-0.5 text-[11px] text-muted">{stageItems.length}</span>
              </header>

              <div className="space-y-2">
                {stageItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.id);
                      onDragStart(item.id);
                    }}
                    onDragEnd={onDragEnd}
                    className="transition-transform duration-200"
                  >
                    <ItemCard item={item} dragging={draggedId === item.id} onClick={() => onCardClick(item)} />
                  </div>
                ))}

                {!stageItems.length ? (
                  <div className="rounded-md border border-dashed border-border px-2 py-4 text-center text-xs text-muted">
                    Drop here
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
