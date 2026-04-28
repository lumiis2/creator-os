import { Gauge } from "lucide-react";

interface RetentionMilestoneCardProps {
  averageViewPercentage: number;
  averageViewDuration: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function RetentionMilestoneCard({ averageViewPercentage, averageViewDuration }: RetentionMilestoneCardProps) {
  const percent = clamp(averageViewPercentage, 0, 100);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Retention Milestone</h3>
        <Gauge className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120" role="img" aria-label="Average view percentage">
            <circle cx="60" cy="60" r={radius} stroke="#27272a" strokeWidth="10" fill="none" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#a78bfa"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-semibold text-zinc-100">{percent.toFixed(1)}%</span>
            <span className="text-[10px] uppercase tracking-wide text-zinc-400">Avg View %</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            <div className="text-xs text-zinc-400">Average view duration</div>
            <div className="text-sm font-semibold text-zinc-100">{formatDuration(averageViewDuration)}</div>
          </div>
          <div className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Top 10% of your videos
          </div>
        </div>
      </div>
    </section>
  );
}
