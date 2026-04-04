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
    sendMessage,
    streaming,
    streamingText,
    streamError,
    draft,
    setDraft,
    setActiveSessionId,
  } = useChat();

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <SessionList
        sessions={sessions}
        activeSessionId={activeSession?.id ?? null}
        onSelect={setActiveSessionId}
        onNew={() => createMutation.mutate()}
      />
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{activeSession?.title ?? "Chat"}</h1>
          {messagesQuery.isLoading && <span className="text-xs text-muted">Loading...</span>}
          {messagesQuery.error && <span className="text-xs text-red-400">Failed to load</span>}
        </header>
        {streamError && <div className="text-xs text-red-400">{streamError}</div>}
        <ChatWindow messages={messages} streamingText={streamingText} loading={messagesQuery.isLoading} />
        <ChatInput value={draft} onChange={setDraft} onSend={sendMessage} disabled={!draft.trim() || streaming} />
      </section>
    </div>
  );
}
