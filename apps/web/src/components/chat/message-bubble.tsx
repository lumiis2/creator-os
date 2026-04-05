import type { ChatMessage } from "@/hooks/use-chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isAssistant
            ? "border border-border bg-card text-white"
            : "border border-primary/50 bg-primary/15 text-white"
        }`}
      >
        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">{isAssistant ? "CreatorOS Agent" : "You"}</div>
        <div className="whitespace-pre-wrap leading-6">{message.content}</div>
        <div className="mt-2 text-[10px] text-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  );
}
