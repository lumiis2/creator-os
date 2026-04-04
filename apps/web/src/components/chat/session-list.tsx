import type { ChatSession } from "@/hooks/use-chat";

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function SessionList({ sessions, activeSessionId, onSelect, onNew }: SessionListProps) {
  return (
    <aside className="space-y-4 border-r border-border pr-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sessions</h2>
        <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={onNew}>
          + New
        </button>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
              session.id === activeSessionId ? "border-primary bg-card" : "border-border"
            }`}
          >
            {session.title ?? "Untitled"}
          </button>
        ))}
        {!sessions.length && <p className="text-xs text-muted">No sessions yet.</p>}
      </div>
    </aside>
  );
}
