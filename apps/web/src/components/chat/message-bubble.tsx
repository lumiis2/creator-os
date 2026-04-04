import type { ChatMessage } from "@/hooks/use-chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`rounded-lg border ${isAssistant ? "border-border bg-card" : "border-primary/30 bg-background"} p-3`}>
      <div className="text-[10px] uppercase tracking-wide text-muted">{message.role}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{message.content}</div>
    </div>
  );
}
