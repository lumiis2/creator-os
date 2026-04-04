import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getCreatorProfile, upsertCreatorProfile } from "@creator-os/db/queries/profiles";

const UpdateSchema = z.object({
  displayName: z.string().max(120).optional(),
  niche: z.string().max(120).optional(),
  subNiche: z.string().max(120).optional(),
  contentStyle: z.array(z.string()).optional(),
  audienceDesc: z.string().max(500).optional(),
  postingGoalFreq: z.number().min(1).max(30).optional(),
  agentMode: z.enum(["proactive", "passive"]).optional(),
  timezone: z.string().max(64).optional(),
  onboardingDone: z.boolean().optional(),
});

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCreatorProfile(session.userId);
  return NextResponse.json({ data: profile });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await upsertCreatorProfile(session.userId, parsed.data);
  return NextResponse.json({ data: updated });
}

export async function PUT(req: NextRequest) {
  return PATCH(req);
}
