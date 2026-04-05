import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { updateWorkspaceItem, softDeleteWorkspaceItem } from "@creator-os/db/queries/workspace";

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(2000).optional(),
  stage: z.string().optional(),
  sortOrder: z.number().optional(),
  platform: z.string().max(64).nullable().optional(),
  tags: z.array(z.string().max(32)).max(12).nullable().optional(),
  editingStartAt: z.coerce.date().nullable().optional(),
  editingDueAt: z.coerce.date().nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await updateWorkspaceItem(id, session.userId, {
    title: parsed.data.title,
    body: parsed.data.body,
    stage: parsed.data.stage,
    sortOrder: parsed.data.sortOrder,
    platform: parsed.data.platform,
    tags: parsed.data.tags,
    editingStartAt: parsed.data.editingStartAt,
    editingDueAt: parsed.data.editingDueAt,
    scheduledAt: parsed.data.scheduledAt,
    publishedAt: parsed.data.publishedAt,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const deleted = await softDeleteWorkspaceItem(id, session.userId);
  return NextResponse.json({ data: deleted });
}
