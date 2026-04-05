"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatWindow } from "@/components/chat/chat-window";
import { SessionList } from "@/components/chat/session-list";
import { useChat } from "@/hooks/use-chat";

export default function ChatPage() {
  const {
    sessions,
    activeSession,
    messages,
    sessionsQuery,
    messagesQuery,
    createMutation,
    renameSessionById,
    deleteSessionById,
    sendMessage,
    regenerateLastResponse,
    isThinking,
    isSearching,
    isStreaming,
    statusLabel,
    streamingText,
    streamError,
    draft,
    setDraft,
    setActiveSessionId,
  } = useChat();

  return (
    <div className="grid h-[calc(100vh-120px)] gap-4 lg:grid-cols-[280px_1fr]">
      <SessionList
        sessions={sessions}
        activeSessionId={activeSession?.id ?? null}
        onSelect={setActiveSessionId}
        onNew={() => createMutation.mutate()}
        onRename={renameSessionById}
        onDelete={async (id) => {
          const confirmed = window.confirm("Delete this conversation? This action cannot be undone.");
          if (!confirmed) return;
          try {
            await deleteSessionById(id);
          } catch {
            // noop
          }
        }}
      />

      <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card/60">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-white">{activeSession?.title ?? "New conversation"}</h1>
            <p className="text-xs text-muted">CreatorOS Agent</p>
          </div>
          {messagesQuery.isLoading && <span className="text-xs text-muted">Loading…</span>}
          {messagesQuery.error && <span className="text-xs text-red-400">Failed to load</span>}
        </header>

        {streamError && <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">{streamError}</div>}

        <div className="min-h-0 flex-1 p-4">
          <ChatWindow
            messages={messages}
            streamingText={streamingText}
            loading={messagesQuery.isLoading}
            isThinking={isThinking}
            isSearching={isSearching}
            isStreaming={isStreaming}
            statusLabel={statusLabel}
          />
        </div>

        <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
          <ChatInput
            value={draft}
            onChange={setDraft}
            onSend={sendMessage}
            onRegenerate={regenerateLastResponse}
            canRegenerate={messages.some((m) => m.role === "user")}
            sendDisabled={!draft.trim() || isThinking || isSearching || isStreaming}
            busy={isThinking || isSearching || isStreaming}
          />
        </div>
      </section>
    </div>
  );
}
