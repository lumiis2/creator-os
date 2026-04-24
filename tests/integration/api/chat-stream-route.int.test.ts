import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authUser: { userId: "00000000-0000-4000-8000-000000000001", plan: "starter", email: "t@creator.local" } as any,
  budget: { allowed: true, used: 1, limit: 50 },
  searchRequested: false,
  webSearchUsed: false,
  providerFactory: null as null | (() => AsyncIterable<{ text: string }>),
  persisted: [] as any[],
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => state.authUser),
}));

vi.mock("@/lib/ai/token-budget", () => ({
  checkAndIncrementBudget: vi.fn(async () => state.budget),
}));

vi.mock("@/lib/ai/orchestrator/agent", () => ({
  shouldUseWebSearch: vi.fn(() => state.searchRequested),
  buildAgentContext: vi.fn(async () => ({
    systemPrompt: "SYSTEM",
    messages: [{ role: "assistant", content: "history" }],
    webSearchUsed: state.webSearchUsed,
  })),
}));

vi.mock("@/lib/ai/providers", () => ({
  getAIProvider: vi.fn(() => ({
    streamChat: vi.fn(() => {
      if (!state.providerFactory) {
        return {
          async *[Symbol.asyncIterator]() {
            yield { text: "default" };
          },
        };
      }
      return state.providerFactory();
    }),
  })),
}));

vi.mock("@creator-os/db/queries/chat", () => ({
  getOrCreateSession: vi.fn(async () => ({ id: "00000000-0000-4000-8000-000000009999" })),
  persistMessage: vi.fn(async (message: any) => {
    state.persisted.push(message);
    return { id: `m-${state.persisted.length}` };
  }),
}));

function makeRequest(message = "hello") {
  return {
    json: async () => ({ message }),
  } as any;
}

async function readResponseText(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("/api/chat/stream", () => {
  beforeEach(() => {
    state.authUser = { userId: "00000000-0000-4000-8000-000000000001", plan: "starter", email: "t@creator.local" };
    state.budget = { allowed: true, used: 1, limit: 50 };
    state.searchRequested = false;
    state.webSearchUsed = false;
    state.providerFactory = null;
    state.persisted = [];
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("streams successfully with ordered status events and persists assistant on completion", async () => {
    state.searchRequested = true;
    state.webSearchUsed = true;
    state.providerFactory = () => ({
      async *[Symbol.asyncIterator]() {
        yield { text: "chunk-1" };
        yield { text: "chunk-2" };
      },
    });

    const route = await import("../../../apps/web/src/app/api/chat/stream/route");
    const res = await route.POST(makeRequest("search latest trends"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const text = await readResponseText(res);

    const thinkingIdx = text.indexOf('"state":"thinking"');
    const searchingIdx = text.indexOf('"state":"searching"');
    const generatingIdx = text.indexOf('"state":"generating"');

    expect(thinkingIdx).toBeGreaterThanOrEqual(0);
    expect(searchingIdx).toBeGreaterThan(thinkingIdx);
    expect(generatingIdx).toBeGreaterThan(searchingIdx);
    expect(text).toContain("data: chunk-1");
    expect(text).toContain("data: chunk-2");

    expect(state.persisted).toHaveLength(2);
    expect(state.persisted[0]).toMatchObject({ role: "user", content: "search latest trends" });
    expect(state.persisted[1]).toMatchObject({ role: "assistant", content: "chunk-1chunk-2" });
  });

  it("returns 429 when budget is exceeded and does not persist messages", async () => {
    state.budget = { allowed: false, used: 50, limit: 50 };

    const route = await import("../../../apps/web/src/app/api/chat/stream/route");
    const res = await route.POST(makeRequest("hi"));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body).toMatchObject({
      error: "Monthly message limit reached",
      messagesUsed: 50,
      limit: 50,
    });
    expect(state.persisted).toHaveLength(0);
  });

  it("emits timeout error and does not persist assistant message", async () => {
    vi.useFakeTimers();

    state.providerFactory = () => ({
      [Symbol.asyncIterator]() {
        return {
          next: () => new Promise(() => {}),
        } as AsyncIterator<{ text: string }>;
      },
    });

    const route = await import("../../../apps/web/src/app/api/chat/stream/route");
    const res = await route.POST(makeRequest("hello"));

    const textPromise = readResponseText(res);
    await vi.advanceTimersByTimeAsync(31_000);

    const text = await textPromise;
    expect(text).toContain("event: error");
    expect(text).toContain("Stream timed out waiting for provider response");

    expect(state.persisted).toHaveLength(1);
    expect(state.persisted[0]).toMatchObject({ role: "user", content: "hello" });
  });

  it("handles provider interruption and avoids assistant persistence", async () => {
    state.providerFactory = () => ({
      async *[Symbol.asyncIterator]() {
        throw new Error("provider interrupted");
      },
    });

    const route = await import("../../../apps/web/src/app/api/chat/stream/route");
    const res = await route.POST(makeRequest("hello"));

    const text = await readResponseText(res);
    expect(text).toContain("event: error");
    expect(text).toContain("Stream failed unexpectedly");

    expect(state.persisted).toHaveLength(1);
    expect(state.persisted[0]).toMatchObject({ role: "user", content: "hello" });
  });
});
