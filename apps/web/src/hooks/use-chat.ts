import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useChatUiStore } from "@/stores/chat";

class StreamError extends Error {
  constructor(message: string, public status: number | null, public retriable: boolean) {
    super(message);
  }
}

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
  const [isThinking, setIsThinking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearRuntimeStates = useCallback(() => {
    setIsThinking(false);
    setIsSearching(false);
    setIsStreaming(false);
    setStatusLabel(null);
  }, []);

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

  const ensureSessionId = useCallback(async (): Promise<string> => {
    if (activeSessionId) {
      return activeSessionId;
    }

    const created = await createSession();
    const sessionId = created.data.id;
    setActiveSessionId(sessionId);
    await sessionsQuery.refetch();
    return sessionId;
  }, [activeSessionId, setActiveSessionId, sessionsQuery]);

  const streamRequest = useCallback(async (sessionId: string, message: string, signal: AbortSignal) => {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
      signal,
    });

    if (!res.ok || !res.body) {
      let errMessage = "Failed to stream response.";
      try {
        const payload = await res.json();
        errMessage = payload?.error ?? errMessage;
      } catch {
        // noop
      }

      const retriable = res.status >= 500 || res.status === 429;
      throw new StreamError(errMessage, res.status, retriable);
    }

    return res;
  }, []);

  const sendMessageText = useCallback(async (text: string) => {
    if (!text.trim() || isThinking || isSearching || isStreaming) return;

    let sessionId: string;
    try {
      sessionId = await ensureSessionId();
    } catch {
      setStreamError("Failed to create chat session.");
      return;
    }

    setIsThinking(true);
    setIsSearching(false);
    setIsStreaming(false);
    setStatusLabel("Thinking...");
    setStreamingText("");
    setStreamError(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMessage = text.trim();
    setPendingUserMessage({
      id: `pending-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    let attempt = 0;
    const maxAttempts = 2;
    const minStateMs = 500;
    let statusAt = Date.now();

    const transitionStatus = async (state: "thinking" | "searching" | "streaming", label: string) => {
      const elapsed = Date.now() - statusAt;
      if (elapsed < minStateMs) {
        await new Promise((resolve) => setTimeout(resolve, minStateMs - elapsed));
      }

      setIsThinking(state === "thinking");
      setIsSearching(state === "searching");
      setIsStreaming(state === "streaming");
      setStatusLabel(label);
      statusAt = Date.now();
    };

    while (attempt < maxAttempts) {
      try {
        const res = await streamRequest(sessionId, userMessage, abortRef.current.signal);
        let streamStatusActive = false;

        const newSessionId = res.headers.get("X-Session-Id");
        if (newSessionId && newSessionId !== sessionId) {
          sessionId = newSessionId;
          setActiveSessionId(newSessionId);
          sessionsQuery.refetch();
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder("utf-8");

        let fullText = "";
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const lines = rawEvent.split("\n");
            let eventName = "message";
            const dataLines: string[] = [];

            for (const line of lines) {
              if (line.startsWith(":") || !line.trim()) continue;
              if (line.startsWith("event:")) {
                eventName = line.replace(/^event:\s?/, "").trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.replace(/^data:\s?/, ""));
              }
            }

            const payload = dataLines.join("\n");
            if (!payload) continue;

            if (eventName === "status") {
              try {
                const status = JSON.parse(payload) as { state?: string; label?: string };
                if (status.state === "thinking") {
                  await transitionStatus("thinking", status.label ?? "Thinking...");
                  streamStatusActive = false;
                } else if (status.state === "searching" || status.state === "analyzing") {
                  await transitionStatus("searching", status.label ?? "Searching the web...");
                  streamStatusActive = false;
                } else if (status.state === "generating") {
                  await transitionStatus("streaming", status.label ?? "Generating response...");
                  streamStatusActive = true;
                }
              } catch {
                // noop
              }
              continue;
            }

            if (eventName === "error") {
              throw new StreamError(payload, null, attempt + 1 < maxAttempts);
            }

            if (!streamStatusActive) {
              await transitionStatus("streaming", "Generating response...");
              streamStatusActive = true;
            }

            fullText += payload;
            setStreamingText(fullText);
          }
        }

        clearRuntimeStates();
        setStreamingText("");
        setPendingUserMessage(null);
        messagesQuery.refetch();
        return;
      } catch (error) {
        if (abortRef.current?.signal.aborted) {
          clearRuntimeStates();
          setPendingUserMessage(null);
          return;
        }

        const retriable =
          error instanceof StreamError
            ? error.retriable
            : error instanceof TypeError;

        if (retriable && attempt + 1 < maxAttempts) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 400));
          continue;
        }

        clearRuntimeStates();
        setStreamingText("");
        setPendingUserMessage(null);
        setStreamError(error instanceof Error ? error.message : "Failed to stream response.");
        return;
      }
    }
  }, [clearRuntimeStates, ensureSessionId, isSearching, isStreaming, isThinking, messagesQuery, sessionsQuery, setActiveSessionId, streamRequest]);

  const sendMessage = useCallback(async () => {
    if (!draft.trim() || isThinking || isSearching || isStreaming) return;
    const userMessage = draft.trim();
    setDraft("");
    await sendMessageText(userMessage);
  }, [draft, isSearching, isStreaming, isThinking, sendMessageText, setDraft]);

  const regenerateLastResponse = useCallback(async () => {
    const base = messagesQuery.data?.data ?? [];
    const lastUserMessage = [...base].reverse().find((message: ChatMessage) => message.role === "user");
    if (!lastUserMessage || isThinking || isSearching || isStreaming) return;
    await sendMessageText(lastUserMessage.content);
  }, [isSearching, isStreaming, isThinking, messagesQuery.data?.data, sendMessageText]);

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
    regenerateLastResponse,
    isThinking,
    isSearching,
    isStreaming,
    streaming: isStreaming,
    statusLabel,
    streamingText,
    streamError,
    draft,
    setDraft,
    setActiveSessionId,
  };
}
