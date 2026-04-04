import type { ChangeEvent } from "react";
import type { Profile } from "@/hooks/use-profile";

interface ProfileFormProps {
  value: Profile;
  onChange: (key: keyof Profile, value: Profile[keyof Profile]) => void;
  onSave: () => void;
  saving: boolean;
}

export function ProfileForm({ value, onChange, onSave, saving }: ProfileFormProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3">
        <label className="text-sm">
          Display name
          <input
            value={value.displayName ?? ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange("displayName", event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Niche
          <input
            value={value.niche ?? ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange("niche", event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Sub-niche
          <input
            value={value.subNiche ?? ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange("subNiche", event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Content style (comma-separated)
          <input
            value={(value.contentStyle ?? []).join(", ")}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange(
                "contentStyle",
                event.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              )
            }
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Audience description
          <textarea
            value={value.audienceDesc ?? ""}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange("audienceDesc", event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Posting goal (per week)
          <input
            type="number"
            min={1}
            max={30}
            value={value.postingGoalFreq ?? 3}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange("postingGoalFreq", Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Agent mode
          <select
            value={value.agentMode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange("agentMode", event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="proactive">Proactive</option>
            <option value="passive">Passive</option>
          </select>
        </label>
        <label className="text-sm">
          Timezone
          <input
            value={value.timezone ?? "UTC"}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange("timezone", event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button onClick={onSave} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
        {saving ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}
