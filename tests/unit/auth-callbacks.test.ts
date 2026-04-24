import { beforeEach, describe, expect, it, vi } from "vitest";

type AnyObj = Record<string, any>;

const state = vi.hoisted(() => ({
  usersByEmail: new Map<string, AnyObj>(),
  usersById: new Map<string, AnyObj>(),
  profilesByUserId: new Map<string, AnyObj>(),
  connectionsByUserId: new Map<string, AnyObj>(),
  throwOnUserLookup: false,
  updates: [] as Array<{ table: string; payload: AnyObj; whereArg?: unknown }>,
  inserts: [] as Array<{ table: string; payload: AnyObj }>,
}));

vi.mock("@creator-os/db", () => {
  const users = { __name: "users", id: "id", email: "email" };
  const creatorProfiles = { __name: "creatorProfiles", userId: "userId" };
  const platformConnections = { __name: "platformConnections", id: "id", userId: "userId", platform: "platform" };

  const db = {
    query: {
      users: {
        findFirst: vi.fn(async ({ where }: { where: string }) => {
          if (state.throwOnUserLookup) throw new Error("database connection refused");
          return state.usersByEmail.get(where) ?? null;
        }),
      },
      creatorProfiles: {
        findFirst: vi.fn(async ({ where }: { where: string }) => state.profilesByUserId.get(where) ?? null),
      },
      platformConnections: {
        findFirst: vi.fn(async ({ where }: { where: string }) => state.connectionsByUserId.get(where) ?? null),
      },
    },
    insert: vi.fn((table: AnyObj) => ({
      values: vi.fn((payload: AnyObj) => {
        state.inserts.push({ table: table.__name, payload });

        if (table.__name === "users") {
          const created = {
            id: "00000000-0000-4000-8000-000000001111",
            email: payload.email,
            plan: payload.plan ?? "starter",
            hashedPassword: payload.hashedPassword ?? null,
          };
          state.usersByEmail.set(created.email, created);
          state.usersById.set(created.id, created);
          return { returning: vi.fn(async () => [created]) };
        }

        if (table.__name === "platformConnections") {
          const created = {
            id: "conn-youtube-1",
            ...payload,
          };
          return { returning: vi.fn(async () => [created]) };
        }

        return {
          returning: vi.fn(async () => [payload]),
          onConflictDoNothing: vi.fn(async () => undefined),
        };
      }),
    })),
    update: vi.fn((table: AnyObj) => ({
      set: vi.fn((payload: AnyObj) => ({
        where: vi.fn(async (whereArg: unknown) => {
          state.updates.push({ table: table.__name, payload, whereArg });
          return undefined;
        }),
      })),
    })),
  };

  return {
    db,
    users,
    creatorProfiles,
    platformConnections,
    eq: vi.fn((_field: unknown, value: any) => value),
    and: vi.fn((...args: any[]) => args.find((v) => typeof v === "string") ?? args[0]),
  };
});

describe("auth callbacks", () => {
  beforeEach(() => {
    state.usersByEmail = new Map();
    state.usersById = new Map();
    state.profilesByUserId = new Map();
    state.connectionsByUserId = new Map();
    state.throwOnUserLookup = false;
    state.updates = [];
    state.inserts = [];
  });

  it("jwt callback enriches token from user or DB fallback", async () => {
    const { authCallbacks } = await import("../../apps/web/src/lib/auth-callbacks");

    const fromUser = await authCallbacks.jwt({
      token: { email: "x@x.com" } as any,
      user: { id: "u-1", plan: "pro" } as any,
    });

    expect(fromUser.sub).toBe("u-1");
    expect((fromUser as any).plan).toBe("pro");

    state.usersByEmail.set("db@creator.local", {
      id: "u-db",
      email: "db@creator.local",
      plan: "starter",
    });

    const fromDb = await authCallbacks.jwt({
      token: { email: "db@creator.local" } as any,
      user: undefined,
    });

    expect(fromDb.sub).toBe("u-db");
    expect((fromDb as any).plan).toBe("starter");
  });

  it("session callback maps token sub/plan into session.user", async () => {
    const { authCallbacks } = await import("../../apps/web/src/lib/auth-callbacks");

    const session = await authCallbacks.session({
      session: { user: { email: "a@b.com" } } as any,
      token: { sub: "u-99", plan: "max" } as any,
    });

    expect(session.user).toMatchObject({ id: "u-99", plan: "max" });
  });

  it("signIn callback creates new oauth user and youtube connection", async () => {
    const { authCallbacks } = await import("../../apps/web/src/lib/auth-callbacks");

    const user = { email: "new@creator.local" } as any;

    const result = await authCallbacks.signIn({
      account: {
        provider: "google",
        access_token: "yt-access",
        refresh_token: "yt-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
        providerAccountId: "google-uid-1",
      },
      profile: {
        email: "new@creator.local",
        name: "New Creator",
        sub: "google-uid-1",
      },
      user,
    } as any);

    expect(result).toBe(true);

    const insertedUser = state.inserts.find((i) => i.table === "users")?.payload;
    expect(insertedUser).toMatchObject({ email: "new@creator.local", plan: "starter" });

    const insertedYt = state.inserts.find((i) => i.table === "platformConnections")?.payload;
    expect(insertedYt).toMatchObject({
      platform: "youtube",
      accessTokenEnc: "yt-access",
      refreshTokenEnc: "yt-refresh",
      platformUserId: "google-uid-1",
    });

    expect(user.id).toBe("00000000-0000-4000-8000-000000001111");
    expect(user.email).toBe("new@creator.local");
  });

  it("signIn callback updates existing youtube connection for existing user", async () => {
    state.usersByEmail.set("existing@creator.local", {
      id: "00000000-0000-4000-8000-000000000222",
      email: "existing@creator.local",
      plan: "starter",
    });
    state.connectionsByUserId.set("00000000-0000-4000-8000-000000000222", {
      id: "conn-existing",
      platformUserId: "old-id",
      displayName: "Old Name",
      refreshTokenEnc: "old-refresh",
    });

    const { authCallbacks } = await import("../../apps/web/src/lib/auth-callbacks");

    const result = await authCallbacks.signIn({
      account: {
        provider: "google",
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        scope: "https://www.googleapis.com/auth/youtube.readonly",
        providerAccountId: "yt-new-id",
      },
      profile: {
        email: "existing@creator.local",
        name: "Existing Creator",
        sub: "yt-new-id",
      },
      user: { email: "existing@creator.local" },
    } as any);

    expect(result).toBe(true);

    const connectionUpdate = state.updates.find((u) => u.table === "platformConnections");
    expect(connectionUpdate?.payload).toMatchObject({
      accessTokenEnc: "new-access",
      refreshTokenEnc: "new-refresh",
      platformUserId: "yt-new-id",
      syncStatus: "idle",
    });
  });

  it("signIn callback returns database_unavailable redirect on DB outage", async () => {
    state.throwOnUserLookup = true;
    const { authCallbacks } = await import("../../apps/web/src/lib/auth-callbacks");

    const result = await authCallbacks.signIn({
      account: {
        provider: "google",
        access_token: "token",
        scope: "https://www.googleapis.com/auth/youtube.readonly",
        providerAccountId: "google-uid-down",
      },
      profile: { email: "down@creator.local", sub: "google-uid-down" },
      user: { email: "down@creator.local" },
    } as any);

    expect(result).toBe("/login?error=database_unavailable");
  });
});
