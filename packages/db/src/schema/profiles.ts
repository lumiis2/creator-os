import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const creatorProfiles = pgTable("creator_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  niche: text("niche"),
  subNiche: text("sub_niche"),
  contentStyle: text("content_style").array(),
  audienceDesc: text("audience_desc"),
  postingGoalFreq: integer("posting_goal_freq").default(3),
  agentMode: text("agent_mode").notNull().default("proactive"),
  timezone: text("timezone").default("UTC"),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  nicheEmbedding: jsonb("niche_embedding"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type NewCreatorProfile = typeof creatorProfiles.$inferInsert;
