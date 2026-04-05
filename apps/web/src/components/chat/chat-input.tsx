import type { KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
  sendDisabled: boolean;
  busy?: boolean;
}

export function ChatInput({ value, onChange, onSend, onRegenerate, canRegenerate, sendDisabled, busy = false }: ChatInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sendDisabled) onSend();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask CreatorOS..."
        rows={1}
        className="max-h-36 min-h-[44px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none ring-primary/30 placeholder:text-muted focus:ring"
      />
      <button
        onClick={onSend}
        disabled={sendDisabled}
        className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send
      </button>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Enter to send • Shift+Enter for new line</span>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={!canRegenerate || busy}
          className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          Regenerate last
        </button>
      </div>
    </div>
  );
}
