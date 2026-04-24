import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authorized: false,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => {
    if (!state.authorized) return null;
    return {
      userId: "00000000-0000-4000-8000-000000000001",
      email: "auth@creator.local",
      plan: "starter",
    };
  }),
}));

vi.mock("@creator-os/db/queries/workspace", () => ({
  listWorkspaceItems: vi.fn(async () => [{ id: "w1", stage: "idea", title: "Item", body: null }]),
  createWorkspaceItem: vi.fn(),
  updateWorkspaceItem: vi.fn(),
  softDeleteWorkspaceItem: vi.fn(),
}));

vi.mock("@creator-os/db/queries/chat", () => ({
  listSessions: vi.fn(async () => [{ id: "s1", title: null, createdAt: new Date().toISOString() }]),
  createSession: vi.fn(),
}));

describe("auth-protected API routes", () => {
  beforeEach(() => {
    state.authorized = false;
  });

  it("returns 401 for unauthenticated workspace request", async () => {
    const workspaceRoute = await import("../../../apps/web/src/app/api/workspace/items/route");

    const res = await workspaceRoute.GET({ nextUrl: new URL("http://localhost/api/workspace/items") } as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for unauthenticated chat sessions request", async () => {
    const chatRoute = await import("../../../apps/web/src/app/api/chat/sessions/route");

    const res = await chatRoute.GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("allows authenticated access to workspace and chat sessions", async () => {
    state.authorized = true;

    const workspaceRoute = await import("../../../apps/web/src/app/api/workspace/items/route");
    const chatRoute = await import("../../../apps/web/src/app/api/chat/sessions/route");

    const workspaceRes = await workspaceRoute.GET({ nextUrl: new URL("http://localhost/api/workspace/items") } as any);
    const chatRes = await chatRoute.GET();

    const workspaceBody = await workspaceRes.json();
    const chatBody = await chatRes.json();

    expect(workspaceRes.status).toBe(200);
    expect(chatRes.status).toBe(200);

    expect(workspaceBody.data).toHaveLength(1);
    expect(chatBody.data).toHaveLength(1);
  });
});
