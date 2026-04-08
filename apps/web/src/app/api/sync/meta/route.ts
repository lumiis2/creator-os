import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, db, eq, platformConnections, analyticsSnapshots } from "@creator-os/db";
import { requireAuth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { fetchFacebookPageInsights, fetchInstagramInsights } from "@/services/meta/fetchAnalytics";

const BodySchema = z.object({
  connectionId: z.string().uuid().optional(),
});

function toDateOnlyString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { connectionId } = parsed.data;

  let connections = [] as Array<typeof platformConnections.$inferSelect>;

  if (connectionId) {
    const one = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.id, connectionId),
        eq(platformConnections.userId, session.userId),
      ),
    });

    if (!one) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    if (one.platform !== "facebook" && one.platform !== "instagram") {
      return NextResponse.json({ error: "Connection is not a Meta platform" }, { status: 412 });
    }

    connections = [one];
  } else {
    const facebook = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.userId, session.userId),
        eq(platformConnections.platform, "facebook"),
      ),
    });

    const instagram = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.userId, session.userId),
        eq(platformConnections.platform, "instagram"),
      ),
    });

    connections = [facebook, instagram].filter(Boolean) as Array<typeof platformConnections.$inferSelect>;
  }

  if (!connections.length) {
    return NextResponse.json({
      error: "No Meta connections found",
      details: "Connect Facebook/Instagram from Profile before syncing.",
    }, { status: 404 });
  }

  const snapshotDate = new Date(toDateOnlyString());
  const result = {
    synced: [] as string[],
    failed: [] as Array<{ platform: string; reason: string }>,
  };

  for (const conn of connections) {
    await db.update(platformConnections)
      .set({ syncStatus: "syncing", syncError: null })
      .where(eq(platformConnections.id, conn.id));

    try {
      if (conn.platform === "facebook") {
        const meta = (conn.meta ?? {}) as Record<string, unknown>;
        const pageId = (meta.primary_page_id as string | undefined) ?? conn.platformUserId;

        const insights = await fetchFacebookPageInsights(pageId, conn.accessTokenEnc);

        const snapshot = {
          userId: session.userId,
          connectionId: conn.id,
          platform: "facebook",
          snapshotDate,
          subscribers: insights.values.page_fans ?? null,
          totalViews: insights.values.page_impressions ?? null,
          totalVideos: null,
          views7d: null,
          views30d: insights.values.page_impressions ?? null,
          subsGained7d: null,
          avgEr7d: null,
          rawPayload: insights.raw as object,
        };

        await db.insert(analyticsSnapshots)
          .values(snapshot)
          .onConflictDoUpdate({
            target: [analyticsSnapshots.userId, analyticsSnapshots.platform, analyticsSnapshots.snapshotDate],
            set: {
              ...snapshot,
              createdAt: new Date(),
            },
          });
      }

      if (conn.platform === "instagram") {
        const meta = (conn.meta ?? {}) as Record<string, unknown>;
        const igUserId = (meta.ig_user_id as string | undefined) ?? conn.platformUserId;

        const insights = await fetchInstagramInsights(igUserId, conn.accessTokenEnc);

        const snapshot = {
          userId: session.userId,
          connectionId: conn.id,
          platform: "instagram",
          snapshotDate,
          subscribers: null,
          totalViews: insights.values.impressions ?? null,
          totalVideos: null,
          views7d: null,
          views30d: insights.values.impressions ?? null,
          subsGained7d: null,
          avgEr7d: null,
          rawPayload: insights.raw as object,
        };

        await db.insert(analyticsSnapshots)
          .values(snapshot)
          .onConflictDoUpdate({
            target: [analyticsSnapshots.userId, analyticsSnapshots.platform, analyticsSnapshots.snapshotDate],
            set: {
              ...snapshot,
              createdAt: new Date(),
            },
          });
      }

      await db.update(platformConnections)
        .set({ syncStatus: "idle", syncError: null, lastSyncedAt: new Date() })
        .where(eq(platformConnections.id, conn.id));

      result.synced.push(conn.platform);
    } catch (error) {
      await db.update(platformConnections)
        .set({ syncStatus: "error", syncError: error instanceof Error ? error.message : String(error) })
        .where(eq(platformConnections.id, conn.id));

      result.failed.push({
        platform: conn.platform,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  try {
    await redis.del(`analytics:snapshot:${session.userId}`);
    await redis.del(`analytics:videos:${session.userId}:10:0:views:desc`);
  } catch {
    // cache is best-effort
  }

  return NextResponse.json({
    ok: result.failed.length === 0,
    ...result,
  });
}
