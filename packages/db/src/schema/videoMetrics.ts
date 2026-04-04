import { pgTable, uuid, text, timestamp, integer, bigint, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { platformConnections } from "./connections";

export const videoMetrics = pgTable("video_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").notNull().references(() => platformConnections.id),
  platform: text("platform").notNull(),
  platformVideoId: text("platform_video_id").notNull(),
  title: text("title"),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  durationSecs: integer("duration_secs"),
  views: bigint("views", { mode: "number" }).notNull().default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  watchTimeMins: bigint("watch_time_mins", { mode: "number" }).default(0),
  estimatedRevenue: numeric("estimated_revenue", { precision: 10, scale: 4, mode: "number" }),
  engagementRate: numeric("engagement_rate", { precision: 6, scale: 4, mode: "number" }),
  workspaceItemId: uuid("workspace_item_id"),
  perfScore: numeric("perf_score", { precision: 5, scale: 2, mode: "number" }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userPlatformVideoUnique: uniqueIndex("video_metrics_user_platform_video_unique").on(
    table.userId,
    table.platform,
    table.platformVideoId,
  ),
  userViewsIdx: index("idx_video_metrics_user_views").on(table.userId, table.views),
}));

export type VideoMetric = typeof videoMetrics.$inferSelect;
export type NewVideoMetric = typeof videoMetrics.$inferInsert;
