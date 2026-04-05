"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatSession } from "@/hooks/use-chat";

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, currentTitle: string | null) => void;
  onDelete: (id: string) => void;
}

export function SessionList({ sessions, activeSessionId, onSelect, onNew, onRename, onDelete }: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingId]);

  const startEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setDraftTitle(session.title ?? "");
  };

  const cancelEdit = () => {
    if (saving) return;
    setEditingId(null);
    setDraftTitle("");
  };

  const saveEdit = async (sessionId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onRename(sessionId, draftTitle.trim() || null);
      setEditingId(null);
      setDraftTitle("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-border bg-card/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <button className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background" onClick={onNew}>
          + New
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
              session.id === activeSessionId
                ? "border-primary bg-primary/10 text-white"
                : "border-border text-muted hover:bg-background hover:text-white"
            }`}
          >
            <button type="button" onClick={() => onSelect(session.id)} className="w-full text-left">
              <div className="truncate font-medium" onDoubleClick={() => startEdit(session)} title="Double-click to rename">
                {editingId === session.id ? (
                  <input
                    ref={inputRef}
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onBlur={() => saveEdit(session.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveEdit(session.id);
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEdit();
                      }
                    }}
                    className="w-full rounded-md border border-primary/40 bg-background px-2 py-1 text-sm text-white outline-none ring-primary/30 focus:ring"
                    placeholder="Untitled"
                    disabled={saving}
                  />
                ) : (
                  <span>{session.title ?? "Untitled"}</span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-muted">{new Date(session.createdAt).toLocaleDateString()}</div>
            </button>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-500/40 text-red-300 opacity-75 transition hover:bg-red-500/10 hover:opacity-100 group-hover:opacity-100"
                onClick={() => onDelete(session.id)}
                title="Delete conversation"
                aria-label="Delete conversation"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {!sessions.length && <p className="px-2 py-3 text-xs text-muted">No sessions yet. Start a new chat.</p>}
      </div>
    </aside>
  );
}
