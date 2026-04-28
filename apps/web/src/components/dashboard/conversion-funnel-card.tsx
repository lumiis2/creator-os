import { Eye, MousePointerClick, PlayCircle } from "lucide-react";

interface ConversionFunnelCardProps {
  impressions: number;
  ctr: number;
  totalViews: number;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

export function ConversionFunnelCard({ impressions, ctr, totalViews }: ConversionFunnelCardProps) {
  const stages = [
    {
      label: "Impressions",
      value: impressions.toLocaleString(),
      icon: Eye,
      widthClass: "w-full",
      bg: "from-indigo-500/45 to-indigo-400/25",
    },
    {
      label: "Click-Through Rate",
      value: formatPercent(ctr),
      icon: MousePointerClick,
      widthClass: "w-[82%]",
      bg: "from-violet-500/45 to-violet-400/25",
    },
    {
      label: "Total Views",
      value: totalViews.toLocaleString(),
      icon: PlayCircle,
      widthClass: "w-[64%]",
      bg: "from-fuchsia-500/45 to-fuchsia-400/25",
    },
  ] as const;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
      <h3 className="mb-1 text-base font-semibold text-zinc-100">Conversion Funnel</h3>
      <p className="mb-4 text-xs text-zinc-400">How your YouTube reach turns into views.</p>

      <div className="flex flex-col items-center gap-3">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div key={stage.label} className={`relative ${stage.widthClass}`}>
              <div
                className={`rounded-md border border-white/10 bg-gradient-to-r ${stage.bg} px-4 py-3`}
                style={{ clipPath: "polygon(5% 0, 95% 0, 100% 100%, 0 100%)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide text-zinc-200">{stage.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-100">{stage.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
