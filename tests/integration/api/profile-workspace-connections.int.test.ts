import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authorized: true,
  profile: { displayName: "Luisa", niche: "tech" } as any,
  workspaceItems: [{ id: "w1", title: "idea", stage: "idea", body: null }] as any[],
  connections: [{ id: "c1", platform: "youtube", displayName: "My channel", syncStatus: "idle", lastSyncedAt: null }] as any[],
  updatedWorkspace: { id: "w1", title: "updated", stage: "draft", body: "x" } as any,
  deletedWorkspace: { id: "w1" } as any,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => (state.authorized ? {
    userId: "00000000-0000-4000-8000-000000000001",
    email: "user@creator.local",
    plan: "starter",
  } : null)),
}));

vi.mock("@creator-os/db/queries/profiles", () => ({
  getCreatorProfile: vi.fn(async () => state.profile),
  upsertCreatorProfile: vi.fn(async (_userId: string, data: any) => ({ ...state.profile, ...data })),
}));

vi.mock("@creator-os/db/queries/workspace", () => ({
  listWorkspaceItems: vi.fn(async () => state.workspaceItems),
  createWorkspaceItem: vi.fn(async (payload: any) => ({ id: "new", ...payload })),
  updateWorkspaceItem: vi.fn(async () => state.updatedWorkspace),
  softDeleteWorkspaceItem: vi.fn(async () => state.deletedWorkspace),
}));

vi.mock("@creator-os/db/queries/connections", () => ({
  listConnections: vi.fn(async () => state.connections),
}));

describe("profile, workspace and connections routes", () => {
  beforeEach(() => {
    state.authorized = true;
    state.deletedWorkspace = { id: "w1" };
    state.updatedWorkspace = { id: "w1", title: "updated", stage: "draft", body: "x" };
  });

  it("profile route: unauthorized and invalid payload handling", async () => {
    const route = await import("../../../apps/web/src/app/api/profile/route");

    state.authorized = false;
    const unauthorized = await route.GET();
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toEqual({ error: "Unauthorized" });

    state.authorized = true;
    const invalid = await route.PATCH({ json: async () => ({ postingGoalFreq: 1000 }) } as any);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "Invalid payload" });
  });

  it("profile route: valid get/patch responses", async () => {
    const route = await import("../../../apps/web/src/app/api/profile/route");

    const getRes = await route.GET();
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toMatchObject({ data: { displayName: "Luisa" } });

    const patchRes = await route.PATCH({ json: async () => ({ displayName: "Updated Name", postingGoalFreq: 4 }) } as any);
    const patchBody = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchBody.data).toMatchObject({ displayName: "Updated Name", postingGoalFreq: 4 });
  });

  it("workspace items route: validates auth, payload and CRUD shape", async () => {
    const listCreateRoute = await import("../../../apps/web/src/app/api/workspace/items/route");
    const updateDeleteRoute = await import("../../../apps/web/src/app/api/workspace/items/[id]/route");

    state.authorized = false;
    const unauthorized = await listCreateRoute.GET({ nextUrl: new URL("http://localhost/api/workspace/items") } as any);
    expect(unauthorized.status).toBe(401);

    state.authorized = true;
    const list = await listCreateRoute.GET({ nextUrl: new URL("http://localhost/api/workspace/items?stage=idea") } as any);
    expect(list.status).toBe(200);
    expect((await list.json()).data).toHaveLength(1);

    const invalidCreate = await listCreateRoute.POST({ json: async () => ({ title: "" }) } as any);
    expect(invalidCreate.status).toBe(400);

    const create = await listCreateRoute.POST({ json: async () => ({ title: "New", stage: "idea" }) } as any);
    const createBody = await create.json();
    expect(create.status).toBe(200);
    expect(createBody.data).toMatchObject({ title: "New", stage: "idea" });

    const invalidPatch = await updateDeleteRoute.PATCH({ json: async () => ({ title: "" }) } as any, { params: Promise.resolve({ id: "w1" }) });
    expect(invalidPatch.status).toBe(400);

    const patch = await updateDeleteRoute.PATCH({ json: async () => ({ title: "ok" }) } as any, { params: Promise.resolve({ id: "w1" }) });
    expect(patch.status).toBe(200);
    expect((await patch.json()).data).toMatchObject({ id: "w1" });

    const del = await updateDeleteRoute.DELETE({} as any, { params: Promise.resolve({ id: "w1" }) });
    expect(del.status).toBe(200);
    expect((await del.json()).data).toMatchObject({ id: "w1" });

    state.deletedWorkspace = null;
    const delNotFoundSafe = await updateDeleteRoute.DELETE({} as any, { params: Promise.resolve({ id: "missing" }) });
    expect(delNotFoundSafe.status).toBe(200);
    expect((await delNotFoundSafe.json()).data).toBeNull();
  });

  it("profile connections route returns mapped fields and auth guard", async () => {
    const route = await import("../../../apps/web/src/app/api/profile/connections/route");

    state.authorized = false;
    const unauthorized = await route.GET();
    expect(unauthorized.status).toBe(401);

    state.authorized = true;
    const getRes = await route.GET();
    const body = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(body.data[0]).toMatchObject({
      id: "c1",
      platform: "youtube",
      displayName: "My channel",
      status: "idle",
      lastSyncedAt: null,
    });

    const postRes = await route.POST({ nextUrl: new URL("http://localhost/api/profile/connections?callbackUrl=%2Fdashboard") } as any);
    const postBody = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postBody.connectUrl).toContain("/api/auth/signin/google");
    expect(postBody.connectUrl).toContain("callbackUrl=%2Fdashboard");
    expect(postBody.connectUrl).toContain("youtube.readonly");
  });
});
