import type { ChatSession } from "@/hooks/use-chat";

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function SessionList({ sessions, activeSessionId, onSelect, onNew }: SessionListProps) {
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
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
              session.id === activeSessionId
                ? "border-primary bg-primary/10 text-white"
                : "border-border text-muted hover:bg-background hover:text-white"
            }`}
          >
            <div className="truncate font-medium">{session.title ?? "Untitled"}</div>
            <div className="mt-1 text-[11px] text-muted">{new Date(session.createdAt).toLocaleDateString()}</div>
          </button>
        ))}
        {!sessions.length && <p className="px-2 py-3 text-xs text-muted">No sessions yet. Start a new chat.</p>}
      </div>
    </aside>
  );
}
