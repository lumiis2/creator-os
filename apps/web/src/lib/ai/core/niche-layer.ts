export interface NicheLayerInput {
  niche?: string | null;
  subNiche?: string | null;
  contentStyle?: string[] | null;
  audienceDesc?: string | null;
}

export function buildNicheLayer(input: NicheLayerInput): string {
  const style = input.contentStyle?.length ? input.contentStyle.join(", ") : "unknown";

  return [
    "=== Niche Personalization ===",
    `niche: ${input.niche ?? "unknown"}`,
    `sub_niche: ${input.subNiche ?? "unknown"}`,
    `content_style: ${style}`,
    `audience_desc: ${input.audienceDesc ?? "unknown"}`,
    "Adapt examples, hooks, and recommendations to this creator's exact niche context.",
  ].join("\n");
}
