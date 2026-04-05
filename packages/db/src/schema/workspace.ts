import { pgTable, uuid, text, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const workspaceItems = pgTable("workspace_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stage: text("stage").notNull().default("idea"),
  title: text("title").notNull(),
  body: text("body"),
  platform: text("platform"),
  tags: text("tags").array(),
  editingStartAt: timestamp("editing_start_at", { withTimezone: true }),
  editingDueAt: timestamp("editing_due_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  source: text("source").notNull().default("manual"),
  sortOrder: integer("sort_order").default(0),
  videoId: uuid("video_id"),
  perfScore: numeric("perf_score", { precision: 5, scale: 2, mode: "number" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userStageIdx: index("idx_workspace_items_user_stage").on(table.userId, table.stage).where(
    sql`${table.deletedAt} IS NULL`,
  ),
}));

export type WorkspaceItem = typeof workspaceItems.$inferSelect;
export type NewWorkspaceItem = typeof workspaceItems.$inferInsert;
