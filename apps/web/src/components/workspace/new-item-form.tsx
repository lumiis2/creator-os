import { useState } from "react";
import { useEffect, useRef } from "react";

interface NewItemFormProps {
  onSubmit: (payload: { title: string; body?: string }) => void;
  loading: boolean;
}

export function NewItemForm({ onSubmit, loading }: NewItemFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.style.height = "0px";
    bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`;
  }, [body]);

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
        ref={bodyRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Notes"
        rows={6}
        className="max-h-[50vh] min-h-[140px] w-full resize-none overflow-y-auto rounded-md border border-border bg-background px-3 py-3 text-sm leading-6"
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
