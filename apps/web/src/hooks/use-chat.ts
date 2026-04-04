import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useChatUiStore } from "@/stores/chat";

export interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

async function fetchSessions(): Promise<{ data: ChatSession[] }> {
  const res = await fetch("/api/chat/sessions", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load sessions");
  return res.json();
}

async function fetchMessages(sessionId: string): Promise<{ data: ChatMessage[] }> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages?limit=50`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

async function createSession(): Promise<{ data: ChatSession }> {
  const res = await fetch("/api/chat/sessions", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export function useChat() {
  const { activeSessionId, setActiveSessionId, draft, setDraft } = useChatUiStore();
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: fetchSessions,
  });

  const sessions = sessionsQuery.data?.data ?? [];

  useEffect(() => {
    if (!activeSessionId && sessions.length) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions, setActiveSessionId]);

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", activeSessionId],
    queryFn: () => fetchMessages(activeSessionId as string),
    enabled: !!activeSessionId,
  });

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (data: { data: ChatSession }) => {
      setActiveSessionId(data.data.id);
      sessionsQuery.refetch();
    },
  });

  const sendMessage = useCallback(async () => {
    if (!activeSessionId || !draft.trim() || streaming) return;

    setStreaming(true);
    setStreamingText("");
    setStreamError(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMessage = draft.trim();
    setDraft("");
    setPendingUserMessage({
      id: `pending-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, sessionId: activeSessionId }),
      signal: abortRef.current.signal,
    });

    if (!res.ok || !res.body) {
      setStreaming(false);
      setStreamError("Failed to stream response.");
      return;
    }

    const newSessionId = res.headers.get("X-Session-Id");
    if (newSessionId && newSessionId !== activeSessionId) {
      setActiveSessionId(newSessionId);
      sessionsQuery.refetch();
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let fullText = "";
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.replace(/^data:\s?/, "");
        if (!payload) continue;
        fullText += payload;
        setStreamingText(fullText);
      }
    }

    setStreaming(false);
    setPendingUserMessage(null);
    messagesQuery.refetch();
  }, [activeSessionId, draft, messagesQuery, sessionsQuery, setActiveSessionId, setDraft, streaming]);

  const activeSession = useMemo(
    () => sessions.find((s: ChatSession) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const messages = useMemo(() => {
    const base = messagesQuery.data?.data ?? [];
    if (pendingUserMessage) return [...base, pendingUserMessage];
    return base;
  }, [messagesQuery.data, pendingUserMessage]);

  return {
    sessions,
    activeSession,
    messages,
    sessionsQuery,
    messagesQuery,
    createMutation,
    sendMessage,
    streaming,
    streamingText,
    streamError,
    draft,
    setDraft,
    setActiveSessionId,
  };
}
