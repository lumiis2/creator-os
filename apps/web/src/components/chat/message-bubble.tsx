"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/hooks/use-chat";
import { MarkdownContent } from "@/components/chat/markdown-content";
import { saveAssistantMessageToWorkspace, type WorkspaceSaveStage } from "@/components/chat/save-to-workspace";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingStage, setSavingStage] = useState<WorkspaceSaveStage | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const onCopy = async () => {
    await navigator.clipboard.writeText(message.content);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!feedback || feedback.type !== "success") return;
    const timeout = setTimeout(() => setFeedback(null), 2200);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const onSaveToWorkspace = async (stage: WorkspaceSaveStage) => {
    if (savingStage) return;

    setSavingStage(stage);
    setFeedback(null);

    try {
      await saveAssistantMessageToWorkspace(message.content, stage);
      setFeedback({ type: "success", text: `Saved as ${stage}` });
      setMenuOpen(false);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setSavingStage(null);
    }
  };

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isAssistant
            ? "border border-border bg-card text-white"
            : "border border-primary/50 bg-primary/15 text-white"
        } group relative`}
      >
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted">
          <span>{isAssistant ? "CreatorOS Agent" : "You"}</span>
          <div className="relative flex items-center gap-1" ref={menuRef}>
            {isAssistant ? (
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                disabled={!!savingStage}
                className={`rounded border border-border px-1.5 py-0.5 text-[10px] normal-case transition hover:bg-background ${
                  menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                } ${savingStage ? "cursor-not-allowed opacity-50" : ""}`}
                aria-label="Save to workspace"
                title="Save to workspace"
              >
                <span className={`inline-block transition-transform ${menuOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onCopy}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] normal-case transition hover:bg-background"
            >
              Copy
            </button>

            {menuOpen && isAssistant ? (
              <div className="absolute right-0 top-6 z-20 w-36 rounded-md border border-border bg-card p-1 shadow-xl">
                <button
                  type="button"
                  disabled={!!savingStage}
                  onClick={() => onSaveToWorkspace("idea")}
                  className="block w-full rounded px-2 py-1.5 text-left text-[11px] normal-case text-white transition hover:bg-background disabled:opacity-50"
                >
                  Save as Idea
                </button>
                <button
                  type="button"
                  disabled={!!savingStage}
                  onClick={() => onSaveToWorkspace("draft")}
                  className="block w-full rounded px-2 py-1.5 text-left text-[11px] normal-case text-white transition hover:bg-background disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={!!savingStage}
                  onClick={() => onSaveToWorkspace("script")}
                  className="block w-full rounded px-2 py-1.5 text-left text-[11px] normal-case text-white transition hover:bg-background disabled:opacity-50"
                >
                  Save as Script
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {isAssistant ? (
          <MarkdownContent content={message.content} />
        ) : (
          <div className="whitespace-pre-wrap leading-6">{message.content}</div>
        )}
        {feedback ? (
          <div className={`mt-2 text-[10px] ${feedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {feedback.text}
          </div>
        ) : null}
        <div className="mt-2 text-[10px] text-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  );
}
