import { pgTable, uuid, text, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const platformConnections = pgTable("platform_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  platformUserId: text("platform_user_id").notNull(),
  displayName: text("display_name"),
  accessTokenEnc: text("access_token_enc").notNull(),
  tokenType: text("token_type"),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  scopes: text("scopes").array(),
  meta: jsonb("meta"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  syncStatus: text("sync_status").default("idle"),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userPlatformUnique: uniqueIndex("platform_connections_user_platform_unique").on(
    table.userId,
    table.platform,
  ),
}));

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type NewPlatformConnection = typeof platformConnections.$inferInsert;
