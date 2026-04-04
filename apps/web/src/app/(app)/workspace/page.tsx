"use client";

import { useState } from "react";
import { ItemCard } from "@/components/workspace/item-card";
import { NewItemForm } from "@/components/workspace/new-item-form";
import { StageFilter } from "@/components/workspace/stage-filter";
import { useWorkspace } from "@/hooks/use-workspace";

export default function WorkspacePage() {
  const [stage, setStage] = useState("");
  const { itemsQuery, createMutation, updateMutation, deleteMutation } = useWorkspace(stage);
  const items = itemsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <NewItemForm onSubmit={(payload) => createMutation.mutate(payload)} loading={createMutation.isPending} />
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <strong className="text-sm">Items</strong>
          <StageFilter value={stage} onChange={setStage} />
        </div>
        {itemsQuery.error && <div className="text-xs text-red-400">Failed to load workspace items.</div>}
        {itemsQuery.isLoading && <div className="text-xs text-muted">Loading...</div>}
        <div className="space-y-3">
          {items.map((item: (typeof items)[number]) => (
            <ItemCard
              key={item.id}
              item={item}
              onStageChange={(next) => updateMutation.mutate({ id: item.id, stage: next })}
              onDelete={() => deleteMutation.mutate(item.id)}
            />
          ))}
          {!items.length && !itemsQuery.isLoading && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted">No workspace items yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
