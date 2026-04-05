"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/use-chat";
import { MessageBubble } from "@/components/chat/message-bubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  streamingText: string;
  loading: boolean;
}

export function ChatWindow({ messages, streamingText, loading }: ChatWindowProps) {
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
      {streamingText && (
        <div className="flex justify-start">
          <div className="max-w-[88%] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-white">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">CreatorOS Agent</div>
            <div className="whitespace-pre-wrap leading-6">{streamingText}</div>
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
