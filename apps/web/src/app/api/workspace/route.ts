import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  listWorkspaceItems,
  createWorkspaceItem,
  updateWorkspaceItem,
  softDeleteWorkspaceItem,
} from "@creator-os/db/queries/workspace";

const QuerySchema = z.object({
  stage: z.string().optional(),
});

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  stage: z.string().optional(),
  source: z.string().optional(),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(2000).optional(),
  stage: z.string().optional(),
  sortOrder: z.number().optional(),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
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
  });

  return NextResponse.json({ data: created });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await updateWorkspaceItem(parsed.data.id, session.userId, {
    title: parsed.data.title,
    body: parsed.data.body,
    stage: parsed.data.stage,
    sortOrder: parsed.data.sortOrder,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const deleted = await softDeleteWorkspaceItem(parsed.data.id, session.userId);
  return NextResponse.json({ data: deleted });
}
