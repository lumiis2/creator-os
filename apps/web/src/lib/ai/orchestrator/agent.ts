import { getLatestSnapshot, getPreviousSnapshot, listSnapshots, listVideos } from "@creator-os/db/queries/analytics";
import { getCreatorProfile } from "@creator-os/db/queries/profiles";
import { getRecentMessages } from "@creator-os/db/queries/chat";
import { buildAnalyticsSummary } from "@/lib/analytics/compute";
import type { ChatMessage } from "@/lib/ai/providers/base";
import { buildCoreSystemPrompt } from "@/lib/ai/core/system-prompt";
import { buildNicheLayer } from "@/lib/ai/core/niche-layer";
import { buildContextLayer } from "@/lib/ai/core/context-layer";
import { runWebSearch } from "@/lib/ai/tools/web-search";

export interface AgentBuildInput {
  userId: string;
  sessionId: string;
  userMessage: string;
}

export interface AgentBuildOutput {
  systemPrompt: string;
  messages: ChatMessage[];
  webSearchUsed: boolean;
}

const SEARCH_TRIGGER = /\b(search|find|latest|trend|recent)\b/i;

function shouldUseWebSearch(message: string): boolean {
  return SEARCH_TRIGGER.test(message);
}

export async function buildAgentContext(input: AgentBuildInput): Promise<AgentBuildOutput> {
  const [currentSnap, prevSnap, snapshots, profile, recentMessages, topVideos] = await Promise.all([
    getLatestSnapshot(input.userId),
    getPreviousSnapshot(input.userId, 7),
    listSnapshots(input.userId, 5),
    getCreatorProfile(input.userId),
    getRecentMessages(input.sessionId, 20),
    listVideos({ userId: input.userId, limit: 3, sort: "views", direction: "desc" }),
  ]);

  const analyticsSummary = currentSnap ? buildAnalyticsSummary(currentSnap, prevSnap) : null;

  const coreLayer = buildCoreSystemPrompt();
  const nicheLayer = buildNicheLayer({
    niche: profile?.niche,
    subNiche: profile?.subNiche,
    contentStyle: profile?.contentStyle,
    audienceDesc: profile?.audienceDesc,
  });
  const contextLayer = buildContextLayer({
    profile: profile
      ? {
          displayName: profile.displayName,
          niche: profile.niche,
          subNiche: profile.subNiche,
          contentStyle: profile.contentStyle,
          audienceDesc: profile.audienceDesc,
          postingGoalFreq: profile.postingGoalFreq,
        }
      : null,
    analyticsSummary,
    recentPerformance: snapshots.map((s: { snapshotDate: Date; views7d: number | null; subsGained7d: number | null }) => ({
      date: s.snapshotDate,
      views7d: s.views7d,
      subsGained7d: s.subsGained7d,
    })),
    topVideos: topVideos.map((v: { title: string | null; views: number; engagementRate: number | null }) => ({
      title: v.title,
      views: v.views,
      engagementRate: v.engagementRate,
    })),
  });

  let webSearchLayer: string | null = null;
  const webSearchUsed = shouldUseWebSearch(input.userMessage);
  if (webSearchUsed) {
    const profileHint = [profile?.niche, profile?.subNiche].filter(Boolean).join(" ");
    const webQuery = profileHint
      ? `${input.userMessage} for ${profileHint} creator growth`
      : input.userMessage;
    webSearchLayer = await runWebSearch(webQuery);
  }

  const systemPrompt = [
    coreLayer,
    nicheLayer,
    contextLayer,
    "=== Conversation Rules ===\nUse the provided conversation history and answer the newest user request. Keep output concise, tactical, and ranked by impact.",
    webSearchLayer,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatMessage[] = recentMessages.map((m: { role: string; content: string }): ChatMessage => ({
    role: m.role as ChatMessage["role"],
    content: m.content,
  }));

  return {
    systemPrompt,
    messages,
    webSearchUsed: Boolean(webSearchLayer),
  };
}
