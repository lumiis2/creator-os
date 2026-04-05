import type { KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled) onSend();
    }
  };

  return (
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
        disabled={disabled}
        className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send
      </button>
    </div>
  );
}
