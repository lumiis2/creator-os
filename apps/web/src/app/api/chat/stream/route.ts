import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { checkAndIncrementBudget } from "@/lib/ai/token-budget";
import { buildAgentContext } from "@/lib/ai/orchestrator/agent";
import { getAIProvider } from "@/lib/ai/providers";
import { getOrCreateSession, persistMessage } from "@creator-os/db/queries/chat";

const RequestSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
});

const STREAM_IDLE_TIMEOUT_MS = 30_000;
const STREAM_HEARTBEAT_MS = 15_000;

function timeoutResult<T>(ms: number): Promise<T | { timedOut: true }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ timedOut: true }), ms);
  });
}

function formatSseData(data: string): string {
  const lines = data.split(/\r?\n/);
  return `${lines.map((line) => `data: ${line}`).join("\n")}\n\n`;
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const { message, sessionId: existingSessionId } = parsed.data;

  const budget = await checkAndIncrementBudget(session.userId, session.plan ?? "starter");
  if (!budget.allowed) {
    return new Response(JSON.stringify({
      error: "Monthly message limit reached",
      messagesUsed: budget.used,
      limit: budget.limit,
      upgradeUrl: "/profile#billing",
    }), { status: 429 });
  }

  const chatSession = await getOrCreateSession(session.userId, existingSessionId);
  const { systemPrompt, messages: history } = await buildAgentContext({
    userId: session.userId,
    sessionId: chatSession.id,
    userMessage: message,
  });

  await persistMessage({
    sessionId: chatSession.id,
    userId: session.userId,
    role: "user",
    content: message,
  });

  const provider = getAIProvider();
  const stream = provider.streamChat({
    systemPrompt,
    messages: [...history, { role: "user", content: message }],
    maxTokens: 1000,
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const readable = new ReadableStream({
    async start(controller) {
      const iterator = stream[Symbol.asyncIterator]();
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, STREAM_HEARTBEAT_MS);

      const closeStream = async (persist = true) => {
        clearInterval(heartbeat);
        if (persist && fullText.trim()) {
          await persistMessage({
            sessionId: chatSession.id,
            userId: session.userId,
            role: "assistant",
            content: fullText,
            tokenCount: null,
          });
        }
        controller.close();
      };

      try {
        while (true) {
          const next = await Promise.race([
            iterator.next(),
            timeoutResult<Awaited<ReturnType<typeof iterator.next>>>(STREAM_IDLE_TIMEOUT_MS),
          ]);

          if ("timedOut" in next) {
            controller.enqueue(encoder.encode("event: error\ndata: Stream timed out waiting for provider response\n\n"));
            await closeStream(false);
            return;
          }

          if (next.done) {
            await closeStream(true);
            return;
          }

          fullText += next.value.text;
          controller.enqueue(encoder.encode(formatSseData(next.value.text)));
        }
      } catch {
        controller.enqueue(encoder.encode("event: error\ndata: Stream failed unexpectedly\n\n"));
        await closeStream(false);
      } finally {
        clearInterval(heartbeat);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Session-Id": chatSession.id,
    },
  });
}
