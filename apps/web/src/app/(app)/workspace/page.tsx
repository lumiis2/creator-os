"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KanbanBoard, type KanbanStage } from "@/components/workspace/kanban-board";
import { NewItemForm } from "@/components/workspace/new-item-form";
import { useWorkspace } from "@/hooks/use-workspace";

export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const { itemsQuery, createMutation, updateMutation, deleteMutation } = useWorkspace("");
  const items = itemsQuery.data?.data ?? [];

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<KanbanStage | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorBody, setEditorBody] = useState("");
  const [editorStage, setEditorStage] = useState<KanbanStage>("idea");

  const editingItem = editingItemId ? items.find((item) => item.id === editingItemId) ?? null : null;

  const openEditor = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    setEditingItemId(item.id);
    setEditorTitle(item.title);
    setEditorBody(item.body ?? "");
    setEditorStage((item.stage as KanbanStage) ?? "idea");
  };

  const closeEditor = () => {
    setEditingItemId(null);
  };

  const moveToStage = async (id: string, stage: KanbanStage) => {
    const queryKey = ["workspace", ""] as const;
    const previous = queryClient.getQueryData<{ data: typeof items }>(queryKey);

    queryClient.setQueryData<{ data: typeof items }>(queryKey, (current) => {
      if (!current) return current;
      return {
        ...current,
        data: current.data.map((item) => (item.id === id ? { ...item, stage } : item)),
      };
    });

    try {
      await updateMutation.mutateAsync({ id, stage });
    } catch {
      if (previous) queryClient.setQueryData(queryKey, previous);
    }
  };

  const saveEditor = async () => {
    if (!editingItemId || !editorTitle.trim()) return;
    await updateMutation.mutateAsync({
      id: editingItemId,
      title: editorTitle.trim(),
      body: editorBody.trim() || "",
      stage: editorStage,
    });
    closeEditor();
  };

  const deleteFromEditor = async () => {
    if (!editingItemId) return;
    await deleteMutation.mutateAsync(editingItemId);
    closeEditor();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <NewItemForm onSubmit={(payload) => createMutation.mutate({ ...payload, stage: "idea" })} loading={createMutation.isPending} />

      {itemsQuery.error && <div className="text-xs text-red-400">Failed to load workspace items.</div>}
      {itemsQuery.isLoading ? (
        <div className="text-xs text-muted">Loading board...</div>
      ) : (
        <KanbanBoard
          items={items}
          draggedId={draggedId}
          overStage={overStage}
          onDragStart={(id) => setDraggedId(id)}
          onDragEnd={() => {
            setDraggedId(null);
            setOverStage(null);
          }}
          onDragOverStage={setOverStage}
          onDropToStage={async (stage) => {
            if (!draggedId) return;
            await moveToStage(draggedId, stage);
            setDraggedId(null);
            setOverStage(null);
          }}
          onCardClick={(item) => openEditor(item.id)}
        />
      )}

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Edit content</h2>
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
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />

              <textarea
                value={editorBody}
                onChange={(event) => setEditorBody(event.target.value)}
                placeholder="Body"
                rows={8}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />

              <label className="grid gap-1 text-xs text-muted">
                Stage
                <select
                  value={editorStage}
                  onChange={(event) => setEditorStage(event.target.value as KanbanStage)}
                  className="rounded-md border border-border bg-background px-2 py-2 text-sm text-white"
                >
                  <option value="idea">idea</option>
                  <option value="draft">draft</option>
                  <option value="script">script</option>
                  <option value="ready">ready</option>
                  <option value="scheduled">scheduled</option>
                  <option value="published">published</option>
                </select>
              </label>

              <div className="mt-2 flex items-center justify-between">
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
        </div>
      ) : null}
    </div>
  );
}
