import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getSession, getRecentMessages } from "@creator-os/db/queries/chat";

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const chatSession = await getSession(id, session.userId);
  if (!chatSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await getRecentMessages(id, parsed.data.limit);
  return NextResponse.json({ data });
}
