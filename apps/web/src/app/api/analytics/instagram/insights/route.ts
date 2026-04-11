import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getLatestSnapshotByPlatform } from "@creator-os/db/queries/analytics";

interface RawMetricEntry {
  name?: string;
  title?: string;
  description?: string;
  period?: string;
  total_value?: { value?: number | string };
  values?: Array<{ value?: number | string }>;
}

interface ParsedMetricEntry {
  name: string;
  title: string;
  description: string | null;
  period: string | null;
  value: number | null;
}

function parseValue(metric: RawMetricEntry): number | null {
  const total = metric.total_value?.value;
  if (typeof total === "number") return total;
  if (typeof total === "string") {
    const parsed = Number(total);
    if (Number.isFinite(parsed)) return parsed;
  }

  const first = metric.values?.[0]?.value;
  if (typeof first === "number") return first;
  if (typeof first === "string") {
    const parsed = Number(first);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function parseWindow(input: unknown): ParsedMetricEntry[] {
  const rows = ((input as { data?: RawMetricEntry[] } | null)?.data ?? []);
  return rows.map((row) => ({
    name: row.name ?? "unknown_metric",
    title: row.title ?? row.name ?? "Unknown metric",
    description: row.description ?? null,
    period: row.period ?? null,
    value: parseValue(row),
  }));
}

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latest = await getLatestSnapshotByPlatform(session.userId, "instagram");
  if (!latest) {
    return NextResponse.json({
      hasSnapshot: false,
      message: "No Instagram snapshot found yet.",
      windows: { last7d: [], last30d: [] },
    });
  }

  const raw = (latest.rawPayload ?? {}) as {
    last7d?: unknown;
    last30d?: unknown;
  };

  const last7d = parseWindow(raw.last7d);
  const last30d = parseWindow(raw.last30d);

  return NextResponse.json({
    hasSnapshot: true,
    mapped: {
      snapshotDate: latest.snapshotDate,
      views7d: latest.views7d,
      views30d: latest.views30d,
      totalViews: latest.totalViews,
      createdAt: latest.createdAt,
    },
    windows: {
      last7d,
      last30d,
    },
  });
}
