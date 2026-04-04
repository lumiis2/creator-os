import { pgTable, uuid, text, bigint, integer, numeric, date, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { platformConnections } from "./connections";

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").notNull().references(() => platformConnections.id),
  platform: text("platform").notNull(),
  snapshotDate: date("snapshot_date", { mode: "date" }).notNull(),
  subscribers: bigint("subscribers", { mode: "number" }),
  totalViews: bigint("total_views", { mode: "number" }),
  totalVideos: integer("total_videos"),
  views7d: bigint("views_7d", { mode: "number" }),
  views30d: bigint("views_30d", { mode: "number" }),
  subsGained7d: integer("subs_gained_7d"),
  avgEr7d: numeric("avg_er_7d", { precision: 6, scale: 4, mode: "number" }),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniquePerDay: uniqueIndex("analytics_snapshots_unq").on(table.userId, table.platform, table.snapshotDate),
  userDateIdx: index("idx_snapshots_user_date").on(table.userId, table.snapshotDate),
}));

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type NewAnalyticsSnapshot = typeof analyticsSnapshots.$inferInsert;
