import { UserRound, Users } from "lucide-react";

interface DemographicPoint {
  ageGroup: string;
  gender: string;
  count: number;
}

interface AudiencePersonaWidgetProps {
  demographics: DemographicPoint[];
}

function buildPersona(demographics: DemographicPoint[]) {
  if (!demographics.length) {
    return {
      headline: "Typical Viewer not available yet",
      detail: "Run a sync to generate demographic insights.",
      confidence: "No demographic data",
    };
  }

  const sorted = [...demographics].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const top = sorted[0];
  const total = sorted.reduce((sum, item) => sum + (item.count ?? 0), 0);
  const share = total > 0 ? ((top.count / total) * 100).toFixed(1) : "0.0";

  return {
    headline: `Most of your audience is ${top.gender}, ${top.ageGroup}.`,
    detail: "Geography was not included in this payload.",
    confidence: `${share}% of sampled viewers`,
  };
}

export function AudiencePersonaWidget({ demographics }: AudiencePersonaWidgetProps) {
  const persona = buildPersona(demographics);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Audience Persona</h3>
        <UserRound className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
        <p className="text-sm font-medium text-zinc-100">{persona.headline}</p>
        <p className="mt-2 text-xs text-zinc-400">{persona.detail}</p>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-500" />
          <span>Persona confidence</span>
        </div>
        <span className="font-semibold text-zinc-100">{persona.confidence}</span>
      </div>
    </section>
  );
}
