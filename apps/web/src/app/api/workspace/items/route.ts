import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { listWorkspaceItems, createWorkspaceItem } from "@creator-os/db/queries/workspace";

const QuerySchema = z.object({
  stage: z.string().optional(),
  search: z.string().optional(),
});

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  stage: z.string().optional(),
  source: z.string().optional(),
  platform: z.string().max(64).optional(),
  tags: z.array(z.string().max(32)).max(12).optional(),
  editingStartAt: z.coerce.date().optional(),
  editingDueAt: z.coerce.date().optional(),
  scheduledAt: z.coerce.date().optional(),
  publishedAt: z.coerce.date().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const data = await listWorkspaceItems(session.userId, parsed.data.stage);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const created = await createWorkspaceItem({
    userId: session.userId,
    title: parsed.data.title,
    body: parsed.data.body ?? null,
    stage: parsed.data.stage ?? "idea",
    source: parsed.data.source ?? "manual",
    platform: parsed.data.platform ?? null,
    tags: parsed.data.tags ?? null,
    editingStartAt: parsed.data.editingStartAt,
    editingDueAt: parsed.data.editingDueAt,
    scheduledAt: parsed.data.scheduledAt,
    publishedAt: parsed.data.publishedAt,
  });

  return NextResponse.json({ data: created });
}
