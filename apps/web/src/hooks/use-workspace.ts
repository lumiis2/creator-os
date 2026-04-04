import { useMutation, useQuery } from "@tanstack/react-query";

export interface WorkspaceItem {
  id: string;
  title: string;
  body: string | null;
  stage: string;
  source: string;
  createdAt: string;
}

async function fetchWorkspace(stage: string) {
  const url = stage ? `/api/workspace/items?stage=${encodeURIComponent(stage)}` : "/api/workspace/items";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load workspace");
  return res.json() as Promise<{ data: WorkspaceItem[] }>;
}

async function createItem(payload: { title: string; body?: string; stage?: string }) {
  const res = await fetch("/api/workspace/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create item");
  return res.json();
}

async function updateItem(payload: { id: string; stage?: string; title?: string; body?: string }) {
  const res = await fetch(`/api/workspace/items/${payload.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return res.json();
}

async function deleteItem(id: string) {
  const res = await fetch(`/api/workspace/items/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete item");
  return res.json();
}

export function useWorkspace(stage: string) {
  const itemsQuery = useQuery({
    queryKey: ["workspace", stage],
    queryFn: () => fetchWorkspace(stage),
  });

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => itemsQuery.refetch(),
  });

  const updateMutation = useMutation({
    mutationFn: updateItem,
    onSuccess: () => itemsQuery.refetch(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => itemsQuery.refetch(),
  });

  return {
    itemsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
