import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { checkAndIncrementBudget } from "@/lib/ai/token-budget";
import { buildChatContext } from "@/lib/ai/context-builder";
import { getAIProvider } from "@/lib/ai/providers";
import { getOrCreateSession, persistMessage } from "@creator-os/db/queries/chat";

const RequestSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
});

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
  const { systemPrompt, messages: history } = await buildChatContext(session.userId, chatSession.id);

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
    async pull(controller) {
      for await (const chunk of stream) {
        fullText += chunk.text;
        controller.enqueue(encoder.encode(`data: ${chunk.text}\n\n`));
      }
      controller.close();

      await persistMessage({
        sessionId: chatSession.id,
        userId: session.userId,
        role: "assistant",
        content: fullText,
        tokenCount: null,
      });
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
