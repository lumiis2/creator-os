import { useState } from "react";

interface NewItemFormProps {
  onSubmit: (payload: { title: string; body?: string }) => void;
  loading: boolean;
}

export function NewItemForm({ onSubmit, loading }: NewItemFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Add idea</h2>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Notes"
        rows={3}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        onClick={() => {
          if (!title.trim()) return;
          onSubmit({ title, body });
          setTitle("");
          setBody("");
        }}
        disabled={!title.trim() || loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Saving..." : "Add to workspace"}
      </button>
    </div>
  );
}
