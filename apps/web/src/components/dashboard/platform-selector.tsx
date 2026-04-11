"use client";

import type { DashboardPlatform } from "@/hooks/use-analytics";

interface PlatformSelectorProps {
  value: DashboardPlatform;
  onChange: (value: DashboardPlatform) => void;
}

const OPTIONS: Array<{ value: DashboardPlatform; label: string }> = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "combined", label: "Combined" },
];

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-1">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded px-3 py-1 text-sm transition ${active ? "bg-primary font-semibold text-white" : "text-muted hover:text-foreground"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
