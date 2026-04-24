import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as any,
  usersById: new Map<string, any>(),
  usersByEmail: new Map<string, any>(),
  createdUsers: [] as any[],
  createdProfiles: [] as any[],
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => state.session),
}));

vi.mock("@creator-os/db", () => {
  const users = { id: "id", email: "email" };
  const creatorProfiles = { userId: "userId" };

  const db = {
    query: {
      users: {
        findFirst: vi.fn(async ({ where }: { where: string }) => {
          if (state.usersById.has(where)) return state.usersById.get(where);
          if (state.usersByEmail.has(where)) return state.usersByEmail.get(where);
          return null;
        }),
      },
    },
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((payload: any) => {
        if (table === users) {
          const created = {
            id: "00000000-0000-4000-8000-000000000099",
            email: payload.email,
            plan: payload.plan,
            hashedPassword: payload.hashedPassword,
          };
          state.createdUsers.push(created);
          state.usersByEmail.set(created.email, created);
          state.usersById.set(created.id, created);
          return { returning: vi.fn(async () => [created]) };
        }

        if (table === creatorProfiles) {
          state.createdProfiles.push(payload);
          return { onConflictDoNothing: vi.fn(async () => undefined) };
        }

        return { returning: vi.fn(async () => []) };
      }),
    })),
  };

  return {
    db,
    users,
    creatorProfiles,
    eq: vi.fn((_field: unknown, value: string) => value),
  };
});

describe("requireAuth", () => {
  beforeEach(() => {
    state.session = null;
    state.usersById = new Map();
    state.usersByEmail = new Map();
    state.createdUsers = [];
    state.createdProfiles = [];
    delete process.env.AUTH_DISABLED;
    delete process.env.DEV_USER_EMAIL;
  });

  it("returns user by session user id when id is a valid UUID", async () => {
    const user = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "id@creator.local",
      plan: "pro",
    };
    state.usersById.set(user.id, user);
    state.session = { user: { id: user.id, email: user.email } };

    const { requireAuth } = await import("../../apps/web/src/lib/auth");
    const auth = await requireAuth();

    expect(auth).toEqual({ userId: user.id, email: user.email, plan: "pro" });
  });

  it("falls back to email lookup when session id is missing", async () => {
    const user = {
      id: "00000000-0000-4000-8000-000000000002",
      email: "email@creator.local",
      plan: "starter",
    };
    state.usersByEmail.set(user.email, user);
    state.session = { user: { email: user.email } };

    const { requireAuth } = await import("../../apps/web/src/lib/auth");
    const auth = await requireAuth();

    expect(auth).toEqual({ userId: user.id, email: user.email, plan: "starter" });
  });

  it("creates dev user when AUTH_DISABLED=true and no user exists", async () => {
    process.env.AUTH_DISABLED = "true";
    process.env.DEV_USER_EMAIL = "dev@creator.local";

    const { requireAuth } = await import("../../apps/web/src/lib/auth");
    const auth = await requireAuth();

    expect(auth).toMatchObject({ email: "dev@creator.local", plan: "starter" });
    expect(state.createdUsers).toHaveLength(1);
    expect(state.createdProfiles).toHaveLength(1);
  });

  it("returns null when user is not authenticated and auth is enabled", async () => {
    process.env.AUTH_DISABLED = "false";

    const { requireAuth } = await import("../../apps/web/src/lib/auth");
    const auth = await requireAuth();

    expect(auth).toBeNull();
  });
});
