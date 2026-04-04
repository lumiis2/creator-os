interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask CreatorOS..."
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        onClick={onSend}
        disabled={disabled}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Send
      </button>
    </div>
  );
}
