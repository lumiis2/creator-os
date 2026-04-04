import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listSessions, createSession } from "@creator-os/db/queries/chat";
import { z } from "zod";

const BodySchema = z.object({
  title: z.string().max(200).optional(),
});

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listSessions(session.userId, 20);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const created = await createSession({
    userId: session.userId,
    title: parsed.data.title ?? null,
  });

  return NextResponse.json({ data: created });
}
