"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/use-chat";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MarkdownContent } from "@/components/chat/markdown-content";

interface ChatWindowProps {
  messages: ChatMessage[];
  streamingText: string;
  loading: boolean;
  isThinking: boolean;
  isSearching: boolean;
  isStreaming: boolean;
  statusLabel: string | null;
}

function AnimatedDots() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:240ms]" />
    </span>
  );
}

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent" />;
}

function StatusMessage({ label, searching }: { label: string; searching?: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-white">
        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">CreatorOS Agent</div>
        <div className="flex items-center gap-2 text-sm text-muted">
          {searching ? <Spinner /> : null}
          <span>{label}</span>
          {!searching ? <AnimatedDots /> : null}
        </div>
      </div>
    </div>
  );
}

export function ChatWindow({ messages, streamingText, loading, isThinking, isSearching, isStreaming, statusLabel }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-y-auto rounded-xl border border-border bg-background p-4">
      {loading && <div className="mb-2 text-xs text-muted">Loading…</div>}
      <div className="space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isSearching && <StatusMessage label={statusLabel ?? "Searching the web..."} searching />}
      {isThinking && !isSearching && <StatusMessage label={statusLabel ?? "Thinking..."} />}
      {isStreaming && !streamingText && <StatusMessage label={statusLabel ?? "Generating response..."} />}

      {streamingText && (
        <div className="flex justify-start">
          <div className="max-w-[88%] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-white">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">CreatorOS Agent</div>
            <MarkdownContent content={streamingText} />
            {isStreaming && (
              <div className="mt-2 text-xs text-muted">
                <span>Typing</span>
                <AnimatedDots />
              </div>
            )}
          </div>
        </div>
      )}
      {!messages.length && !streamingText && !loading && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Start the conversation. Ask for content ideas, hooks, or a growth plan.
        </div>
      )}
      </div>
      <div ref={endRef} />
    </div>
  );
}
