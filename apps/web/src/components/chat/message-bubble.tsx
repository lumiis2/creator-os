"use client";

import type { ChatMessage } from "@/hooks/use-chat";
import { MarkdownContent } from "@/components/chat/markdown-content";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  const onCopy = async () => {
    await navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isAssistant
            ? "border border-border bg-card text-white"
            : "border border-primary/50 bg-primary/15 text-white"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted">
          <span>{isAssistant ? "CreatorOS Agent" : "You"}</span>
          <button
            type="button"
            onClick={onCopy}
            className="rounded border border-border px-1.5 py-0.5 text-[10px] normal-case transition hover:bg-background"
          >
            Copy
          </button>
        </div>
        {isAssistant ? (
          <MarkdownContent content={message.content} />
        ) : (
          <div className="whitespace-pre-wrap leading-6">{message.content}</div>
        )}
        <div className="mt-2 text-[10px] text-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  );
}
