interface InstagramMetricEntry {
  name: string;
  title: string;
  description: string | null;
  period: string | null;
  value: number | null;
}

interface InstagramInsightsGridProps {
  last7d: InstagramMetricEntry[];
  last30d: InstagramMetricEntry[];
}

function MetricCard({ metric, accent }: { metric: InstagramMetricEntry; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{metric.title}</h4>
        <span className={`h-2 w-2 rounded-full ${accent}`} />
      </div>
      <div className="mt-2 text-2xl font-bold">{metric.value?.toLocaleString() ?? "-"}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted">{metric.name}</div>
      {metric.description ? <p className="mt-2 line-clamp-3 text-xs text-muted">{metric.description}</p> : null}
    </div>
  );
}

export function InstagramInsightsGrid({ last7d, last30d }: InstagramInsightsGridProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 p-4">
        <h3 className="text-base font-semibold">Instagram API Metrics</h3>
        <p className="text-sm text-muted">Directly from Graph API payload, split by 7d and 30d windows.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-fuchsia-300">Last 7 days</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {last7d.map((metric) => (
              <MetricCard key={`7d-${metric.name}`} metric={metric} accent="bg-fuchsia-400" />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-indigo-300">Last 30 days</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {last30d.map((metric) => (
              <MetricCard key={`30d-${metric.name}`} metric={metric} accent="bg-indigo-400" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
