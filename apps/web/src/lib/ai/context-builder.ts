import { getLatestSnapshot, getPreviousSnapshot } from "@creator-os/db/queries/analytics";
import { getCreatorProfile } from "@creator-os/db/queries/profiles";
import { getRecentMessages } from "@creator-os/db/queries/chat";
import { buildAnalyticsSummary, formatAnalyticsForAI } from "@/lib/analytics/compute";
import type { ChatMessage } from "./providers/base";

export interface ChatContext {
  systemPrompt: string;
  messages: ChatMessage[];
}

export async function buildChatContext(userId: string, sessionId: string): Promise<ChatContext> {
  const [currentSnap, prevSnap, profile, recentMessages] = await Promise.all([
    getLatestSnapshot(userId),
    getPreviousSnapshot(userId, 7),
    getCreatorProfile(userId),
    getRecentMessages(sessionId, 20),
  ]);

  const identity = `You are a professional social media growth advisor for content creators.
You are direct, data-literate, and focused exclusively on helping creators grow their online presence.
You only discuss topics related to social media strategy, content creation, analytics, and audience growth.
If asked about anything unrelated, politely redirect to your area of expertise.
Never fabricate statistics — if you don't have data, say so explicitly.`;

  const profileSection = profile
    ? [
        "=== Creator Profile ===",
        profile.displayName ? `Creator: ${profile.displayName}` : null,
        profile.niche ? `Niche: ${profile.niche}${profile.subNiche ? ` / ${profile.subNiche}` : ""}` : null,
        profile.contentStyle?.length ? `Content style: ${profile.contentStyle.join(", ")}` : null,
        profile.audienceDesc ? `Audience: ${profile.audienceDesc}` : null,
        profile.postingGoalFreq ? `Posting goal: ${profile.postingGoalFreq}x per week` : null,
        `Mode: ${profile.agentMode ?? "proactive"}`,
      ].filter(Boolean).join("\n")
    : "=== Creator Profile ===\nNo profile data";

  let analyticsSection = "=== No analytics data yet. User has not synced. ===";
  if (currentSnap) {
    const summary = buildAnalyticsSummary(currentSnap, prevSnap);
    analyticsSection = formatAnalyticsForAI(summary);
  }

  const systemPrompt = [
    identity,
    profile?.agentMode === "proactive"
      ? "Open each new conversation with one specific, data-driven insight from recent analytics. Be brief (2-3 sentences). Then ask one follow-up question."
      : "Wait for the user to ask a question. Respond directly without unsolicited insights.",
    profileSection,
    analyticsSection,
  ].join("\n\n");

  const messages: ChatMessage[] = recentMessages.map((m: { role: string; content: string }): ChatMessage => ({
    role: m.role as ChatMessage["role"],
    content: m.content,
  }));

  return { systemPrompt, messages };
}
