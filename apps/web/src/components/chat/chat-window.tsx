import type { ChatMessage } from "@/hooks/use-chat";
import { MessageBubble } from "@/components/chat/message-bubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  streamingText: string;
  loading: boolean;
}

export function ChatWindow({ messages, streamingText, loading }: ChatWindowProps) {
  return (
    <div className="min-h-[360px] space-y-3 rounded-lg border border-border bg-card p-4">
      {loading && <div className="text-xs text-muted">Loading...</div>}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {streamingText && (
        <div className="rounded-lg border border-primary/30 bg-background p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted">assistant</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{streamingText}</div>
        </div>
      )}
      {!messages.length && !streamingText && !loading && (
        <div className="text-sm text-muted">Start the conversation.</div>
      )}
    </div>
  );
}
