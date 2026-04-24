"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KanbanBoard, KANBAN_STAGES, type KanbanStage } from "@/components/workspace/kanban-board";
import { NotepadPanel } from "@/components/workspace/notepad-panel";
import { NewItemForm } from "@/components/workspace/new-item-form";
import { useWorkspace } from "@/hooks/use-workspace";

type WorkspaceCalendarItem = {
  id: string;
  title: string;
  body: string | null;
  stage: string;
  source: string;
  platform?: string | null;
  tags?: string[] | null;
  editingStartAt?: string | null;
  editingDueAt?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  sortOrder?: number | null;
  createdAt: string;
};

type DragSource = "kanban" | "calendar" | null;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(0, 0, 0, 0);
  return end;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toInputDateTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputDateTime(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function tomorrowAt(hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function calendarDateFor(item: WorkspaceCalendarItem): string | null {
  if (item.stage === "editing") return item.editingDueAt ?? null;
  if (item.stage === "scheduled") return item.scheduledAt ?? null;
  if (item.stage === "published") return item.publishedAt ?? null;
  return null;
}

function calendarEventStyle(stage: string): string {
  if (stage === "editing") return "border-blue-500/40 bg-blue-500/20 text-blue-100";
  if (stage === "scheduled") return "border-purple-500/40 bg-purple-500/20 text-purple-100";
  return "border-green-500/50 bg-green-500/20 text-green-100";
}

function calendarEventLabel(stage: string): string {
  if (stage === "editing") return "Editing due";
  if (stage === "scheduled") return "Scheduled";
  return "Published";
}

export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const { itemsQuery, createMutation, updateMutation, deleteMutation } = useWorkspace("");
  const items = (itemsQuery.data?.data ?? []) as WorkspaceCalendarItem[];

  const createWorkspaceCard = async (payload: { title: string; body?: string; stage?: string }) => {
    await createMutation.mutateAsync({ ...payload, stage: payload.stage ?? "idea" });
  };

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<DragSource>(null);
  const [overStage, setOverStage] = useState<KanbanStage | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorBody, setEditorBody] = useState("");
  const [editorStage, setEditorStage] = useState<KanbanStage>("idea");
  const [editorPlatform, setEditorPlatform] = useState("");
  const [editorEditingStartAt, setEditorEditingStartAt] = useState("");
  const [editorEditingDueAt, setEditorEditingDueAt] = useState("");
  const [editorScheduledAt, setEditorScheduledAt] = useState("");
  const [editorPublishedAt, setEditorPublishedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const dayCount = Math.floor((gridEnd.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    return Array.from({ length: dayCount }).map((_, index) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + index);
      return d;
    });
  }, [calendarMonth]);

  const weekHeaderDays = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, []);

  const editingItem = editingItemId ? items.find((item) => item.id === editingItemId) ?? null : null;

  const calendarItems = useMemo(
    () => items.filter((item) => item.stage === "editing" || item.stage === "scheduled" || item.stage === "published"),
    [items],
  );

  const calendarByDay = useMemo(() => {
    const map = new Map<string, WorkspaceCalendarItem[]>();

    for (const item of calendarItems) {
      const date = calendarDateFor(item);
      if (!date) continue;
      const key = toDayKey(new Date(date));
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }

    for (const [key, entries] of map.entries()) {
      entries.sort((a, b) => {
        const aDate = calendarDateFor(a);
        const bDate = calendarDateFor(b);
        if (!aDate || !bDate) return 0;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
      map.set(key, entries);
    }

    return map;
  }, [calendarItems]);

  const openEditor = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    setEditingItemId(item.id);
    setEditorTitle(item.title);
    setEditorBody(item.body ?? "");
    setEditorStage((item.stage as KanbanStage) ?? "idea");
    setEditorPlatform(item.platform ?? "");
    setEditorEditingStartAt(toInputDateTime(item.editingStartAt));
    setEditorEditingDueAt(toInputDateTime(item.editingDueAt));
    setEditorScheduledAt(toInputDateTime(item.scheduledAt));
    setEditorPublishedAt(toInputDateTime(item.publishedAt));
  };

  const closeEditor = () => {
    setEditingItemId(null);
  };

  const optimisticPatch = async (id: string, patch: Partial<WorkspaceCalendarItem>) => {
    setError(null);
    const queryKey = ["workspace", ""] as const;
    const previous = queryClient.getQueryData<{ data: WorkspaceCalendarItem[] }>(queryKey);

    queryClient.setQueryData<{ data: WorkspaceCalendarItem[] }>(queryKey, (current) => {
      if (!current) return current;
      return {
        ...current,
        data: current.data.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      };
    });

    try {
      await updateMutation.mutateAsync({ id, ...(patch as any) });
    } catch (err) {
      if (previous) queryClient.setQueryData(queryKey, previous);
      setError((err as Error).message ?? "Failed to update item");
      throw err;
    }
  };

  const buildStagePatch = (item: WorkspaceCalendarItem, nextStage: KanbanStage): Partial<WorkspaceCalendarItem> => {
    if (nextStage === "editing") {
      return {
        stage: "editing",
        editingDueAt: item.editingDueAt ?? tomorrowAt(18),
        editingStartAt: item.editingStartAt ?? null,
      };
    }

    if (nextStage === "scheduled") {
      return {
        stage: "scheduled",
        scheduledAt: item.scheduledAt ?? tomorrowAt(9),
      };
    }

    if (nextStage === "published") {
      return {
        stage: "published",
        publishedAt: item.publishedAt ?? new Date().toISOString(),
      };
    }

    return {
      stage: nextStage,
      editingStartAt: null,
      editingDueAt: null,
      scheduledAt: null,
      publishedAt: null,
    };
  };

  const moveToStage = async (id: string, stage: KanbanStage) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    const patch = buildStagePatch(current, stage);
    await optimisticPatch(id, patch);
  };

  const saveEditor = async () => {
    if (!editingItemId || !editorTitle.trim()) return;

    const patch: Partial<WorkspaceCalendarItem> = {
      title: editorTitle.trim(),
      body: editorBody.trim() || null,
      stage: editorStage,
      platform: editorPlatform.trim() || null,
      editingStartAt: fromInputDateTime(editorEditingStartAt),
      editingDueAt: fromInputDateTime(editorEditingDueAt),
      scheduledAt: fromInputDateTime(editorScheduledAt),
      publishedAt: fromInputDateTime(editorPublishedAt),
    };

    if (editorStage === "editing" && !patch.editingDueAt) patch.editingDueAt = tomorrowAt(18);
    if (editorStage === "scheduled" && !patch.scheduledAt) patch.scheduledAt = tomorrowAt(9);
    if (editorStage === "published" && !patch.publishedAt) patch.publishedAt = new Date().toISOString();
    if (editorStage === "idea" || editorStage === "draft" || editorStage === "script") {
      patch.editingStartAt = null;
      patch.editingDueAt = null;
      patch.scheduledAt = null;
      patch.publishedAt = null;
    }

    await optimisticPatch(editingItemId, patch);
    closeEditor();
  };

  const deleteFromEditor = async () => {
    if (!editingItemId) return;
    await deleteMutation.mutateAsync(editingItemId);
    closeEditor();
  };

  const dropToCalendarDay = async (day: Date) => {
    if (!draggedId) return;
    const item = items.find((entry) => entry.id === draggedId);
    if (!item) return;

    const next = new Date(day);
    const currentDate = calendarDateFor(item);
    if (currentDate) {
      const sourceDate = new Date(currentDate);
      next.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);
    } else {
      next.setHours(9, 0, 0, 0);
    }

    const iso = next.toISOString();

    if (dragSource === "kanban") {
      if (item.stage === "editing") {
        await optimisticPatch(item.id, { editingDueAt: iso });
      } else if (item.stage === "scheduled") {
        await optimisticPatch(item.id, { scheduledAt: iso });
      } else {
        setError("Only editing and scheduled items can be dropped to calendar.");
      }
    } else if (dragSource === "calendar") {
      if (item.stage === "editing") await optimisticPatch(item.id, { editingDueAt: iso });
      if (item.stage === "scheduled") await optimisticPatch(item.id, { scheduledAt: iso });
      if (item.stage === "published") await optimisticPatch(item.id, { publishedAt: iso });
    }

    setDraggedId(null);
    setDragSource(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <div className="grid gap-4 xl:grid-cols-2">
        <NewItemForm onSubmit={(payload) => createMutation.mutate({ ...payload, stage: "idea" })} loading={createMutation.isPending} />
        <NotepadPanel onCreateItem={createWorkspaceCard} />
      </div>

      {itemsQuery.error && <div className="text-xs text-red-400">Failed to load workspace items.</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}
      {itemsQuery.isLoading ? (
        <div className="text-xs text-muted">Loading board...</div>
      ) : (
        <div className="space-y-5">
          <KanbanBoard
            items={items}
            draggedId={draggedId}
            overStage={overStage}
            onDragStart={(id) => {
              setDraggedId(id);
              setDragSource("kanban");
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setOverStage(null);
              setDragSource(null);
            }}
            onDragOverStage={setOverStage}
            onDropToStage={async (stage) => {
              if (!draggedId) return;
              await moveToStage(draggedId, stage);
              setDraggedId(null);
              setOverStage(null);
              setDragSource(null);
            }}
            onCardClick={(item) => openEditor(item.id)}
          />

          <section className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Monthly calendar</h2>
                <span className="text-xs text-muted">Editing (due), Scheduled, Published</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calendarMonth);
                    next.setMonth(next.getMonth() - 1);
                    setCalendarMonth(startOfMonth(next));
                  }}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                >
                  ←
                </button>
                <div className="min-w-[140px] text-center text-sm font-medium">
                  {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calendarMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCalendarMonth(startOfMonth(next));
                  }}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(startOfMonth(new Date()))}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                >
                  Today
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2">
              {weekHeaderDays.map((day) => (
                <div key={toDayKey(day)} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthGridDays.map((day) => {
                const key = toDayKey(day);
                const dayItems = calendarByDay.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                const isToday = key === toDayKey(new Date());

                return (
                  <div
                    key={key}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={async (event) => {
                      event.preventDefault();
                      await dropToCalendarDay(day);
                    }}
                    className={`min-h-40 rounded-lg border p-2 ${
                      isCurrentMonth ? "border-border bg-background" : "border-border/60 bg-background/40"
                    }`}
                  >
                    <div className={`mb-2 border-b border-border pb-1 text-xs font-semibold ${isCurrentMonth ? "text-muted" : "text-muted/60"}`}>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                          isToday ? "bg-primary text-white" : ""
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
                      {dayItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          draggable
                          onDragStart={() => {
                            setDraggedId(item.id);
                            setDragSource("calendar");
                          }}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDragSource(null);
                          }}
                          onClick={() => openEditor(item.id)}
                          className={`w-full rounded-md border px-2 py-1 text-left text-[11px] ${calendarEventStyle(item.stage)}`}
                        >
                          <div className="font-semibold">{item.stage === "published" ? "✓ " : ""}{item.title}</div>
                          <div className="opacity-90">{calendarEventLabel(item.stage)}</div>
                        </button>
                      ))}

                      {!dayItems.length ? <div className="text-[11px] text-muted/70">—</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit content</h2>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-background"
                onClick={closeEditor}
              >
                Close
              </button>
            </div>

            <div className="grid gap-4">
              <input
                value={editorTitle}
                onChange={(event) => setEditorTitle(event.target.value)}
                placeholder="Title"
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
              />

              <textarea
                value={editorBody}
                onChange={(event) => setEditorBody(event.target.value)}
                placeholder="Body"
                rows={12}
                className="h-[300px] min-h-[260px] w-full resize-y rounded-md border border-border bg-background px-3 py-3 text-[15px] leading-7"
              />

              <label className="grid gap-1 text-xs text-muted">
                Stage
                <select
                  value={editorStage}
                  onChange={(event) => setEditorStage(event.target.value as KanbanStage)}
                  className="rounded-md border border-border bg-background px-2 py-2 text-sm text-white"
                >
                  {KANBAN_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted">
                  Platform
                  <input
                    value={editorPlatform}
                    onChange={(event) => setEditorPlatform(event.target.value)}
                    placeholder="youtube / instagram / tiktok"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="grid gap-1 text-xs text-muted">
                  Editing start (optional)
                  <input
                    type="datetime-local"
                    value={editorEditingStartAt}
                    onChange={(event) => setEditorEditingStartAt(event.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="grid gap-1 text-xs text-muted">
                  Editing due
                  <input
                    type="datetime-local"
                    value={editorEditingDueAt}
                    onChange={(event) => setEditorEditingDueAt(event.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="grid gap-1 text-xs text-muted">
                  Scheduled at
                  <input
                    type="datetime-local"
                    value={editorScheduledAt}
                    onChange={(event) => setEditorScheduledAt(event.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="grid gap-1 text-xs text-muted md:col-span-2">
                  Published at
                  <input
                    type="datetime-local"
                    value={editorPublishedAt}
                    onChange={(event) => setEditorPublishedAt(event.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={deleteFromEditor}
                className="rounded-md border border-red-500/50 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
              >
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-md border border-border px-3 py-2 text-xs hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditor}
                  disabled={updateMutation.isPending}
                  className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
